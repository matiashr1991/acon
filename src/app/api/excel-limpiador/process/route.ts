import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/service'
import * as XLSX from 'xlsx'
import { extractCleanDataset } from '@/lib/excel-cleaner-parser'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })

        if (workbook.SheetNames.length === 0) {
            return NextResponse.json({ error: 'El archivo Excel está vacío.' }, { status: 400 })
        }

        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const rawMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null })

        // 1. Extraer dataset limpio (Regla estricta)
        let extractionResult;
        try {
            extractionResult = extractCleanDataset(rawMatrix);
        } catch (err: any) {
            return NextResponse.json({ error: err.message || 'Error de extracción' }, { status: 422 })
        }

        const { rows: cleanRows, metadata } = extractionResult;

        if (cleanRows.length === 0) {
            return NextResponse.json({ error: 'No se encontraron filas de datos válidas después de los encabezados.' }, { status: 422 })
        }

        // 2. Persistir en DB
        const supabase = createAdminClient()

        const { data: job, error: jobErr } = await supabase
            .from('excel_clean_data_jobs')
            .insert({
                filename: file.name,
                file_size: file.size,
                total_raw_rows: metadata.totalRaw,
                valid_clean_rows: cleanRows.length
            })
            .select()
            .single()

        if (jobErr || !job) {
            throw new Error('Error creando trabajo en BD: ' + jobErr?.message)
        }

        // Batch insert records
        const recordsToInsert = cleanRows.map((row, idx) => ({
            job_id: job.id,
            row_number: idx + 1,
            ...row
        }))

        const BATCH_SIZE = 1000
        for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
            const chunk = recordsToInsert.slice(i, i + BATCH_SIZE)
            const { error: insertErr } = await supabase.from('excel_clean_records').upsert(chunk, {
                onConflict: 'periodo_cod,cliente_cod,sucursal,codigo,vendedor'
            })
            if (insertErr) {
                console.error("Error batch insert:", insertErr)
                // Logueamos pero seguimos para no abortar el proceso principal a medias si hay un error puntual
            }
        }

        // Generar Excel Limpio para descarga directa en un solo paso si el cliente lo pide
        // Generamos el Base64 del blob xlsx listo para que el frontend lo ofrezca sin hacer un fetch secundario.
        const exportWorkbook = XLSX.utils.book_new()

        // Mapear objetos a la grilla que el usuario pidio: 16 columnas exactas.
        const outputGrid = cleanRows.map(row => {
            const map: any = {
                'Ramo': row.ramo,
                'Descripción Ramo': row.desc_ramo,
                'Vendedor': row.vendedor,
                'Descripción Vendedor': row.desc_vendedor,
                'Código': row.codigo,
                'Descripción (Producto)': row.desc_producto,
                'Marca': row.marca,
            };

            // Opcional B
            if (row.desc_marca !== undefined) {
                map['Descripción (Marca)'] = row.desc_marca;
            }

            map['Unidad de Negocio'] = row.unidad_negocio;

            // Opcional C
            if (row.desc_unidad_negocio !== undefined) {
                map['Descripción (Unidad de Negocio)'] = row.desc_unidad_negocio;
            }

            map['Precio'] = row.precio;
            map['Bonific'] = row.bonific;
            map['Pr Neto'] = row.pr_neto;
            map['Cantidades Totales'] = row.cant_totales;
            map['Importes Netos'] = row.importes_netos;
            map['Importes Finales'] = row.importes_finales;

            return map;
        });

        const newWorksheet = XLSX.utils.json_to_sheet(outputGrid);
        XLSX.utils.book_append_sheet(exportWorkbook, newWorksheet, 'LIMPIO');

        const base64Excel = XLSX.write(exportWorkbook, { type: 'base64', bookType: 'xlsx' });

        return NextResponse.json({
            success: true,
            job_id: job.id,
            total_extracted: cleanRows.length,
            // Pre-armado payload file para descarga:
            file_base64: base64Excel,
            file_name: `limpio_${file.name.replace('.xlsx', '')}.xlsx`
        })

    } catch (error: any) {
        console.error('Clean Import Error:', error)
        return NextResponse.json({ error: error.message || 'Server error interno' }, { status: 500 })
    }
}

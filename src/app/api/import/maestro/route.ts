import { NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/service'
import ExcelJS from 'exceljs'

export async function POST(request: Request) {
    const supabase = createAdminClient()

    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        const proveedor_id = formData.get('proveedor_id') as string

        if (!file || !proveedor_id) {
            return NextResponse.json({ error: 'file y proveedor_id son requeridos' }, { status: 400 })
        }

        // Crear el import job
        const { data: job, error: jobErr } = await supabase
            .from('import_jobs')
            .insert([{
                proveedor_id,
                filename: file.name,
                status: 'processing'
            }])
            .select()
            .single()

        if (jobErr || !job) {
            return NextResponse.json({ error: 'No se pudo crear el Import Job' }, { status: 500 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(buffer as any)

        // Asumimos que es la primera hoja o buscamos una específica si se indicara.
        const worksheet = workbook.worksheets[0]

        if (!worksheet) {
            return NextResponse.json({ error: 'El archivo Excel no tiene hojas' }, { status: 400 })
        }

        let rowCount = 0
        let okCount = 0
        let errorCount = 0

        const errorsToInsert: any[] = []
        const mapPrecios = new Map()
        const mapProductos = new Map()

        const getCellValue = (cell: any) => {
            if (!cell || cell.value === null || cell.value === undefined) return null;
            if (typeof cell.value === 'object') {
                if ('result' in cell.value) return cell.value.result;
                if ('richText' in cell.value) return cell.value.richText.map((rt: any) => rt.text).join('');
                if ('text' in cell.value) return cell.value.text;
                if (cell.value instanceof Date) return cell.value.toISOString();
                if (typeof cell.text === 'string' && cell.text.trim().length > 0) return cell.text;
                return null; // Nunca devolver un objeto genérico para evitar "[object Object]"
            }
            return cell.value;
        }

        const normalizeHdr = (s: any) => {
            if (!s) return ''
            return s.toString()
                .toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
                .replace(/[^a-z0-9%]/g, '') // keep only alphanumeric and %
        }

        let headerRowIndex = -1
        let colIndex = { sku: -1, desc: -1, barcode: -1, cc: -1, cr: -1 }

        worksheet.eachRow((row, rowNumber) => {
            if (headerRowIndex === -1) {
                let foundSku = -1, foundCc = -1, foundCr = -1, foundDesc = -1, foundBarcode = -1;

                row.eachCell((cell, colNumber) => {
                    const val = normalizeHdr(getCellValue(cell))
                    if (!val) return;

                    if (foundSku === -1 && ['codart', 'codigodearticulo', 'articulo', 'sku'].includes(val)) foundSku = colNumber
                    else if (foundCc === -1 && ['preciodecompra', 'preciocompra', 'costo', 'costocompra', 'costofinal'].includes(val)) foundCc = colNumber
                    else if (foundCr === -1 && ['%finaltotal', 'finaltotal%', 'boniftotal', 'bonificaciontotal'].includes(val)) foundCr = colNumber
                    else if (foundDesc === -1 && val.includes('descripc')) foundDesc = colNumber
                    else if (foundBarcode === -1 && ['codbarras', 'ean', 'barcode', 'codigodebarras'].includes(val)) foundBarcode = colNumber
                })

                if (foundSku !== -1 && foundCc !== -1 && foundCr !== -1) {
                    headerRowIndex = rowNumber
                    colIndex = { sku: foundSku, desc: foundDesc, barcode: foundBarcode, cc: foundCc, cr: foundCr }
                }
                return;
            }

            rowCount++;

            try {
                const skuCellValue = colIndex.sku !== -1 ? getCellValue(row.getCell(colIndex.sku)) : null
                const descCellValue = colIndex.desc !== -1 ? getCellValue(row.getCell(colIndex.desc)) : null
                const barcodeCellValue = colIndex.barcode !== -1 ? getCellValue(row.getCell(colIndex.barcode)) : null
                const ccCellValue = colIndex.cc !== -1 ? getCellValue(row.getCell(colIndex.cc)) : null
                const crCellValue = colIndex.cr !== -1 ? getCellValue(row.getCell(colIndex.cr)) : null

                const sku = skuCellValue?.toString().trim()
                const descripcion = descCellValue?.toString().trim()

                // Normalizar barcode: 0, "0", "0.0", variantes vacías → null
                let rawBarcode = barcodeCellValue?.toString().trim() || null
                let barcode: string | null = null
                if (rawBarcode) {
                    const lower = rawBarcode.toLowerCase()
                    const isNoBarcode = ['no tiene', 'no lleva', 'sin barras', 'no posee', 's/n', 'n/a', '-', '0', '0.0']
                        .includes(lower)
                    const isAllZeros = /^0+$/.test(rawBarcode) // "0000.." también es sin barcode
                    barcode = (isNoBarcode || isAllZeros) ? null : rawBarcode
                }

                if (!sku) throw new Error('SKU vacío')
                // if desc is empty we could provide a fallback or fail. Spec says recommended, but we can fail if we want to be strict.
                // Spec says "Campos recomendados (si existen): DESCRIPCION". So we shouldn't throw error if empty, just save what we have or null.

                let precio_compra = Number(ccCellValue)
                if (isNaN(precio_compra) || precio_compra <= 0) {
                    throw new Error(`Precio de compra inválido o cero: ${ccCellValue} (el SKU ${skuCellValue} no tiene precio asignado)`)
                }

                let bonif_total_decimal = crCellValue === null || crCellValue === '' ? 0 : Number(crCellValue)
                if (isNaN(bonif_total_decimal)) {
                    bonif_total_decimal = 0
                }

                if (bonif_total_decimal < 0) {
                    throw new Error(`Bonificación negativa no permitida: ${bonif_total_decimal}`)
                }
                if (bonif_total_decimal > 1) {
                    throw new Error(`Bonificación fuera de rango 0..1: ${bonif_total_decimal}`)
                }

                const bonif_total_pct = bonif_total_decimal * 100
                const neto_bonificado = precio_compra * (1 - bonif_total_decimal)

                if (mapPrecios.has(sku)) {
                    errorsToInsert.push({
                        job_id: job.id,
                        row_number: rowNumber,
                        sku: sku,
                        error_code: 'WARNING_DUPLICATE',
                        message: `SKU duplicado detectado. Se conservará el último valor leído.`
                    })
                }

                mapProductos.set(sku, {
                    sku,
                    // If no desc, use SKU as fallback
                    descripcion: descripcion || sku,
                    barcode
                })

                mapPrecios.set(sku, {
                    proveedor_id,
                    sku,
                    precio_compra,
                    bonif_total_decimal,
                    bonif_total_pct,
                    neto_bonificado,
                    vig_desde: new Date().toISOString(),
                    vigente: false,
                    origen: 'import',
                    import_job_id: job.id,
                    estado: 'draft'
                })

                okCount++;
            } catch (err: any) {
                errorCount++;
                errorsToInsert.push({
                    job_id: job.id,
                    row_number: rowNumber,
                    sku: colIndex.sku !== -1 ? getCellValue(row.getCell(colIndex.sku))?.toString() : undefined,
                    error_code: 'PARSE_ERROR',
                    message: err.message
                })
            }
        })

        if (headerRowIndex === -1) {
            await supabase.from('import_jobs').update({ status: 'failed', notes: 'No se encontraron las columnas requeridas (SKU, PRECIO COMPRA, % FINAL TOTAL).' }).eq('id', job.id)
            return NextResponse.json({ error: 'No se encontraron las columnas requeridas (SKU, PRECIO COMPRA, % FINAL TOTAL) en ninguna fila.' }, { status: 400 })
        }

        // Guardar en DB en bloques/batch para no exceder limites. 
        // Como es MVP lo hacemos directo (Supabase soporta bastantes rows por insert).

        // 1. Upsert productos
        if (mapProductos.size > 0) {
            const arrProd = Array.from(mapProductos.values())
            // Chunking if > 1000 could be needed, assuming < 10000 works fine in Supabase
            const { error: errP } = await supabase.from('productos').upsert(arrProd, { onConflict: 'sku' })
            if (errP) console.error('Error upsert productos', errP)

            // 2. Upsert proveedor_productos
            const arrProvProd = arrProd.map(p => ({
                proveedor_id,
                sku: p.sku,
                activo: true
            }))
            const { error: errPP } = await supabase.from('proveedor_productos').upsert(arrProvProd, { onConflict: 'proveedor_id,sku' })
            if (errPP) console.error('Error upsert proveedor_productos', errPP)

            // 3. Insert precios_compra (drafts)
            const arrPrecios = Array.from(mapPrecios.values())
            const { error: errPrecios } = await supabase.from('precios_compra').insert(arrPrecios)
            if (errPrecios) {
                console.error('Error insert precios_compra', errPrecios)
                // Considerar fallido si no insertan los precios
                await supabase.from('import_jobs').update({ status: 'failed', finished_at: new Date().toISOString() }).eq('id', job.id)
                return NextResponse.json({ error: 'Error al insertar precios: ' + errPrecios.message }, { status: 500 })
            }
        }

        // Insertar errores si hubo
        if (errorsToInsert.length > 0) {
            await supabase.from('import_job_errors').insert(errorsToInsert)
        }

        // Actualizar Job a completado
        await supabase.from('import_jobs').update({
            row_count: rowCount,
            ok_count: okCount,
            error_count: errorCount,
            status: 'completed',
            finished_at: new Date().toISOString()
        }).eq('id', job.id)

        return NextResponse.json({
            message: 'Importación procesada',
            job_id: job.id,
            resumen: { rowCount, okCount, errorCount }
        })

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

import { NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/service'
import ExcelJS from 'exceljs'
import { format } from 'date-fns'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const proveedor_id = searchParams.get('proveedor_id')
    const mode = searchParams.get('mode') || 'vigentes' // 'vigentes' o 'candidate'
    const job_id = searchParams.get('job_id')
    const vig_hasta_param = searchParams.get('vig_hasta') || ''

    if (!proveedor_id) {
        return NextResponse.json({ error: 'proveedor_id es requerido' }, { status: 400 })
    }

    const supabase = createAdminClient()

    try {
        // 1. Obtener info del proveedor
        const { data: prov, error: provErr } = await supabase
            .from('proveedores')
            .select('codigo, razon_social, campos_plantilla')
            .eq('id', proveedor_id)
            .single()

        if (provErr || !prov) {
            return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })
        }

        // 2. Obtener precios
        let query = supabase
            .from('precios_compra')
            .select('*, productos(descripcion, barcode), vig_desde')
            .eq('proveedor_id', proveedor_id)

        if (mode === 'candidate' && job_id) {
            query = query.eq('import_job_id', job_id).eq('estado', 'draft')
        } else {
            query = query.eq('vigente', true)
        }

        const { data: precios, error: dbErr } = await query

        if (dbErr) {
            return NextResponse.json({ error: dbErr.message }, { status: 500 })
        }

        if (!precios || precios.length === 0) {
            return NextResponse.json({ error: 'No hay precios para exportar.' }, { status: 400 })
        }

        // VALIDACIÓN 1: Datos fundamentales (SKU y Precio validos)
        const invalidData = precios.filter(p => !p.sku || p.precio_compra === null || p.precio_compra <= 0)
        if (invalidData.length > 0) {
            return NextResponse.json({
                error: `Existen ${invalidData.length} productos con datos fundamentales faltantes o inválidos (SKU o precio nulo/negativo). Por favor revisa el catálogo antes de exportar.`
            }, { status: 400 })
        }

        // VALIDACIÓN 2: Que otro proveedor no tenga el mismo SKU
        const skus = precios.map(p => p.sku)
        const { data: duplicates, error: dupErr } = await supabase
            .from('proveedor_productos')
            .select('sku, proveedor_id, proveedores(razon_social)')
            .in('sku', skus)
            .neq('proveedor_id', proveedor_id)
            .eq('activo', true)

        if (dupErr) {
            return NextResponse.json({ error: 'Error al verificar integridad de SKUs: ' + dupErr.message }, { status: 500 })
        }

        if (duplicates && duplicates.length > 0) {
            const dupMessages = duplicates.slice(0, 5).map(d => `${d.sku} (Proveedor: ${(d.proveedores as any)?.razon_social || d.proveedor_id})`).join(', ')
            const suffix = duplicates.length > 5 ? ` y ${duplicates.length - 5} más.` : '.'
            return NextResponse.json({
                error: `Exportación bloqueada. Los siguientes SKUs ya están asignados a otro proveedor: ${dupMessages}${suffix} Para evitar modificaciones accidentales en otros catálogos, debes usar SKUs únicos por proveedor.`
            }, { status: 400 })
        }

        // 3. Generar Excel Exacto
        const workbook = new ExcelJS.Workbook()

        // ==========================================
        // HOJA 1: Precios de Compra
        // ==========================================
        const wsPrecios = workbook.addWorksheet('Precios de Compra')

        // Ajustes de ancho de columnas
        wsPrecios.columns = [
            { width: 17 }, // A: Código Proveedor
            { width: 30 }, // B: Razón Social
            { width: 15 }, // C: Artículo
            { width: 45 }, // D: Descripción Artículo
            { width: 22 }, // E: Código de barras
            { width: 16 }, // F: Precio Unitario
            { width: 12 }, // G: Bonific.
            { width: 22 }, // H: Precio Neto Bonificado
            { width: 16 }, // I: Internos Fijos
            { width: 12 }, // J: Internos %
            { width: 24 }, // K: Precio Neto + I. Internos
            { width: 22 }, // L: Cod. Art. Proveedor
            { width: 32 }, // M: Cod. Art. Proveedor Secundario
            { width: 12 }, // N: Margen
            { width: 12 }  // O: Anulado
        ]

        // Fila 1: Título 
        const titleRow = wsPrecios.addRow(['CAMPOS OBLIGATORIOS Y FIJOS', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
        wsPrecios.mergeCells('A1:O1')
        const titleCell = wsPrecios.getCell('A1')
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } } // Dark Blue
        titleCell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' }

        // Fila 2: Encabezados
        const headers = [
            'Código Proveedor', 'Razón Social', 'Artículo', 'Descripción Artículo', 'Código de barras',
            'Precio Unitario', 'Bonific.', 'Precio Neto Bonificado', 'Internos Fijos', 'Internos %',
            'Precio Neto + I. Internos', 'Cod. Art. Proveedor', 'Cod. Art. Proveedor Secundario', 'Margen', 'Anulado'
        ]
        const headerRow = wsPrecios.addRow(headers)

        // Estilos para la Fila 2
        headerRow.eachCell((cell, colNumber) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } } // Light blue
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            }

            // Colores por columna:
            // Rojo: A(1), C(3), F(6)
            // Verde: B(2), D(4), E(5), H(8), K(11), O(15)
            // Blanco: G(7), I(9), J(10), L(12), M(13), N(14)
            const redCols = [1, 3, 6]
            const greenCols = [2, 4, 5, 8, 11, 15]
            const whiteCols = [7, 9, 10, 12, 13, 14]

            if (redCols.includes(colNumber)) {
                cell.font = { color: { argb: 'FFFF0000' }, bold: true }
            } else if (greenCols.includes(colNumber)) {
                cell.font = { color: { argb: 'FF00B050' }, bold: true }
            } else if (whiteCols.includes(colNumber)) {
                cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
            }
        })

        // Fila 3: Tipos de datos
        const dataTypesRow = wsPrecios.addRow([
            'ENTERO',    // A: Código Proveedor
            'CARACTER',  // B: Razón Social
            'CARACTER',  // C: Artículo
            'CARACTER',  // D: Descripción Artículo
            'CARACTER',  // E: Código de barras
            'DECIMAL',   // F: Precio Unitario
            'DECIMAL',   // G: Bonific.
            'DECIMAL',   // H: Precio Neto Bonificado
            'DECIMAL',   // I: Internos Fijos
            'DECIMAL',   // J: Internos %
            'DECIMAL',   // K: Precio Neto + I. Internos
            'CARACTER',  // L: Cod. Art. Proveedor
            'CARACTER',  // M: Cod. Art. Proveedor Secundario
            'DECIMAL',   // N: Margen
            'LOGICO'     // O: Anulado
        ])
        dataTypesRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFBFBF' } } // Gris claro
            cell.font = { bold: false, italic: true }
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            }
        })

        // Fila 4+: Datos
        let currentRow = 4
        precios.forEach(p => {
            const row = wsPrecios.getRow(currentRow)

            const productosWrap = p.productos
            let desc = ''
            let barcode = ''

            if (Array.isArray(productosWrap)) {
                desc = productosWrap[0]?.descripcion || ''
                barcode = productosWrap[0]?.barcode || ''
            } else if (productosWrap && typeof productosWrap === 'object') {
                // @ts-ignore
                desc = productosWrap.descripcion || ''
                // @ts-ignore
                barcode = productosWrap.barcode || ''
            } else if (typeof productosWrap === 'string') {
                desc = productosWrap
            }

            const round3 = (v: number) => Math.round(v * 1000) / 1000

            row.getCell(1).value = Number(prov.codigo) // ENTERO
            row.getCell(2).value = prov.razon_social // CARÁCTER
            row.getCell(3).value = p.sku // CARÁCTER
            row.getCell(4).value = desc // CARÁCTER
            row.getCell(5).value = barcode // CARÁCTER

            row.getCell(6).value = round3(Number(p.precio_compra)) // DECIMAL
            row.getCell(7).value = round3(Number(p.bonif_total_pct)) // DECIMAL
            row.getCell(8).value = round3(Number(p.neto_bonificado)) // DECIMAL
            row.getCell(9).value = 0 // DECIMAL (Internos Fijos)
            row.getCell(10).value = 0 // DECIMAL (Internos %)
            row.getCell(11).value = round3(Number(p.neto_bonificado)) // DECIMAL (Precio Neto + I. Internos)
            row.getCell(12).value = '' // CARÁCTER
            row.getCell(13).value = '' // CARÁCTER
            row.getCell(14).value = 0 // DECIMAL
            row.getCell(15).value = 'NO' // LÓGICO

            row.commit()
            currentRow++
        })

        // ==========================================
        // HOJA 2: Proveedores
        // ==========================================
        const wsProv = workbook.addWorksheet('Proveedores')

        // Fila 1: Título
        wsProv.addRow(['Proveedores de Mercadería'])

        // Fila 2: Encabezados
        wsProv.addRow(['Código', 'Descripción'])

        // Fila 3: Datos
        wsProv.addRow([Number(prov.codigo), prov.razon_social])

        // ==========================================
        // RESPUESTA Y NOMBRE DE ARCHIVO
        // ==========================================
        const buffer = await workbook.xlsx.writeBuffer()

        const now = new Date()
        const timestamp = format(now, 'yyyyMMddHHmmss')

        // Prioridad para FECVIG:
        // 1. fecha_lista configurada en el proveedor (campos_plantilla.fecha_lista)
        // 2. vig_desde del primer precio vigente
        // 3. fecha actual
        const fechaListaConfig = (prov as any).campos_plantilla?.fecha_lista
        let fec_vig: string
        if (fechaListaConfig) {
            // viene como YYYY-MM-DD desde el date input
            fec_vig = fechaListaConfig.replace(/-/g, '')
        } else {
            const vigDesdeFechas = precios
                .map((p: any) => p.vig_desde)
                .filter(Boolean)
                .sort()
                .reverse()
            const vigDesdeRaw = vigDesdeFechas[0] || now.toISOString()
            fec_vig = format(new Date(vigDesdeRaw), 'yyyyMMdd')
        }

        const fileName = `${timestamp}_PRV-${prov.codigo}_FECVIG-${fec_vig}_plantillaPreciosCompra.xlsx`

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${fileName}"`
            }
        })

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

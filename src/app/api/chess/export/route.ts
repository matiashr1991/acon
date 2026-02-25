import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/service'
import * as XLSX from 'xlsx'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')

    if (!desde || !hasta) return NextResponse.json({ error: 'desde y hasta requeridos' }, { status: 400 })

    const supabase = createAdminClient()

    // 1) Cabeceras del período
    const { data: headers } = await supabase
        .from('chess_sales_headers')
        .select('*')
        .gte('fecha_comprobante', desde)
        .lte('fecha_comprobante', hasta)
        .order('fecha_comprobante', { ascending: false })

    const hdrs = headers || []

    // 2) Indexar cabeceras por llave natural
    const hdrMap = new Map<string, any>()
    for (const h of hdrs) {
        const k = `${h.id_empresa}|${h.id_documento}|${h.letra}|${h.serie}|${h.nrodoc}`
        hdrMap.set(k, h)
    }

    // 2) Líneas — paginado para superar el límite de rows de PostgREST
    const PAGE = 1000
    const allLines: any[] = []
    let offset = 0
    while (true) {
        const { data: chunk } = await supabase
            .from('chess_sales_lines')
            .select('*')
            .range(offset, offset + PAGE - 1)
        if (!chunk || chunk.length === 0) break
        allLines.push(...chunk)
        if (chunk.length < PAGE) break
        offset += chunk.length  // avanzar exactamente lo que Supabase devolvió
    }

    const lns = allLines.filter(l => {
        const k = `${l.id_empresa}|${l.id_documento}|${l.letra}|${l.serie}|${l.nrodoc}`
        return hdrMap.has(k)
    })

    // 4) JOINear: una fila por línea, con datos del comprobante repetidos
    const compNombre = (h: any) =>
        `${h.letra || ''}-${String(h.serie || '').padStart(4, '0')}-${String(h.nrodoc || '').padStart(8, '0')}`

    const rows: any[] = []

    for (const l of lns) {
        const k = `${l.id_empresa}|${l.id_documento}|${l.letra}|${l.serie}|${l.nrodoc}`
        const h = hdrMap.get(k) || {}

        rows.push({
            // Comprobante
            'Fecha': h.fecha_comprobante,
            'Comprobante': compNombre(h),
            'Anulado': h.anulado || 'NO',
            'Tipo de Pago': h.ds_tipo_pago,
            // Cliente
            'ID Cliente': h.id_cliente,
            'Cliente': h.nombre_cliente,
            'Localidad': h.ds_localidad,
            'Provincia': h.ds_provincia,
            // Vendedor
            'ID Vendedor': h.id_vendedor,
            'Vendedor': h.ds_vendedor,
            // Artículo (SKU)
            'SKU (Cód. Artículo)': l.id_articulo,
            'Descripción': l.ds_articulo,
            'Proveedor': l.proveedor,
            // Cantidades
            'Cantidad': l.cantidades_total,
            // Precios
            'P. Unit. Bruto': l.precio_unitario_bruto,
            'Bonificación %': l.bonificacion,
            'P. Unit. Neto': l.precio_unitario_neto,
            // Subtotales línea
            'Subtotal Neto': l.subtotal_neto,
            'Subtotal Final': l.subtotal_final,
            // Subtotales comprobante (para referencia)
            'Total Comprobante Neto': h.subtotal_neto,
            'Total Comprobante Final': h.subtotal_final,
            // Costo (cuando viene del ERP)
            'P. Compra Bruto': l.precio_compra_bruto,
            'P. Compra Neto': l.precio_compra_neto,
        })
    }

    // 5) Comprobantes SIN líneas sincronizadas (incluir igual)
    const compsConLinea = new Set(lns.map(l => `${l.id_empresa}|${l.id_documento}|${l.letra}|${l.serie}|${l.nrodoc}`))
    for (const h of hdrs) {
        const k = `${h.id_empresa}|${h.id_documento}|${h.letra}|${h.serie}|${h.nrodoc}`
        if (!compsConLinea.has(k)) {
            rows.push({
                'Fecha': h.fecha_comprobante,
                'Comprobante': compNombre(h),
                'Anulado': h.anulado || 'NO',
                'Tipo de Pago': h.ds_tipo_pago,
                'ID Cliente': h.id_cliente,
                'Cliente': h.nombre_cliente,
                'Localidad': h.ds_localidad,
                'Provincia': h.ds_provincia,
                'ID Vendedor': h.id_vendedor,
                'Vendedor': h.ds_vendedor,
                'SKU (Cód. Artículo)': null,
                'Descripción': null,
                'Proveedor': null,
                'Cantidad': null,
                'P. Unit. Bruto': null,
                'Bonificación %': null,
                'P. Unit. Neto': null,
                'Subtotal Neto': null,
                'Subtotal Final': null,
                'Total Comprobante Neto': h.subtotal_neto,
                'Total Comprobante Final': h.subtotal_final,
                'P. Compra Bruto': null,
                'P. Compra Neto': null,
            })
        }
    }

    // Ordenar por fecha desc
    rows.sort((a, b) => (a['Fecha'] < b['Fecha'] ? 1 : -1))

    // 6) Generar Excel
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)

    // Ancho de columnas automático aproximado
    const colWidths = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length, 12) }))
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, 'Ventas')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `ventas_${desde}_${hasta}.xlsx`

    return new NextResponse(buf, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    })
}

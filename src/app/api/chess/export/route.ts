import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/service'
import * as XLSX from 'xlsx'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')

    if (!desde || !hasta) return NextResponse.json({ error: 'desde y hasta requeridos' }, { status: 400 })

    const supabase = createAdminClient()

    // ── 1) Cabeceras (todos los comprobantes del período) ─────────────────────
    const { data: headers } = await supabase
        .from('chess_sales_headers')
        .select('*')
        .gte('fecha_comprobante', desde)
        .lte('fecha_comprobante', hasta)
        .order('fecha_comprobante', { ascending: false })

    const hdrs = headers || []

    // ── 2) Líneas (artículos) ─────────────────────────────────────────────────
    const { data: lines } = await supabase
        .from('chess_sales_lines')
        .select('*')

    const lns = lines || []

    // ── 3) Resumen por tipo de pago ───────────────────────────────────────────
    const byTipoPago: Record<string, { tipo_pago: string; comprobantes: number; total_neto: number; total_final: number }> = {}
    for (const h of hdrs.filter(h => h.anulado === 'NO' || !h.anulado)) {
        const k = h.ds_tipo_pago || 'Sin dato'
        if (!byTipoPago[k]) byTipoPago[k] = { tipo_pago: k, comprobantes: 0, total_neto: 0, total_final: 0 }
        byTipoPago[k].comprobantes++
        byTipoPago[k].total_neto += Number(h.subtotal_neto || 0)
        byTipoPago[k].total_final += Number(h.subtotal_final || 0)
    }

    // ── 4) Resumen por vendedor ───────────────────────────────────────────────
    const byVendedor: Record<string, { vendedor: string; comprobantes: number; total_neto: number; total_final: number }> = {}
    for (const h of hdrs.filter(h => h.anulado === 'NO' || !h.anulado)) {
        const k = h.ds_vendedor || 'Sin vendedor'
        if (!byVendedor[k]) byVendedor[k] = { vendedor: k, comprobantes: 0, total_neto: 0, total_final: 0 }
        byVendedor[k].comprobantes++
        byVendedor[k].total_neto += Number(h.subtotal_neto || 0)
        byVendedor[k].total_final += Number(h.subtotal_final || 0)
    }

    // ── 5) Resumen por cliente ────────────────────────────────────────────────
    const byCliente: Record<string, { cliente: string; comprobantes: number; total_neto: number; total_final: number }> = {}
    for (const h of hdrs.filter(h => h.anulado === 'NO' || !h.anulado)) {
        const k = h.nombre_cliente || 'Sin nombre'
        if (!byCliente[k]) byCliente[k] = { cliente: k, comprobantes: 0, total_neto: 0, total_final: 0 }
        byCliente[k].comprobantes++
        byCliente[k].total_neto += Number(h.subtotal_neto || 0)
        byCliente[k].total_final += Number(h.subtotal_final || 0)
    }

    // ── 6) Top artículos ─────────────────────────────────────────────────────
    const byArticulo: Record<string, { articulo: string; qty_total: number; total_neto: number; total_final: number }> = {}
    for (const l of lns) {
        if (!l.id_articulo) continue
        const k = String(l.id_articulo)
        if (!byArticulo[k]) byArticulo[k] = { articulo: l.ds_articulo || `Art. ${k}`, qty_total: 0, total_neto: 0, total_final: 0 }
        byArticulo[k].qty_total += Math.abs(Number(l.cantidades_total || 0))
        byArticulo[k].total_neto += Number(l.subtotal_neto || 0)
        byArticulo[k].total_final += Number(l.subtotal_final || 0)
    }

    // ── Armar workbook ────────────────────────────────────────────────────────
    const wb = XLSX.utils.book_new()

    // Hoja 1: COMPROBANTES
    const comprobantesRows = hdrs.map(h => ({
        'Fecha': h.fecha_comprobante,
        'Comprobante': `${h.letra || ''}-${String(h.serie || '').padStart(4, '0')}-${String(h.nrodoc || '').padStart(8, '0')}`,
        'Anulado': h.anulado || 'NO',
        'ID Cliente': h.id_cliente,
        'Cliente': h.nombre_cliente,
        'Localidad': h.ds_localidad,
        'Provincia': h.ds_provincia,
        'ID Vendedor': h.id_vendedor,
        'Vendedor': h.ds_vendedor,
        'Tipo Pago': h.ds_tipo_pago,
        'Subtotal Neto': h.subtotal_neto,
        'Subtotal Final': h.subtotal_final,
        'Fecha Alta': h.fecha_alta,
        'Fecha Pago': h.fecha_pago,
        'Fecha Entrega': h.fecha_entrega,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(comprobantesRows), 'Comprobantes')

    // Hoja 2: LINEAS DE ARTICULOS
    const lineasRows = lns.map(l => ({
        'Comprobante': `${l.letra || ''}-${String(l.serie || '').padStart(4, '0')}-${String(l.nrodoc || '').padStart(8, '0')}`,
        'ID Artículo': l.id_articulo,
        'Artículo': l.ds_articulo,
        'Cantidad': l.cantidades_total,
        'P. Unitario Bruto': l.precio_unitario_bruto,
        'Bonificación %': l.bonificacion,
        'P. Unitario Neto': l.precio_unitario_neto,
        'Subtotal Neto': l.subtotal_neto,
        'Subtotal Final': l.subtotal_final,
        'Proveedor': l.proveedor,
        'P. Compra Bruto': l.precio_compra_bruto,
        'P. Compra Neto': l.precio_compra_neto,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lineasRows), 'Líneas Artículos')

    // Hoja 3: POR TIPO DE PAGO
    const tipoPagoRows = Object.values(byTipoPago)
        .sort((a, b) => b.total_final - a.total_final)
        .map(r => ({
            'Tipo de Pago': r.tipo_pago,
            'Comprobantes': r.comprobantes,
            'Total Neto': Math.round(r.total_neto * 100) / 100,
            'Total Final': Math.round(r.total_final * 100) / 100,
        }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tipoPagoRows), 'Por Tipo de Pago')

    // Hoja 4: POR VENDEDOR
    const vendedorRows = Object.values(byVendedor)
        .sort((a, b) => b.total_final - a.total_final)
        .map(r => ({
            'Vendedor': r.vendedor,
            'Comprobantes': r.comprobantes,
            'Total Neto': Math.round(r.total_neto * 100) / 100,
            'Total Final': Math.round(r.total_final * 100) / 100,
        }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vendedorRows), 'Por Vendedor')

    // Hoja 5: POR CLIENTE
    const clienteRows = Object.values(byCliente)
        .sort((a, b) => b.total_final - a.total_final)
        .map(r => ({
            'Cliente': r.cliente,
            'Comprobantes': r.comprobantes,
            'Total Neto': Math.round(r.total_neto * 100) / 100,
            'Total Final': Math.round(r.total_final * 100) / 100,
        }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clienteRows), 'Por Cliente')

    // Hoja 6: TOP ARTICULOS
    const articuloRows = Object.values(byArticulo)
        .sort((a, b) => b.total_final - a.total_final)
        .slice(0, 200)
        .map(r => ({
            'Artículo': r.articulo,
            'Cantidad Total': Math.round(r.qty_total * 100) / 100,
            'Total Neto': Math.round(r.total_neto * 100) / 100,
            'Total Final': Math.round(r.total_final * 100) / 100,
        }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(articuloRows), 'Top Artículos')

    // ── Generar buffer y responder ────────────────────────────────────────────
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

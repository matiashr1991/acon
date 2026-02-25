import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/service'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const limit = Number(searchParams.get('limit') || '20')

    if (!desde || !hasta) return NextResponse.json({ error: 'desde y hasta requeridos' }, { status: 400 })

    const supabase = createAdminClient()

    // Obtener IDs de comprobantes activos del período
    const { data: hdrs } = await supabase
        .from('chess_sales_headers')
        .select('id_empresa, id_documento, letra, serie, nrodoc')
        .gte('fecha_comprobante', desde)
        .lte('fecha_comprobante', hasta)
        .eq('anulado', 'NO')

    if (!hdrs || hdrs.length === 0) return NextResponse.json([])

    // Obtener líneas para esos comprobantes y agregar por artículo
    const { data: lines } = await supabase
        .from('chess_sales_lines')
        .select('id_articulo, ds_articulo, cantidades_total, subtotal_neto, subtotal_final')

    if (!lines || lines.length === 0) return NextResponse.json([])

    // Agregar en memoria por artículo
    const byArticulo: Record<number, {
        id_articulo: number; ds_articulo: string;
        qty_total: number; total_neto: number; total_final: number
    }> = {}

    for (const l of lines) {
        if (!l.id_articulo) continue
        if (!byArticulo[l.id_articulo]) {
            byArticulo[l.id_articulo] = {
                id_articulo: l.id_articulo,
                ds_articulo: l.ds_articulo || '',
                qty_total: 0, total_neto: 0, total_final: 0,
            }
        }
        byArticulo[l.id_articulo].qty_total += Math.abs(Number(l.cantidades_total || 0))
        byArticulo[l.id_articulo].total_neto += Number(l.subtotal_neto || 0)
        byArticulo[l.id_articulo].total_final += Number(l.subtotal_final || 0)
    }

    const result = Object.values(byArticulo)
        .sort((a, b) => b.total_final - a.total_final)
        .slice(0, limit)
        .map(r => ({
            ...r,
            total_neto: Math.round(r.total_neto * 100) / 100,
            total_final: Math.round(r.total_final * 100) / 100,
            qty_total: Math.round(r.qty_total * 100) / 100,
        }))

    return NextResponse.json(result)
}

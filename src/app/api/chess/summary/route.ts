import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/service'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')

    if (!desde || !hasta) return NextResponse.json({ error: 'desde y hasta requeridos' }, { status: 400 })

    const supabase = createAdminClient()

    // Totales generales
    const { data: headers } = await supabase
        .from('chess_sales_headers')
        .select('anulado, subtotal_neto, subtotal_final, ds_tipo_pago, ds_vendedor, id_vendedor')
        .gte('fecha_comprobante', desde)
        .lte('fecha_comprobante', hasta)

    const rows = headers || []
    const activos = rows.filter(r => r.anulado === 'NO' || r.anulado === null || r.anulado === false)
    const anulados = rows.filter(r => r.anulado !== 'NO' && r.anulado !== null && r.anulado !== false)

    const total_neto = activos.reduce((s, r) => s + Number(r.subtotal_neto || 0), 0)
    const total_final = activos.reduce((s, r) => s + Number(r.subtotal_final || 0), 0)

    // Corte por tipo de pago
    const byTipoPago: Record<string, { comprobantes: number; total: number }> = {}
    for (const r of activos) {
        const k = r.ds_tipo_pago || 'Sin dato'
        if (!byTipoPago[k]) byTipoPago[k] = { comprobantes: 0, total: 0 }
        byTipoPago[k].comprobantes++
        byTipoPago[k].total += Number(r.subtotal_final || 0)
    }

    // Corte por vendedor (top 10)
    const byVendedor: Record<string, { label: string; comprobantes: number; total: number }> = {}
    for (const r of activos) {
        const k = String(r.id_vendedor || 'S/D')
        if (!byVendedor[k]) byVendedor[k] = { label: r.ds_vendedor || 'Sin vendedor', comprobantes: 0, total: 0 }
        byVendedor[k].comprobantes++
        byVendedor[k].total += Number(r.subtotal_final || 0)
    }

    // Último sync run para este rango o reciente
    const { data: lastRun } = await supabase
        .from('chess_sync_runs')
        .select('id, started_at, finished_at, status, fecha_desde, fecha_hasta')
        .eq('status', 'ok')
        .order('finished_at', { ascending: false })
        .limit(1)
        .single()

    return NextResponse.json({
        totals: {
            comprobantes: activos.length,
            anulados: anulados.length,
            total_neto: Math.round(total_neto * 100) / 100,
            total_final: Math.round(total_final * 100) / 100,
        },
        by_tipo_pago: Object.entries(byTipoPago)
            .map(([ds, v]) => ({ ds_tipo_pago: ds, ...v }))
            .sort((a, b) => b.total - a.total),
        by_vendedor: Object.entries(byVendedor)
            .map(([id, v]) => ({ id_vendedor: id, ...v }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10),
        last_run: lastRun || null,
    })
}

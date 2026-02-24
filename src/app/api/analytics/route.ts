import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/service'

export async function GET() {
    const supabase = createAdminClient()

    // 1. KPIs globales
    const { data: vigentes } = await supabase
        .from('precios_compra')
        .select('precio_compra, neto_bonificado, bonif_total_pct, created_at')
        .eq('vigente', true)

    const { count: totalProveedores } = await supabase
        .from('proveedores')
        .select('*', { count: 'exact', head: true })

    const { count: totalHistoricos } = await supabase
        .from('precios_compra')
        .select('*', { count: 'exact', head: true })

    // KPIs base
    const totalVigentes = vigentes?.length ?? 0
    const promedioNeto = vigentes && vigentes.length > 0
        ? vigentes.reduce((s, p) => s + Number(p.neto_bonificado), 0) / vigentes.length
        : 0
    const promedioBonif = vigentes && vigentes.length > 0
        ? vigentes.reduce((s, p) => s + Number(p.bonif_total_pct), 0) / vigentes.length
        : 0

    // Cambios este mes
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const cambiosMes = vigentes?.filter(p => new Date(p.created_at) >= startOfMonth).length ?? 0

    // 2. Evolución mensual: traer todos los historial y agrupar por mes
    const { data: allPrices } = await supabase
        .from('precios_compra')
        .select('precio_compra, neto_bonificado, created_at')
        .order('created_at', { ascending: true })

    // Agrupar por mes
    const monthMap = new Map<string, { suma_precio: number; suma_neto: number; count: number }>()
        ; (allPrices || []).forEach(p => {
            const d = new Date(p.created_at)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            if (!monthMap.has(key)) monthMap.set(key, { suma_precio: 0, suma_neto: 0, count: 0 })
            const m = monthMap.get(key)!
            m.suma_precio += Number(p.precio_compra)
            m.suma_neto += Number(p.neto_bonificado)
            m.count++
        })

    const evolucionMensual = [...monthMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12) // últimos 12 meses
        .map(([mes, v]) => ({
            mes,
            avg_precio: Math.round((v.suma_precio / v.count) * 100) / 100,
            avg_neto: Math.round((v.suma_neto / v.count) * 100) / 100,
            registros: v.count,
        }))

    // 3. Distribución de bonificaciones (sobre vigentes)
    const rangos = [
        { label: '0-5%', min: 0, max: 5 },
        { label: '5-10%', min: 5, max: 10 },
        { label: '10-15%', min: 10, max: 15 },
        { label: '15-20%', min: 15, max: 20 },
        { label: '20-25%', min: 20, max: 25 },
        { label: '25%+', min: 25, max: Infinity },
    ]
    const distribucionBonif = rangos.map(r => ({
        rango: r.label,
        cantidad: vigentes?.filter(p => {
            const b = Number(p.bonif_total_pct)
            return b >= r.min && b < r.max
        }).length ?? 0,
    }))

    return NextResponse.json({
        kpis: {
            totalVigentes,
            totalProveedores: totalProveedores ?? 0,
            totalHistoricos: totalHistoricos ?? 0,
            promedioNeto: Math.round(promedioNeto * 100) / 100,
            promedioBonif: Math.round(promedioBonif * 10) / 10,
            cambiosMes,
        },
        evolucionMensual,
        distribucionBonif,
    })
}

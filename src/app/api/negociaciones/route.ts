import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/service'

export async function GET(request: Request) {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const proveedor_id = searchParams.get('proveedor_id')

    let query = supabase
        .from('negociaciones')
        .select(`
            *,
            proveedores(razon_social, codigo),
            negociacion_conceptos(credito_generado),
            negociacion_liquidaciones(monto)
        `)
        .order('created_at', { ascending: false })

    if (proveedor_id) query = query.eq('proveedor_id', proveedor_id)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Calcular saldo por negociación
    const result = (data || []).map((neg: any) => {
        const credito_total = (neg.negociacion_conceptos || [])
            .reduce((s: number, c: any) => s + Number(c.credito_generado), 0)
        const liquidado_total = (neg.negociacion_liquidaciones || [])
            .reduce((s: number, l: any) => s + Number(l.monto), 0)
        return {
            ...neg,
            credito_total,
            liquidado_total,
            saldo_pendiente: credito_total - liquidado_total,
        }
    })

    return NextResponse.json(result)
}

export async function POST(request: Request) {
    const supabase = createAdminClient()
    try {
        const body = await request.json()
        const { proveedor_id, periodo, descripcion } = body

        if (!proveedor_id || !periodo) {
            return NextResponse.json({ error: 'proveedor_id y periodo son requeridos' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('negociaciones')
            .insert([{ proveedor_id, periodo, descripcion }])
            .select()
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

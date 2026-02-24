import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/service'

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = createAdminClient()

    const { data: neg, error } = await supabase
        .from('negociaciones')
        .select(`*, proveedores(razon_social, codigo)`)
        .eq('id', id)
        .single()

    if (error || !neg) return NextResponse.json({ error: 'Negociación no encontrada' }, { status: 404 })

    const { data: conceptos } = await supabase
        .from('negociacion_conceptos')
        .select('*')
        .eq('negociacion_id', id)
        .order('created_at', { ascending: true })

    const { data: liquidaciones } = await supabase
        .from('negociacion_liquidaciones')
        .select('*')
        .eq('negociacion_id', id)
        .order('fecha', { ascending: true })

    const credito_total = (conceptos || []).reduce((s, c) => s + Number(c.credito_generado), 0)
    const liquidado_total = (liquidaciones || []).reduce((s, l) => s + Number(l.monto), 0)

    return NextResponse.json({
        ...neg,
        conceptos: conceptos || [],
        liquidaciones: liquidaciones || [],
        credito_total,
        liquidado_total,
        saldo_pendiente: credito_total - liquidado_total,
    })
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = createAdminClient()
    const body = await request.json()

    const { data, error } = await supabase
        .from('negociaciones')
        .update(body)
        .eq('id', id)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = createAdminClient()
    const { error } = await supabase.from('negociaciones').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}

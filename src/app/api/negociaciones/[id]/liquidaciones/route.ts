import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/service'

export async function PUT(request: Request) {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const liquidacion_id = searchParams.get('liquidacion_id')
    if (!liquidacion_id) return NextResponse.json({ error: 'liquidacion_id requerido' }, { status: 400 })

    try {
        const body = await request.json()
        const { tipo, referencia, monto, fecha, notas } = body

        const { data, error } = await supabase
            .from('negociacion_liquidaciones')
            .update({
                tipo,
                referencia: referencia || null,
                monto: Number(monto),
                fecha,
                notas: notas || null,
            })
            .eq('id', liquidacion_id)
            .select()
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: negociacion_id } = await params
    const supabase = createAdminClient()

    try {
        const body = await request.json()
        const { tipo, referencia, monto, fecha, notas } = body

        if (!tipo || !monto || !fecha) {
            return NextResponse.json({ error: 'tipo, monto y fecha son requeridos' }, { status: 400 })
        }
        if (!['nc', 'entrega_fisica'].includes(tipo)) {
            return NextResponse.json({ error: 'tipo debe ser nc o entrega_fisica' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('negociacion_liquidaciones')
            .insert([{
                negociacion_id,
                tipo,
                referencia: referencia || null,
                monto: Number(monto),
                fecha,
                notas: notas || null,
            }])
            .select()
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url)
    const liquidacion_id = searchParams.get('liquidacion_id')
    if (!liquidacion_id) return NextResponse.json({ error: 'liquidacion_id requerido' }, { status: 400 })

    const supabase = createAdminClient()
    const { error } = await supabase.from('negociacion_liquidaciones').delete().eq('id', liquidacion_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}

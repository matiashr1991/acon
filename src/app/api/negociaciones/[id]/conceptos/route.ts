import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/service'

export async function PUT(request: Request) {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const concepto_id = searchParams.get('concepto_id')
    if (!concepto_id) return NextResponse.json({ error: 'concepto_id requerido' }, { status: 400 })

    try {
        const body = await request.json()
        const { descripcion, tipo_base, monto_factura, sku, cantidad, precio_unitario, porcentaje_dinam, referencia, fecha } = body

        const pct = Number(porcentaje_dinam) / 100
        let credito_generado: number
        if (tipo_base === 'monto_factura') {
            credito_generado = Number(monto_factura) * pct
        } else {
            credito_generado = Number(cantidad) * Number(precio_unitario) * pct
        }

        const { data, error } = await supabase
            .from('negociacion_conceptos')
            .update({
                descripcion,
                tipo_base,
                monto_factura: tipo_base === 'monto_factura' ? Number(monto_factura) : null,
                sku: sku || null,
                cantidad: cantidad ? Number(cantidad) : null,
                precio_unitario: precio_unitario ? Number(precio_unitario) : null,
                porcentaje_dinam: Number(porcentaje_dinam),
                credito_generado: Math.round(credito_generado * 100) / 100,
                referencia: referencia || null,
                fecha: fecha || null,
            })
            .eq('id', concepto_id)
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
        const {
            descripcion,
            tipo_base,         // 'monto_factura' | 'unidades'
            monto_factura,
            sku,
            cantidad,
            precio_unitario,
            porcentaje_dinam,
            referencia,
            fecha,
        } = body

        if (!tipo_base || porcentaje_dinam == null || !descripcion) {
            return NextResponse.json({ error: 'descripcion, tipo_base y porcentaje_dinam son requeridos' }, { status: 400 })
        }

        const pct = Number(porcentaje_dinam) / 100

        let credito_generado: number
        if (tipo_base === 'monto_factura') {
            if (!monto_factura) return NextResponse.json({ error: 'monto_factura requerido para tipo monto_factura' }, { status: 400 })
            credito_generado = Number(monto_factura) * pct
        } else {
            // unidades
            if (!cantidad || !precio_unitario) return NextResponse.json({ error: 'cantidad y precio_unitario requeridos para tipo unidades' }, { status: 400 })
            credito_generado = Number(cantidad) * Number(precio_unitario) * pct
        }

        const { data, error } = await supabase
            .from('negociacion_conceptos')
            .insert([{
                negociacion_id,
                descripcion,
                tipo_base,
                monto_factura: tipo_base === 'monto_factura' ? Number(monto_factura) : null,
                sku: sku || null,
                cantidad: cantidad ? Number(cantidad) : null,
                precio_unitario: precio_unitario ? Number(precio_unitario) : null,
                porcentaje_dinam: Number(porcentaje_dinam),
                credito_generado: Math.round(credito_generado * 100) / 100,
                referencia: referencia || null,
                fecha: fecha || null,
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
    const concepto_id = searchParams.get('concepto_id')
    if (!concepto_id) return NextResponse.json({ error: 'concepto_id requerido' }, { status: 400 })

    const supabase = createAdminClient()
    const { error } = await supabase.from('negociacion_conceptos').delete().eq('id', concepto_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}

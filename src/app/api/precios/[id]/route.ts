import { NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase/server'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function PUT(request: Request, { params }: RouteParams) {
    const { id } = await params
    const supabase = await createServerSideClient()

    try {
        const body = await request.json()
        const { precio_compra, bonif_total_decimal, estado } = body

        // Obtenemos el registro actual para validar
        const { data: current, error: errCurrent } = await supabase
            .from('precios_compra')
            .select('*')
            .eq('id', id)
            .single()

        if (errCurrent) return NextResponse.json({ error: 'Precio no encontrado' }, { status: 404 })

        let unificado_precio_compra = precio_compra !== undefined ? precio_compra : current.precio_compra
        let unificado_bonif = bonif_total_decimal !== undefined ? bonif_total_decimal : current.bonif_total_decimal

        // Validaciones
        if (unificado_precio_compra <= 0) {
            return NextResponse.json({ error: 'El precio de compra debe ser mayor a 0' }, { status: 400 })
        }
        if (unificado_bonif < 0) {
            return NextResponse.json({ error: 'La bonificación debe ser positiva' }, { status: 400 })
        }

        const bonif_total_pct = unificado_bonif * 100
        const neto_bonificado = unificado_precio_compra * (1 - unificado_bonif)

        const { data, error } = await supabase
            .from('precios_compra')
            .update({
                precio_compra: unificado_precio_compra,
                bonif_total_decimal: unificado_bonif,
                bonif_total_pct,
                neto_bonificado,
                estado: estado || current.estado
            })
            .eq('id', id)
            .select()
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        return NextResponse.json(data)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

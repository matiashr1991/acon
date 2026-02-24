import { NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/service'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const proveedor_id = searchParams.get('proveedor_id')
    const vigentes = searchParams.get('vigentes')

    const supabase = await createServerSideClient()

    let query = supabase.from('precios_compra').select('*, productos(descripcion, barcode)').order('created_at', { ascending: false })

    if (proveedor_id) {
        query = query.eq('proveedor_id', proveedor_id)
    }
    if (vigentes === '1' || vigentes === 'true') {
        query = query.eq('vigente', true)
    }

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(request: Request) {
    const supabase = createAdminClient()

    try {
        const body = await request.json()
        const { proveedor_id, sku, precio_compra, bonif_total_decimal, vig_desde, vig_hasta, vigente, estado } = body

        // Validaciones
        if (!proveedor_id || !sku || precio_compra === undefined || bonif_total_decimal === undefined) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
        }
        if (precio_compra <= 0) {
            return NextResponse.json({ error: 'El precio de compra debe ser mayor a 0' }, { status: 400 })
        }
        if (bonif_total_decimal < 0) {
            return NextResponse.json({ error: 'La bonificación debe ser positiva' }, { status: 400 })
        }

        // Calculos
        const bonif_total_pct = bonif_total_decimal * 100
        const neto_bonificado = precio_compra * (1 - bonif_total_decimal)

        const insertData = {
            proveedor_id,
            sku,
            precio_compra,
            bonif_total_decimal,
            bonif_total_pct,
            neto_bonificado,
            vig_desde: vig_desde || new Date().toISOString(),
            vig_hasta: vig_hasta || null,
            vigente: vigente || false, // Si es un nuevo entry, puede no ser vigente hasta aprobarse
            origen: 'manual',
            estado: estado || 'draft'
        }

        const { data, error } = await supabase
            .from('precios_compra')
            .insert([insertData])
            .select()
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/service'

interface RouteParams {
    params: Promise<{ id: string, sku: string }>
}

export async function PUT(request: Request, { params }: RouteParams) {
    const { id: proveedor_id, sku } = await params
    const supabase = createAdminClient()

    try {
        const body = await request.json()
        const { descripcion, precio_compra, bonif_total_pct } = body

        if (!descripcion || precio_compra === undefined || bonif_total_pct === undefined) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
        }

        const precio = Number(precio_compra)
        const bonif_pct = Number(bonif_total_pct)

        if (isNaN(precio) || precio <= 0) {
            return NextResponse.json({ error: 'Precio de compra inválido' }, { status: 400 })
        }
        if (isNaN(bonif_pct) || bonif_pct < 0 || bonif_pct > 100) {
            return NextResponse.json({ error: 'Bonificación inválida (debe ser entre 0 y 100)' }, { status: 400 })
        }

        const bonif_total_decimal = bonif_pct / 100
        const neto_bonificado = precio * (1 - bonif_total_decimal)

        // 1. Actualizar tabla productos (descripción)
        const { error: prodErr } = await supabase
            .from('productos')
            .update({ descripcion })
            .eq('sku', sku)

        if (prodErr) return NextResponse.json({ error: 'Error al actualizar producto: ' + prodErr.message }, { status: 500 })

        // 2. Desactivar el precio vigente anterior
        await supabase
            .from('precios_compra')
            .update({ vigente: false, vig_hasta: new Date().toISOString() })
            .eq('proveedor_id', proveedor_id)
            .eq('sku', sku)
            .eq('vigente', true)

        // 3. Insertar el nuevo precio vigente
        const { error: priceErr } = await supabase
            .from('precios_compra')
            .insert({
                proveedor_id,
                sku,
                precio_compra: precio,
                bonif_total_decimal,
                bonif_total_pct: bonif_pct,
                neto_bonificado,
                vig_desde: new Date().toISOString(),
                vigente: true,
                origen: 'manual',
                estado: 'applied'
            })

        if (priceErr) return NextResponse.json({ error: 'Error al insertar nuevo precio: ' + priceErr.message }, { status: 500 })

        return NextResponse.json({ success: true, message: 'Producto actualizado exitosamente' })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

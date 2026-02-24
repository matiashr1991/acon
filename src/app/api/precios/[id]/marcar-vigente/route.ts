import { NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase/server'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
    const { id } = await params
    const supabase = await createServerSideClient()

    try {
        // 1. Obtener el registro que queremos hacer vigente
        const { data: candidato, error: getErr } = await supabase
            .from('precios_compra')
            .select('*')
            .eq('id', id)
            .single()

        if (getErr || !candidato) {
            return NextResponse.json({ error: 'Precio no encontrado' }, { status: 404 })
        }

        const { proveedor_id, sku } = candidato

        // ATENCIÓN: En producción, usar una función RPC en Supabase es más seguro 
        // para garantizar atomicidad de la transacción.
        // Como simplificación de MVP, hacemos dos llamadas:

        // 2. Desactivar current vigente para ese proveedor + sku
        const { error: resetErr } = await supabase
            .from('precios_compra')
            .update({
                vigente: false,
                vig_hasta: new Date().toISOString().split('T')[0] // Fecha de hoy
            })
            .eq('proveedor_id', proveedor_id)
            .eq('sku', sku)
            .eq('vigente', true)

        if (resetErr) {
            console.error('Error reset vigente:', resetErr)
            // Continuamos, igual podría no haber ninguno vigente aún
        }

        // 3. Activar el nuevo (el que recibimos en ID)
        const { data: updated, error: setErr } = await supabase
            .from('precios_compra')
            .update({
                vigente: true,
                estado: 'applied',
                vig_hasta: null
            })
            .eq('id', id)
            .select()
            .single()

        if (setErr) {
            return NextResponse.json({ error: setErr.message }, { status: 500 })
        }

        return NextResponse.json(updated)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

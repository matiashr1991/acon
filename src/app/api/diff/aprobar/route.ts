import { NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/service'

export async function POST(request: Request) {
    const supabase = createAdminClient()

    try {
        const body = await request.json()
        // Podemos recibir una lista de IDs de la tabla precios_compra a aprobar
        const { ids } = body

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'Lista de ids a aprobar inválida' }, { status: 400 })
        }

        // 1. Obtener todos los candidatos por id
        const { data: candidatos, error: cErr } = await supabase
            .from('precios_compra')
            .select('*')
            .in('id', ids)
            .eq('estado', 'draft')

        if (cErr || !candidatos || candidatos.length === 0) {
            return NextResponse.json({ error: 'No se encontraron borradores válidos' }, { status: 404 })
        }

        // Necesitamos desactivar los vigentes actuales para los SKUs aprobados
        const skusByProveedor: Record<string, string[]> = {}
        candidatos.forEach(c => {
            if (!skusByProveedor[c.proveedor_id]) {
                skusByProveedor[c.proveedor_id] = []
            }
            skusByProveedor[c.proveedor_id].push(c.sku)
        })

        // 2. Desactivar vigentes anteriores
        // Supabase no soporta un simple UPDATE IN con múltiples tuplas simultaneamente, 
        // así que lo hacemos por proveedor_id
        for (const [proveedor_id, skus] of Object.entries(skusByProveedor)) {
            await supabase
                .from('precios_compra')
                .update({ vigente: false, vig_hasta: new Date().toISOString() })
                .eq('proveedor_id', proveedor_id)
                .in('sku', skus)
                .eq('vigente', true)
        }

        // 3. Activar los candidatos
        const { error: setErr } = await supabase
            .from('precios_compra')
            .update({
                estado: 'applied',
                vigente: true,
                vig_hasta: null
            })
            .in('id', ids)

        if (setErr) {
            return NextResponse.json({ error: 'Error al aplicar vigencia: ' + setErr.message }, { status: 500 })
        }

        return NextResponse.json({ message: 'Cambios aplicados correctamente', count: ids.length })

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

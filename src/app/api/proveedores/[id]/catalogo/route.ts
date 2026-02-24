import { NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/service'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
    const { id } = await params
    const supabase = await createServerSideClient()

    const { data: catData, error: catErr } = await supabase
        .from('proveedor_productos')
        .select('id, activo, sku, productos(descripcion, barcode)')
        .eq('proveedor_id', id)

    if (catErr) return NextResponse.json({ error: catErr.message }, { status: 500 })
    if (!catData || catData.length === 0) return NextResponse.json([])

    const skus = catData.map(c => c.sku)

    let preciosMap: Record<string, any> = {}

    if (skus.length > 0) {
        const { data: preciosData } = await supabase
            .from('precios_compra')
            .select('*')
            .eq('proveedor_id', id)
            .eq('vigente', true)
            .in('sku', skus)

        if (preciosData) {
            preciosData.forEach(p => {
                preciosMap[p.sku] = p
            })
        }
    }

    const formattedData = catData.map(c => ({
        id: c.id,
        sku: c.sku,
        activo: c.activo,
        // @ts-ignore
        descripcion: c.productos?.descripcion,
        // @ts-ignore
        barcode: c.productos?.barcode,
        precioVigente: preciosMap[c.sku] || null
    }))

    return NextResponse.json(formattedData)
}

export async function POST(request: Request, { params }: RouteParams) {
    const { id } = await params
    const supabase = createAdminClient()

    try {
        const body = await request.json()
        const { sku, descripcion, barcode } = body

        if (!sku || !descripcion) {
            return NextResponse.json({ error: 'sku y descripcion son requeridos' }, { status: 400 })
        }

        // 1. Upsert en productos
        const { error: prodError } = await supabase
            .from('productos')
            .upsert({ sku, descripcion, barcode: barcode || null }, { onConflict: 'sku' })

        if (prodError) {
            console.error('Error upserting producto:', prodError)
            return NextResponse.json({ error: prodError.message }, { status: 500 })
        }

        // 2. Insert/Upsert en proveedor_productos
        const { data: ppData, error: ppError } = await supabase
            .from('proveedor_productos')
            .upsert({
                proveedor_id: id,
                sku: sku,
                activo: true
            }, { onConflict: 'proveedor_id,sku' })
            .select()
            .single()

        if (ppError) {
            console.error('Error upserting proveedor_productos:', ppError)
            return NextResponse.json({ error: ppError.message }, { status: 500 })
        }

        return NextResponse.json(ppData)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

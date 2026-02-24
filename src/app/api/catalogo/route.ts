import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/service'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const proveedor_id = searchParams.get('proveedor_id')
    const search = searchParams.get('search') || ''

    const supabase = createAdminClient()

    let query = supabase
        .from('precios_compra')
        .select(`
            id,
            sku,
            precio_compra,
            bonif_total_pct,
            neto_bonificado,
            vig_desde,
            vig_hasta,
            vigente,
            proveedor_id,
            proveedores(codigo, razon_social),
            productos(descripcion, barcode)
        `)
        .eq('vigente', true)
        .order('sku', { ascending: true })

    if (proveedor_id) {
        query = query.eq('proveedor_id', proveedor_id)
    }

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Flatten and apply search filter server-side
    let result = (data || []).map((p: any) => ({
        id: p.id,
        sku: p.sku,
        descripcion: Array.isArray(p.productos) ? (p.productos[0]?.descripcion || '') : (p.productos?.descripcion || ''),
        barcode: Array.isArray(p.productos) ? (p.productos[0]?.barcode || '') : (p.productos?.barcode || ''),
        proveedor_id: p.proveedor_id,
        proveedor_codigo: Array.isArray(p.proveedores) ? (p.proveedores[0]?.codigo || '') : (p.proveedores?.codigo || ''),
        proveedor_nombre: Array.isArray(p.proveedores) ? (p.proveedores[0]?.razon_social || '') : (p.proveedores?.razon_social || ''),
        precio_compra: p.precio_compra,
        bonif_total_pct: p.bonif_total_pct,
        neto_bonificado: p.neto_bonificado,
        vig_desde: p.vig_desde,
        vig_hasta: p.vig_hasta,
    }))

    if (search) {
        const s = search.toLowerCase()
        result = result.filter(p =>
            p.sku?.toLowerCase().includes(s) ||
            p.descripcion?.toLowerCase().includes(s) ||
            p.barcode?.toLowerCase().includes(s)
        )
    }

    return NextResponse.json(result)
}

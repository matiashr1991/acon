import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/service'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const proveedor_id = searchParams.get('proveedor_id')
    const sku = searchParams.get('sku')
    const limit = Number(searchParams.get('limit') || '100')

    const supabase = createAdminClient()

    let query = supabase
        .from('precios_compra')
        .select(`
            id,
            sku,
            precio_compra,
            bonif_total_pct,
            neto_bonificado,
            vigente,
            estado,
            origen,
            vig_desde,
            vig_hasta,
            created_at,
            updated_at,
            proveedor_id,
            import_job_id,
            proveedores(codigo, razon_social),
            productos(descripcion),
            import_jobs(filename, status)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (proveedor_id) query = query.eq('proveedor_id', proveedor_id)
    if (sku) query = query.eq('sku', sku)

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const result = (data || []).map((p: any) => ({
        id: p.id,
        sku: p.sku,
        descripcion: Array.isArray(p.productos) ? (p.productos[0]?.descripcion || '') : (p.productos?.descripcion || ''),
        proveedor_id: p.proveedor_id,
        proveedor_nombre: Array.isArray(p.proveedores) ? (p.proveedores[0]?.razon_social || '') : (p.proveedores?.razon_social || ''),
        precio_compra: p.precio_compra,
        bonif_total_pct: p.bonif_total_pct,
        neto_bonificado: p.neto_bonificado,
        vigente: p.vigente,
        estado: p.estado,
        origen: p.origen,
        vig_desde: p.vig_desde,
        vig_hasta: p.vig_hasta,
        created_at: p.created_at,
        import_filename: Array.isArray(p.import_jobs) ? (p.import_jobs[0]?.filename || null) : (p.import_jobs?.filename || null),
    }))

    return NextResponse.json(result)
}

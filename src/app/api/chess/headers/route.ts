import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/service'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const page = Number(searchParams.get('page') || '1')
    const limit = Number(searchParams.get('limit') || '50')
    const vendedor = searchParams.get('vendedor')
    const tipo_pago = searchParams.get('tipo_pago')
    const soloAnulados = searchParams.get('anulados') === 'true'

    if (!desde || !hasta) return NextResponse.json({ error: 'desde y hasta requeridos' }, { status: 400 })

    const supabase = createAdminClient()
    const offset = (page - 1) * limit

    let query = supabase
        .from('chess_sales_headers')
        .select('*', { count: 'exact' })
        .gte('fecha_comprobante', desde)
        .lte('fecha_comprobante', hasta)
        .order('fecha_comprobante', { ascending: false })
        .range(offset, offset + limit - 1)

    if (vendedor) query = query.eq('id_vendedor', Number(vendedor))
    if (tipo_pago) query = query.ilike('ds_tipo_pago', `%${tipo_pago}%`)
    if (soloAnulados) query = query.neq('anulado', 'NO')
    else query = query.eq('anulado', 'NO')

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
        data: data || [],
        total: count || 0,
        page,
        pages: Math.ceil((count || 0) / limit),
    })
}

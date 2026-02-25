import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/service'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const id_empresa = searchParams.get('id_empresa')
    const id_documento = searchParams.get('id_documento')
    const letra = searchParams.get('letra')
    const serie = searchParams.get('serie')
    const nrodoc = searchParams.get('nrodoc')

    if (!id_documento || !letra || !serie || !nrodoc) {
        return NextResponse.json({ error: 'id_documento, letra, serie, nrodoc requeridos' }, { status: 400 })
    }

    const supabase = createAdminClient()
    let query = supabase
        .from('chess_sales_lines')
        .select('*')
        .eq('id_documento', id_documento)
        .eq('letra', letra)
        .eq('serie', Number(serie))
        .eq('nrodoc', Number(nrodoc))
        .order('id_linea', { ascending: true })

    if (id_empresa) query = query.eq('id_empresa', Number(id_empresa))

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
}

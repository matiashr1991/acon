import { NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/service'

export async function GET() {
    const supabase = await createServerSideClient()

    const { data, error } = await supabase
        .from('proveedores')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching proveedores:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
}

export async function POST(request: Request) {
    const supabase = createAdminClient()

    try {
        const body = await request.json()
        const { codigo, razon_social, campos_plantilla } = body

        if (!codigo || !razon_social) {
            return NextResponse.json({ error: 'codigo y razon_social son requeridos' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('proveedores')
            .insert([{ codigo, razon_social, campos_plantilla: campos_plantilla || {} }])
            .select()
            .single()

        if (error) {
            console.error('Error creating proveedor:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

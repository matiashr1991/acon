import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/service'

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = createAdminClient()

    try {
        const body = await request.json()
        const { campos_plantilla } = body

        const { data, error } = await supabase
            .from('proveedores')
            .update({ campos_plantilla })
            .eq('id', id)
            .select()
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        return NextResponse.json(data)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

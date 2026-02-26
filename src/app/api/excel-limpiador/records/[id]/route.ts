import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/service'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const body = await request.json()
        const id = params.id

        // Prevent updating the ID or Job ID
        delete body.id
        delete body.job_id
        delete body.created_at

        const supabase = createAdminClient()

        const { data, error } = await supabase
            .from('excel_clean_records')
            .update(body)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

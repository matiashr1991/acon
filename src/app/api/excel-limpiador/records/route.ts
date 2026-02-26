import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/service'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const limit = Number(searchParams.get('limit') || 50)
        const page = Number(searchParams.get('page') || 1)
        const offset = (page - 1) * limit

        const supabase = createAdminClient()

        // Get total count
        const { count, error: countError } = await supabase
            .from('excel_clean_records')
            .select('*', { count: 'exact', head: true })

        if (countError) throw countError

        // Get paginated data
        const { data, error } = await supabase
            .from('excel_clean_records')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) throw error

        return NextResponse.json({
            data,
            meta: {
                total: count,
                page,
                limit,
                totalPages: count ? Math.ceil(count / limit) : 0
            }
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

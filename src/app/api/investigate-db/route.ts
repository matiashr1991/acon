import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function GET() {
    const supabase = createAdminClient()

    // Get the latest draft price
    const { data: latestPrice } = await supabase
        .from('precios_compra')
        .select('*, productos(*)')
        .eq('estado', 'draft')
        .order('created_at', { ascending: false })
        .limit(1)

    return NextResponse.json({ latestPrice })
}

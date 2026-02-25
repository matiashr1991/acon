import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/service'

const BUCKET = 'negociaciones-comprobantes'

async function ensureBucket(supabase: any) {
    const { data: buckets } = await supabase.storage.listBuckets()
    const exists = (buckets || []).some((b: any) => b.name === BUCKET)
    if (!exists) {
        await supabase.storage.createBucket(BUCKET, { public: false })
    }
}

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = createAdminClient()
    await ensureBucket(supabase)

    const { data, error } = await supabase.storage.from(BUCKET).list(id, {
        sortBy: { column: 'created_at', order: 'desc' }
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Generar URLs firmadas para cada archivo
    const files = await Promise.all(
        (data || []).map(async (f: any) => {
            const path = `${id}/${f.name}`
            const { data: url } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
            return { ...f, signedUrl: url?.signedUrl || null, path }
        })
    )

    return NextResponse.json(files)
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = createAdminClient()
    await ensureBucket(supabase)

    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

        const ext = file.name.split('.').pop()
        const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const path = `${id}/${safeName}`

        const buffer = Buffer.from(await file.arrayBuffer())

        const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
            contentType: file.type || 'application/octet-stream',
            upsert: false,
        })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        const { data: url } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
        return NextResponse.json({ path, name: safeName, signedUrl: url?.signedUrl })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')
    if (!path) return NextResponse.json({ error: 'path requerido' }, { status: 400 })

    const supabase = createAdminClient()
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}

import { createServerSideClient } from '@/lib/supabase/server'
import { DiffPanel } from '@/components/proveedores/DiffPanel'
import { notFound } from 'next/navigation'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function DiffPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createServerSideClient()

    const { data: proveedor, error } = await supabase
        .from('proveedores')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !proveedor) {
        notFound()
    }

    return (
        <div className="space-y-6">
            <DiffPanel proveedor={proveedor} />
        </div>
    )
}

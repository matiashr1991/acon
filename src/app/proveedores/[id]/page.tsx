import { createServerSideClient } from '@/lib/supabase/server'
import { ProveedorPanel } from '@/components/proveedores/ProveedorPanel'
import { notFound } from 'next/navigation'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function ProveedorPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createServerSideClient()

    // 1. Get Proveedor details
    const { data: proveedor, error } = await supabase
        .from('proveedores')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !proveedor) {
        notFound()
    }

    // 2. We pass the ID and basic info to the Client Component ProviderPanel
    // The client component will manage the tabs, load the catalog, and handle imports.
    return (
        <div className="space-y-6">
            <ProveedorPanel proveedor={proveedor} />
        </div>
    )
}

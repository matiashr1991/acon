import { createServerSideClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Package, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export default async function ProveedoresPage() {
    const supabase = await createServerSideClient()

    const { data: proveedores, error } = await supabase
        .from('proveedores')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Proveedores</h1>
                    <p className="text-neutral-400">Gestiona tus proveedores, catálogos y listas de precios importadas.</p>
                </div>
                <Link
                    href="/proveedores/nuevo"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <Plus size={20} />
                    <span>Nuevo Proveedor</span>
                </Link>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl">
                    Error al cargar los proveedores: {error.message}
                </div>
            )}

            {!proveedores || proveedores.length === 0 ? (
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                        <Package size={32} className="text-neutral-500" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-2">Aún no hay proveedores</h3>
                    <p className="text-neutral-400 max-w-sm mb-6">
                        Comienza agregando tu primer proveedor para gestionar su catálogo y automatizar sus precios de compra.
                    </p>
                    <Link
                        href="/proveedores/nuevo"
                        className="bg-neutral-800 hover:bg-neutral-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
                    >
                        Agregar Proveedor
                    </Link>
                </div>
            ) : (
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-neutral-400">
                            <thead className="text-xs uppercase bg-neutral-950/50 text-neutral-500 font-semibold border-b border-neutral-800">
                                <tr>
                                    <th className="px-6 py-4">Razón Social</th>
                                    <th className="px-6 py-4">Código</th>
                                    <th className="px-6 py-4">Fecha de Alta</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/50">
                                {proveedores.map(prov => (
                                    <tr key={prov.id} className="hover:bg-neutral-800/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                                                    <Package size={16} />
                                                </div>
                                                <span className="font-medium text-white group-hover:text-indigo-400 transition-colors">
                                                    {prov.razon_social}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-neutral-300">
                                            {prov.codigo}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={14} className="text-neutral-500" />
                                                <span>{format(new Date(prov.created_at), "d MMM, yyyy", { locale: es })}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/proveedores/${prov.id}`}
                                                className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                                            >
                                                Ver Panel &rarr;
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

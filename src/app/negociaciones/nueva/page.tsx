'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Handshake } from 'lucide-react'

export default function NuevaNegociacionPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [proveedores, setProveedores] = useState<any[]>([])

    useEffect(() => {
        fetch('/api/proveedores').then(r => r.json()).then(d => setProveedores(Array.isArray(d) ? d : []))
    }, [])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const fd = new FormData(e.currentTarget)
        try {
            const res = await fetch('/api/negociaciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    proveedor_id: fd.get('proveedor_id'),
                    periodo: fd.get('periodo'),
                    descripcion: fd.get('descripcion') || null,
                })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            router.push(`/negociaciones/${data.id}`)
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/negociaciones" className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Handshake size={22} className="text-indigo-400" />
                        Nueva Negociación
                    </h1>
                    <p className="text-neutral-400 text-sm mt-0.5">Registrá una negociación dinámica con un proveedor.</p>
                </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg mb-5">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-1.5">Proveedor</label>
                        <select
                            name="proveedor_id"
                            required
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        >
                            <option value="">Seleccionar proveedor...</option>
                            {proveedores.map(p => (
                                <option key={p.id} value={p.id}>{p.codigo} — {p.razon_social}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-1.5">Período</label>
                        <input
                            type="text"
                            name="periodo"
                            required
                            placeholder="Ej: dic-25, ene-26, Q1-2026..."
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-1.5">Descripción (opcional)</label>
                        <textarea
                            name="descripcion"
                            rows={3}
                            placeholder="Detalles adicionales de la negociación..."
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                        />
                    </div>

                    <div className="pt-4 border-t border-neutral-800/50 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={17} />}
                            {loading ? 'Guardando...' : 'Crear Negociación'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

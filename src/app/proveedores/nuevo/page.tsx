'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Building2, Calendar } from 'lucide-react'

export default function NuevoProveedorPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const formData = new FormData(e.currentTarget)
        const codigo = formData.get('codigo')
        const razon_social = formData.get('razon_social')
        const fecha_lista = formData.get('fecha_lista') as string | null

        try {
            const res = await fetch('/api/proveedores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    codigo,
                    razon_social,
                    campos_plantilla: {
                        fecha_lista: fecha_lista || null
                    }
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error al crear proveedor')

            router.push(`/proveedores/${data.id}`)
            router.refresh()
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/" className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Building2 size={24} className="text-indigo-400" />
                        Nuevo Proveedor
                    </h1>
                    <p className="text-neutral-400 text-sm mt-1">Registra un nuevo proveedor en el sistema.</p>
                </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-4 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="codigo" className="block text-sm font-medium text-neutral-300 mb-1.5">
                                Código Único
                            </label>
                            <input
                                type="text"
                                id="codigo"
                                name="codigo"
                                required
                                placeholder="Ej: 475"
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div>
                            <label htmlFor="razon_social" className="block text-sm font-medium text-neutral-300 mb-1.5">
                                Razón Social o Nombre
                            </label>
                            <input
                                type="text"
                                id="razon_social"
                                name="razon_social"
                                required
                                placeholder="Ej: Velas Fiesta S.A."
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div>
                            <label htmlFor="fecha_lista" className="block text-sm font-medium text-neutral-300 mb-1.5">
                                <span className="flex items-center gap-1.5">
                                    <Calendar size={14} className="text-indigo-400" />
                                    Fecha de Lista (FECVIG)
                                </span>
                            </label>
                            <input
                                type="date"
                                id="fecha_lista"
                                name="fecha_lista"
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all [color-scheme:dark]"
                            />
                            <p className="text-xs text-neutral-500 mt-1.5">
                                Aparece en el nombre del archivo exportado como{' '}
                                <span className="font-mono text-neutral-400">FECVIG-YYYYMMDD</span>.
                                Podés cambiarla después desde el panel del proveedor.
                            </p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-neutral-800/50 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            <span>{loading ? 'Guardando...' : 'Guardar Proveedor'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

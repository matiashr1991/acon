'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Info, CheckSquare } from 'lucide-react'

export function DiffPanel({ proveedor }: { proveedor: any }) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const jobId = searchParams.get('job_id')

    const [diffData, setDiffData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [approving, setApproving] = useState(false)

    const [activeTab, setActiveTab] = useState<'modificados' | 'nuevos' | 'eliminados' | 'sin_cambios'>('modificados')

    useEffect(() => {
        const fetchDiff = async () => {
            try {
                let url = `/api/diff?proveedor_id=${proveedor.id}`
                if (jobId) url += `&job_id=${jobId}`

                const res = await fetch(url)
                const data = await res.json()
                setDiffData(data)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        fetchDiff()
    }, [proveedor.id, jobId])

    const handleAprobar = async () => {
        if (!diffData) return

        // Recopilar todos los IDs de borradores a aprobar (nuevos y modificados)
        const idsAprobar = [
            ...diffData.detalles.nuevos.map((n: any) => n.candidato.id),
            ...diffData.detalles.modificados.map((m: any) => m.candidato.id),
            ...diffData.detalles.sin_cambios.map((s: any) => s.candidato.id)
        ]

        if (idsAprobar.length === 0) {
            alert("No hay cambios para aprobar.")
            return
        }

        setApproving(true)

        try {
            const res = await fetch('/api/diff/aprobar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: idsAprobar })
            })

            if (res.ok) {
                // Exito
                router.push(`/proveedores/${proveedor.id}`)
            } else {
                const err = await res.json()
                alert('Error: ' + err.error)
            }
        } catch (error) {
            console.error(error)
            alert('Error de conexión')
        } finally {
            setApproving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-neutral-400">
                <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                <p>Calculando diferencias...</p>
            </div>
        )
    }

    if (!diffData || !diffData.resumen) {
        return <div className="text-red-400 p-6 bg-red-400/10 rounded-lg">Error al cargar diferencias.</div>
    }

    const { resumen, detalles } = diffData

    const tabs = [
        { id: 'modificados', label: 'Modificados', count: resumen.modificados, color: 'text-amber-400', bg: 'bg-amber-400/10' },
        { id: 'nuevos', label: 'Nuevos', count: resumen.nuevos, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        { id: 'eliminados', label: 'No Informados', count: resumen.eliminados, color: 'text-red-400', bg: 'bg-red-400/10' },
        { id: 'sin_cambios', label: 'Sin Cambios', count: resumen.sin_cambios, color: 'text-neutral-400', bg: 'bg-neutral-800' }
    ] as const

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/proveedores/${proveedor.id}`} className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                            Comprobar Cambios
                            {jobId && <span className="text-xs font-normal bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">Import Job</span>}
                        </h1>
                        <p className="text-neutral-400 text-sm mt-1">{proveedor.razon_social} ({proveedor.codigo})</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push(`/proveedores/${proveedor.id}`)}
                        className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleAprobar}
                        disabled={approving || (resumen.modificados + resumen.nuevos === 0 && resumen.sin_cambios === 0)}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                    >
                        {approving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <CheckSquare size={18} />
                        )}
                        <span>Aprobar y Aplicar Vigencia</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id as any)}
                        className={`text-left p-4 rounded-xl border transition-all ${activeTab === t.id ? 'border-indigo-500 bg-neutral-900 shadow-md' : 'border-neutral-800 bg-neutral-950 hover:bg-neutral-900'}`}
                    >
                        <div className={`text-2xl font-bold ${t.color}`}>{t.count}</div>
                        <div className="text-sm font-medium text-neutral-400 mt-1">{t.label}</div>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                {activeTab === 'modificados' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-neutral-400">
                            <thead className="text-xs uppercase bg-neutral-950/50 text-neutral-500 font-semibold border-b border-neutral-800">
                                <tr>
                                    <th className="px-4 py-3">SKU</th>
                                    <th className="px-4 py-3">Descripción</th>
                                    <th className="px-4 py-3 text-right">Precio Actual</th>
                                    <th className="px-4 py-3 text-right">Precio Nuevo</th>
                                    <th className="px-4 py-3 text-right">Bonif Actual</th>
                                    <th className="px-4 py-3 text-right font-medium text-indigo-300">Bonif Nueva</th>
                                    <th className="px-4 py-3 text-right">Neto Nuevo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/50">
                                {detalles.modificados.length === 0 && (
                                    <tr><td colSpan={7} className="text-center py-12 text-neutral-500">No hay productos modificados.</td></tr>
                                )}
                                {detalles.modificados.map((m: any) => (
                                    <tr key={m.candidato.sku} className="hover:bg-neutral-800/30 transition-colors">
                                        <td className="px-4 py-3 font-mono text-neutral-300">{m.candidato.sku}</td>
                                        <td className="px-4 py-3 max-w-[200px] truncate" title={m.candidato.productos?.descripcion}>
                                            {m.candidato.productos?.descripcion}
                                        </td>
                                        <td className="px-4 py-3 text-right line-through text-neutral-500">
                                            ${Number(m.anterior.precio_compra).toFixed(2)}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-medium ${m.cambios.precio_compra ? 'text-amber-400' : 'text-neutral-300'}`}>
                                            ${Number(m.candidato.precio_compra).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-right line-through text-neutral-500">
                                            {(Number(m.anterior.bonif_total_decimal) * 100).toFixed(2)}%
                                        </td>
                                        <td className={`px-4 py-3 text-right font-medium ${m.cambios.bonif_total_decimal ? 'text-amber-400' : 'text-neutral-300'}`}>
                                            {(Number(m.candidato.bonif_total_decimal) * 100).toFixed(2)}%
                                        </td>
                                        <td className="px-4 py-3 text-right text-emerald-400 font-bold">
                                            ${Number(m.candidato.neto_bonificado).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'nuevos' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-neutral-400">
                            <thead className="text-xs uppercase bg-neutral-950/50 text-neutral-500 font-semibold border-b border-neutral-800">
                                <tr>
                                    <th className="px-4 py-3">SKU</th>
                                    <th className="px-4 py-3">Descripción</th>
                                    <th className="px-4 py-3 text-right">Precio CC</th>
                                    <th className="px-4 py-3 text-right">Bonif CR</th>
                                    <th className="px-4 py-3 text-right">Neto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/50">
                                {detalles.nuevos.length === 0 && (
                                    <tr><td colSpan={5} className="text-center py-12 text-neutral-500">No hay productos nuevos.</td></tr>
                                )}
                                {detalles.nuevos.map((n: any) => (
                                    <tr key={n.candidato.sku} className="hover:bg-neutral-800/30 transition-colors">
                                        <td className="px-4 py-3 font-mono text-white flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                            {n.candidato.sku}
                                        </td>
                                        <td className="px-4 py-3">{n.candidato.productos?.descripcion}</td>
                                        <td className="px-4 py-3 text-right">${Number(n.candidato.precio_compra).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right">{(Number(n.candidato.bonif_total_decimal) * 100).toFixed(2)}%</td>
                                        <td className="px-4 py-3 text-right font-bold text-emerald-400">${Number(n.candidato.neto_bonificado).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'eliminados' && (
                    <div className="p-12 text-center">
                        <AlertTriangle size={48} className="mx-auto text-red-500/50 mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">Productos No Informados</h3>
                        <p className="text-neutral-400 max-w-md mx-auto">
                            Hay {resumen.eliminados} productos que actualmente están vigentes pero no vinieron en el último Excel.
                            El sistema por defecto mantendrá su vigencia anterior intacta. Si deseas depurarlos, deberás hacerlo manualmente (No incluido en esta versión).
                        </p>
                    </div>
                )}

                {activeTab === 'sin_cambios' && (
                    <div className="p-12 text-center">
                        <Info size={48} className="mx-auto text-neutral-500/50 mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">Productos Sin Cambios</h3>
                        <p className="text-neutral-400 max-w-md mx-auto">
                            Hay {resumen.sin_cambios} productos que vinieron en el maestro con el mismo Precio CC y la misma Bonificación CR. Serán omitidos de la actualización para no duplicar historiales sin sentido.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

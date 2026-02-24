'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Handshake, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const fmt = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(n)

export default function NegociacionesPage() {
    const [negociaciones, setNegociaciones] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/negociaciones')
            .then(r => r.json())
            .then(d => setNegociaciones(Array.isArray(d) ? d : []))
            .finally(() => setLoading(false))
    }, [])

    // Agrupar por proveedor
    const byProveedor: Record<string, { prov: any; items: any[] }> = negociaciones.reduce((acc, neg) => {
        const key = neg.proveedor_id
        if (!acc[key]) acc[key] = { prov: neg.proveedores, items: [] }
        acc[key].items.push(neg)
        return acc
    }, {} as Record<string, { prov: any; items: any[] }>)

    return (
        <div className="space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Handshake size={28} className="text-indigo-400" />
                        Negociaciones Dinámicas
                    </h1>
                    <p className="text-neutral-400 mt-1">Control de bonificaciones por trueque con proveedores.</p>
                </div>
                <Link
                    href="/negociaciones/nueva"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <Plus size={18} />
                    Nueva Negociación
                </Link>
            </header>

            {loading && (
                <div className="text-center py-16 text-neutral-500">Cargando negociaciones...</div>
            )}

            {!loading && negociaciones.length === 0 && (
                <div className="py-16 text-center border border-dashed border-neutral-800 rounded-xl text-neutral-500">
                    No hay negociaciones registradas.{' '}
                    <Link href="/negociaciones/nueva" className="text-indigo-400 hover:underline">Crear la primera</Link>
                </div>
            )}

            {Object.entries(byProveedor).map(([provId, { prov, items }]) => (
                <div key={provId} className="space-y-3">
                    <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="font-mono text-neutral-600">{prov?.codigo}</span>
                        {prov?.razon_social}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {(items as any[]).map((neg) => {
                            const saldo = neg.saldo_pendiente
                            const isPositive = saldo > 0
                            const isNeutral = saldo === 0

                            return (
                                <Link key={neg.id} href={`/negociaciones/${neg.id}`}>
                                    <div className="bg-neutral-900 border border-neutral-800 hover:border-indigo-500/50 rounded-xl p-5 transition-all group relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-indigo-500/5 to-transparent pointer-events-none" />

                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2 ${neg.estado === 'activa' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-800 text-neutral-500'}`}>
                                                    {neg.estado}
                                                </span>
                                                <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                                                    {neg.periodo}
                                                </h3>
                                                {neg.descripcion && (
                                                    <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-[180px]">{neg.descripcion}</p>
                                                )}
                                            </div>
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isNeutral ? 'bg-neutral-800' : isPositive ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                                                {isNeutral
                                                    ? <Minus size={16} className="text-neutral-400" />
                                                    : isPositive
                                                        ? <TrendingUp size={16} className="text-emerald-400" />
                                                        : <TrendingDown size={16} className="text-red-400" />
                                                }
                                            </div>
                                        </div>

                                        <div className="space-y-2 pt-3 border-t border-neutral-800/50">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-neutral-500">Crédito generado</span>
                                                <span className="text-neutral-300 font-mono">{fmt(neg.credito_total)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-neutral-500">Liquidado</span>
                                                <span className="text-neutral-300 font-mono">{fmt(neg.liquidado_total)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm font-semibold pt-1 border-t border-neutral-800/30">
                                                <span className="text-neutral-400">Saldo pendiente</span>
                                                <span className={`font-mono ${isPositive ? 'text-emerald-400' : isNeutral ? 'text-neutral-400' : 'text-red-400'}`}>
                                                    {fmt(saldo)}
                                                </span>
                                            </div>
                                        </div>

                                        <p className="text-[10px] text-neutral-600 mt-3">
                                            {format(new Date(neg.created_at), "d MMM yyyy", { locale: es })}
                                        </p>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}

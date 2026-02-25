'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
    Plus, Handshake, TrendingUp, TrendingDown, Minus,
    Bell, Settings2, AlertTriangle, X, ArrowRight
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

const fmt = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(n)

const DEFAULT_ALERT_DAYS = 30

function daysOverdue(neg: any): number {
    const liquidaciones: any[] = neg.negociacion_liquidaciones || []
    const fechas = liquidaciones.map((l: any) => l.fecha).filter(Boolean).sort().reverse()
    const referencia = fechas[0] ? new Date(fechas[0]) : new Date(neg.created_at)
    return differenceInDays(new Date(), referencia)
}

export default function NegociacionesPage() {
    const [negociaciones, setNegociaciones] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [alertDays, setAlertDays] = useState<number>(DEFAULT_ALERT_DAYS)
    const [editingConfig, setEditingConfig] = useState(false)
    const [tempDays, setTempDays] = useState<string>('')

    useEffect(() => {
        const stored = localStorage.getItem('neg_alert_days')
        if (stored) setAlertDays(Number(stored))
    }, [])

    useEffect(() => {
        fetch('/api/negociaciones')
            .then(r => r.json())
            .then(d => setNegociaciones(Array.isArray(d) ? d : []))
            .finally(() => setLoading(false))
    }, [])

    const saveAlertDays = () => {
        const val = Math.max(1, Number(tempDays) || DEFAULT_ALERT_DAYS)
        setAlertDays(val)
        localStorage.setItem('neg_alert_days', String(val))
        setEditingConfig(false)
    }

    const alertas = negociaciones.filter(n =>
        n.saldo_pendiente > 0 && n.estado === 'activa' && daysOverdue(n) >= alertDays
    )

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
                        <Handshake size={26} className="text-indigo-400" />
                        Negociaciones Dinámicas
                    </h1>
                    <p className="text-neutral-400">Control de bonificaciones por trueque con proveedores.</p>
                </div>
                <div className="flex items-center gap-3">
                    {editingConfig ? (
                        <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2">
                            <Bell size={13} className="text-amber-400 shrink-0" />
                            <span className="text-xs text-neutral-400">Alertar cada</span>
                            <input
                                type="number" min="1" max="365" value={tempDays}
                                onChange={e => setTempDays(e.target.value)}
                                className="w-14 bg-neutral-800 border border-neutral-700 rounded px-2 py-0.5 text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                                autoFocus
                            />
                            <span className="text-xs text-neutral-400">días</span>
                            <button onClick={saveAlertDays} className="text-xs text-amber-400 hover:text-amber-300 font-medium">OK</button>
                            <button onClick={() => setEditingConfig(false)} className="text-neutral-500 hover:text-neutral-300"><X size={12} /></button>
                        </div>
                    ) : (
                        <button
                            onClick={() => { setTempDays(String(alertDays)); setEditingConfig(true) }}
                            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-amber-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-amber-500/5"
                        >
                            <Settings2 size={13} />
                            Alertas cada {alertDays} días
                        </button>
                    )}
                    <Link
                        href="/negociaciones/nueva"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Nueva Negociación
                    </Link>
                </div>
            </div>

            {/* Banner de alertas */}
            {alertas.length > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle size={15} className="text-amber-400" />
                        <span className="text-sm font-semibold text-amber-400">
                            {alertas.length} negociación{alertas.length > 1 ? 'es' : ''} con saldo pendiente hace más de {alertDays} días
                        </span>
                    </div>
                    <div className="space-y-1.5">
                        {alertas.map(neg => (
                            <Link key={neg.id} href={`/negociaciones/${neg.id}`}>
                                <div className="flex items-center justify-between bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2 transition-colors">
                                    <div className="flex items-center gap-3 text-sm">
                                        <span className="font-mono text-neutral-500 text-xs">{neg.proveedores?.codigo}</span>
                                        <span className="font-medium text-white">{neg.proveedores?.razon_social}</span>
                                        <span className="text-neutral-500">— {neg.periodo}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs text-amber-400/70">{daysOverdue(neg)}d sin actividad</span>
                                        <span className="font-mono font-semibold text-amber-400 text-sm">{fmt(neg.saldo_pendiente)}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Tabla principal */}
            {loading ? (
                <div className="text-center py-16 text-neutral-500">Cargando negociaciones...</div>
            ) : negociaciones.length === 0 ? (
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 flex flex-col items-center text-center">
                    <Handshake size={32} className="text-neutral-600 mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2">Sin negociaciones</h3>
                    <p className="text-neutral-400 mb-6">Registrá tu primera negociación dinámica con un proveedor.</p>
                    <Link href="/negociaciones/nueva" className="bg-neutral-800 hover:bg-neutral-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors">
                        Nueva Negociación
                    </Link>
                </div>
            ) : (
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-neutral-400">
                            <thead className="text-xs uppercase bg-neutral-950/50 text-neutral-500 font-semibold border-b border-neutral-800">
                                <tr>
                                    <th className="px-6 py-4">Proveedor</th>
                                    <th className="px-6 py-4">Período</th>
                                    <th className="px-6 py-4">Estado</th>
                                    <th className="px-6 py-4 text-right">Crédito</th>
                                    <th className="px-6 py-4 text-right">Liquidado</th>
                                    <th className="px-6 py-4 text-right">Saldo pendiente</th>
                                    <th className="px-6 py-4 text-center">Alta</th>
                                    <th className="px-6 py-4" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/50">
                                {negociaciones.map(neg => {
                                    const saldo = neg.saldo_pendiente
                                    const isPositive = saldo > 0
                                    const isNegative = saldo < 0
                                    const dias = daysOverdue(neg)
                                    const isOverdue = isPositive && neg.estado === 'activa' && dias >= alertDays

                                    return (
                                        <tr key={neg.id} className={`hover:bg-neutral-800/30 transition-colors group ${isOverdue ? 'bg-amber-500/3' : ''}`}>
                                            {/* Proveedor */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                                                        <Handshake size={15} />
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-white group-hover:text-indigo-400 transition-colors block">
                                                            {neg.proveedores?.razon_social}
                                                        </span>
                                                        <span className="text-xs font-mono text-neutral-600">{neg.proveedores?.codigo}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Período */}
                                            <td className="px-6 py-4 font-medium text-neutral-300">{neg.periodo}</td>

                                            {/* Estado */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                                                        ${neg.estado === 'activa' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-800 text-neutral-500'}`}>
                                                        {neg.estado}
                                                    </span>
                                                    {isOverdue && (
                                                        <span title={`${dias} días sin actividad`}>
                                                            <AlertTriangle size={12} className="text-amber-400" />
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Crédito */}
                                            <td className="px-6 py-4 text-right font-mono text-neutral-300">
                                                {fmt(neg.credito_total)}
                                            </td>

                                            {/* Liquidado */}
                                            <td className="px-6 py-4 text-right font-mono text-neutral-400">
                                                {fmt(neg.liquidado_total)}
                                            </td>

                                            {/* Saldo */}
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {isPositive
                                                        ? <TrendingUp size={13} className="text-emerald-400" />
                                                        : isNegative
                                                            ? <TrendingDown size={13} className="text-red-400" />
                                                            : <Minus size={13} className="text-neutral-500" />}
                                                    <span className={`font-mono font-semibold text-base
                                                        ${isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-neutral-500'}`}>
                                                        {fmt(saldo)}
                                                    </span>
                                                </div>
                                                {isOverdue && (
                                                    <p className="text-[10px] text-amber-500 text-right mt-0.5">{dias}d sin actividad</p>
                                                )}
                                            </td>

                                            {/* Fecha */}
                                            <td className="px-6 py-4 text-center text-xs text-neutral-500">
                                                {format(new Date(neg.created_at), 'd MMM yyyy', { locale: es })}
                                            </td>

                                            {/* Acción */}
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={`/negociaciones/${neg.id}`}
                                                    className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    Ver <ArrowRight size={14} />
                                                </Link>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

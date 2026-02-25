'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Handshake, TrendingUp, TrendingDown, Minus, Bell, Settings2, AlertTriangle, X } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

const fmt = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(n)

const DEFAULT_ALERT_DAYS = 30

function daysOverdue(neg: any): number {
    // Usamos la fecha de la última liquidación, o la fecha de creación como referencia
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

    // Cargar configuración desde localStorage
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

    // Negociaciones que disparan alerta: saldo > 0 Y días sin actividad >= alertDays
    const alertas = negociaciones.filter(n =>
        n.saldo_pendiente > 0 &&
        n.estado === 'activa' &&
        daysOverdue(n) >= alertDays
    )

    // Agrupar por proveedor
    const byProveedor: Record<string, { prov: any; items: any[] }> = negociaciones.reduce((acc, neg) => {
        const key = neg.proveedor_id
        if (!acc[key]) acc[key] = { prov: neg.proveedores, items: [] }
        acc[key].items.push(neg)
        return acc
    }, {} as Record<string, { prov: any; items: any[] }>)

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Handshake size={28} className="text-indigo-400" />
                        Negociaciones Dinámicas
                    </h1>
                    <p className="text-neutral-400 mt-1">Control de bonificaciones por trueque con proveedores.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Config alertas */}
                    {editingConfig ? (
                        <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2">
                            <Bell size={14} className="text-amber-400 shrink-0" />
                            <span className="text-xs text-neutral-400">Alertar cada</span>
                            <input
                                type="number"
                                min="1"
                                max="365"
                                value={tempDays}
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
            </header>

            {/* Alertas */}
            {alertas.length > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle size={16} className="text-amber-400" />
                        <h2 className="text-sm font-semibold text-amber-400">
                            {alertas.length} negociación{alertas.length > 1 ? 'es' : ''} con saldo pendiente hace más de {alertDays} días
                        </h2>
                    </div>
                    <div className="space-y-2">
                        {alertas.map(neg => {
                            const dias = daysOverdue(neg)
                            return (
                                <Link key={neg.id} href={`/negociaciones/${neg.id}`}>
                                    <div className="flex items-center justify-between bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2.5 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div>
                                                <span className="text-xs font-mono text-neutral-500">{neg.proveedores?.codigo}</span>
                                                <span className="text-sm font-medium text-white ml-2">{neg.proveedores?.razon_social}</span>
                                                <span className="text-xs text-neutral-500 ml-2">— {neg.periodo}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs text-amber-400/70 font-mono">{dias} días sin actividad</span>
                                            <span className="font-mono font-semibold text-amber-400 text-sm">{fmt(neg.saldo_pendiente)}</span>
                                            <TrendingUp size={14} className="text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            )}

            {loading && <div className="text-center py-16 text-neutral-500">Cargando negociaciones...</div>}

            {!loading && negociaciones.length === 0 && (
                <div className="py-16 text-center border border-dashed border-neutral-800 rounded-xl text-neutral-500">
                    No hay negociaciones registradas.{' '}
                    <Link href="/negociaciones/nueva" className="text-indigo-400 hover:underline">Crear la primera</Link>
                </div>
            )}

            {/* Lista por proveedor */}
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
                            const dias = daysOverdue(neg)
                            const isOverdue = isPositive && neg.estado === 'activa' && dias >= alertDays

                            return (
                                <Link key={neg.id} href={`/negociaciones/${neg.id}`}>
                                    <div className={`bg-neutral-900 border rounded-xl p-5 transition-all group relative overflow-hidden
                                        ${isOverdue ? 'border-amber-500/40 hover:border-amber-500/70' : 'border-neutral-800 hover:border-indigo-500/50'}`}>

                                        {isOverdue && (
                                            <div className="absolute top-2.5 right-2.5">
                                                <AlertTriangle size={13} className="text-amber-400" />
                                            </div>
                                        )}

                                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-indigo-500/5 to-transparent pointer-events-none" />

                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2 ${neg.estado === 'activa' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-800 text-neutral-500'}`}>
                                                    {neg.estado}
                                                </span>
                                                <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                                                    {neg.periodo}
                                                </h3>
                                                {neg.descripcion && <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-[180px]">{neg.descripcion}</p>}
                                            </div>
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isNeutral ? 'bg-neutral-800' : isPositive ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                                                {isNeutral ? <Minus size={16} className="text-neutral-400" /> :
                                                    isPositive ? <TrendingUp size={16} className="text-emerald-400" /> :
                                                        <TrendingDown size={16} className="text-red-400" />}
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

                                        <div className="flex items-center justify-between mt-2">
                                            <p className="text-[10px] text-neutral-600">
                                                {format(new Date(neg.created_at), "d MMM yyyy", { locale: es })}
                                            </p>
                                            {isOverdue && (
                                                <p className="text-[10px] text-amber-500 font-medium">⚠ {dias}d sin actividad</p>
                                            )}
                                        </div>
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

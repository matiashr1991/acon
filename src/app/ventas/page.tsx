'use client'

import { useState, useCallback, useRef } from 'react'
import { RefreshCw, Download, X, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, BarChart2 } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(n)
const fmtN = (n: number) =>
    new Intl.NumberFormat('es-AR').format(Math.round(n))

function today() { return new Date().toISOString().split('T')[0] }
function monthAgo() { return subDays(new Date(), 30).toISOString().split('T')[0] }

// ── Bar chart CSS ─────────────────────────────────────────────────────────────

function BarChart({ data, valueKey, labelKey, color = 'indigo' }:
    { data: any[]; valueKey: string; labelKey: string; color?: string }) {
    const max = Math.max(...data.map(d => d[valueKey]), 1)
    const colors: Record<string, string> = {
        indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500', violet: 'bg-violet-500'
    }
    const bg = colors[color] || 'bg-indigo-500'

    return (
        <div className="space-y-2">
            {data.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-neutral-400 w-36 truncate shrink-0" title={d[labelKey]}>{d[labelKey]}</span>
                    <div className="flex-1 bg-neutral-800 rounded-full h-2">
                        <div
                            className={`${bg} h-2 rounded-full transition-all`}
                            style={{ width: `${(d[valueKey] / max) * 100}%` }}
                        />
                    </div>
                    <span className="text-xs font-mono text-neutral-300 w-28 text-right shrink-0">{fmt(d[valueKey])}</span>
                </div>
            ))}
        </div>
    )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
    return (
        <div className={`bg-neutral-900 border rounded-xl p-5 ${accent ? 'border-indigo-500/30' : 'border-neutral-800'}`}>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-2xl font-bold ${accent ? 'text-indigo-400' : 'text-white'}`}>{value}</p>
            {sub && <p className="text-xs text-neutral-600 mt-1">{sub}</p>}
        </div>
    )
}

// ── Drill-down modal de líneas ────────────────────────────────────────────────

function LinesModal({ header, onClose }: { header: any; onClose: () => void }) {
    const [lines, setLines] = useState<any[] | null>(null)
    const [loading, setLoading] = useState(true)

    useState(() => {
        const p = `id_empresa=${header.id_empresa}&id_documento=${header.id_documento}&letra=${header.letra}&serie=${header.serie}&nrodoc=${header.nrodoc}`
        fetch(`/api/chess/lines?${p}`)
            .then(r => r.json())
            .then(d => { setLines(Array.isArray(d) ? d : []); setLoading(false) })
    })

    const nombre = `${header.letra || ''}-${String(header.serie || '').padStart(4, '0')}-${String(header.nrodoc || '').padStart(8, '0')}`

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-neutral-800 shrink-0">
                    <div>
                        <h3 className="font-semibold text-white">{nombre}</h3>
                        <p className="text-xs text-neutral-500">{header.nombre_cliente} · {header.ds_tipo_pago} · {header.ds_vendedor}</p>
                    </div>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white"><X size={18} /></button>
                </div>
                <div className="overflow-auto flex-1">
                    {loading ? (
                        <div className="p-8 text-center text-neutral-500">Cargando líneas...</div>
                    ) : !lines || lines.length === 0 ? (
                        <div className="p-8 text-center text-neutral-600">Sin líneas sincronizadas para este comprobante.</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-neutral-950/50 text-xs text-neutral-500 uppercase sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left">Artículo</th>
                                    <th className="px-4 py-3 text-right">Cant.</th>
                                    <th className="px-4 py-3 text-right">P. Bruto</th>
                                    <th className="px-4 py-3 text-right">Bon%</th>
                                    <th className="px-4 py-3 text-right">P. Neto</th>
                                    <th className="px-4 py-3 text-right text-indigo-400">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/50">
                                {lines.map((l, i) => (
                                    <tr key={i} className="hover:bg-neutral-800/20">
                                        <td className="px-4 py-2.5">
                                            <span className="text-neutral-200">{l.ds_articulo}</span>
                                            <span className="text-neutral-600 text-xs ml-2">#{l.id_articulo}</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-mono text-neutral-400">{l.cantidades_total}</td>
                                        <td className="px-4 py-2.5 text-right font-mono text-neutral-400">{fmt(l.precio_unitario_bruto || 0)}</td>
                                        <td className="px-4 py-2.5 text-right font-mono text-amber-500">{l.bonificacion ? `${l.bonificacion}%` : '—'}</td>
                                        <td className="px-4 py-2.5 text-right font-mono text-neutral-300">{fmt(l.precio_unitario_neto || 0)}</td>
                                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-indigo-400">{fmt(l.subtotal_final || 0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="p-4 border-t border-neutral-800 flex justify-between items-center shrink-0">
                    <span className="text-xs text-neutral-500">{lines?.length || 0} líneas</span>
                    <span className="font-mono font-bold text-indigo-400">{fmt(header.subtotal_final || 0)}</span>
                </div>
            </div>
        </div>
    )
}

// ── Tabla de comprobantes ─────────────────────────────────────────────────────

function HeadersTable({ desde, hasta }: { desde: string; hasta: string }) {
    const [data, setData] = useState<any[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [pages, setPages] = useState(1)
    const [loading, setLoading] = useState(false)
    const [drill, setDrill] = useState<any | null>(null)
    const [sorted, setSorted] = useState<'asc' | 'desc'>('desc')

    const load = useCallback(async (p: number) => {
        setLoading(true)
        const res = await fetch(`/api/chess/headers?desde=${desde}&hasta=${hasta}&page=${p}&limit=50`)
        const json = await res.json()
        setData(json.data || [])
        setTotal(json.total || 0)
        setPages(json.pages || 1)
        setPage(p)
        setLoading(false)
    }, [desde, hasta])

    // Load on mount / cuando cambian fechas
    const loaded = useRef(false)
    if (!loaded.current && desde && hasta) { loaded.current = true; load(1) }

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                <h2 className="font-semibold text-white">Comprobantes <span className="text-neutral-500 text-sm font-normal">({fmtN(total)} total)</span></h2>
                <button onClick={() => load(page)} disabled={loading} className="text-xs text-neutral-500 hover:text-white flex items-center gap-1">
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Actualizar
                </button>
            </div>
            {loading ? (
                <div className="p-8 text-center text-neutral-500">Cargando...</div>
            ) : data.length === 0 ? (
                <div className="p-8 text-center text-neutral-600 text-sm">Sin datos para este período. Ejecutá una sincronización.</div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-neutral-950/50 text-xs text-neutral-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3 text-left">Fecha</th>
                                    <th className="px-4 py-3 text-left">Comprobante</th>
                                    <th className="px-4 py-3 text-left">Cliente</th>
                                    <th className="px-4 py-3 text-left">Vendedor</th>
                                    <th className="px-4 py-3 text-left">Tipo Pago</th>
                                    <th className="px-4 py-3 text-right">Neto</th>
                                    <th className="px-4 py-3 text-right text-indigo-400">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/50">
                                {data.map((h: any) => {
                                    const nombre = `${h.letra || ''}-${String(h.serie || '').padStart(4, '0')}-${String(h.nrodoc || '').padStart(8, '0')}`
                                    return (
                                        <tr key={h.id}
                                            className="hover:bg-neutral-800/30 cursor-pointer group transition-colors"
                                            onClick={() => setDrill(h)}>
                                            <td className="px-4 py-2.5 text-xs text-neutral-400">
                                                {h.fecha_comprobante ? format(new Date(h.fecha_comprobante), 'd MMM', { locale: es }) : '—'}
                                            </td>
                                            <td className="px-4 py-2.5 font-mono text-xs text-neutral-300 group-hover:text-indigo-400">{nombre}</td>
                                            <td className="px-4 py-2.5 text-neutral-300 max-w-[160px] truncate">{h.nombre_cliente}</td>
                                            <td className="px-4 py-2.5 text-neutral-500 text-xs">{h.ds_vendedor}</td>
                                            <td className="px-4 py-2.5">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${h.ds_tipo_pago?.includes('CTA') ? 'bg-violet-500/10 text-violet-400' : 'bg-neutral-800 text-neutral-500'}`}>
                                                    {h.ds_tipo_pago || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono text-neutral-400 text-xs">{fmt(h.subtotal_neto || 0)}</td>
                                            <td className="px-4 py-2.5 text-right font-mono font-semibold text-indigo-400">{fmt(h.subtotal_final || 0)}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    {pages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-800 text-xs text-neutral-500">
                            <button onClick={() => load(page - 1)} disabled={page <= 1 || loading}
                                className="hover:text-white disabled:opacity-30 transition-colors">← Anterior</button>
                            <span>Página {page} de {pages}</span>
                            <button onClick={() => load(page + 1)} disabled={page >= pages || loading}
                                className="hover:text-white disabled:opacity-30 transition-colors">Siguiente →</button>
                        </div>
                    )}
                </>
            )}
            {drill && <LinesModal header={drill} onClose={() => setDrill(null)} />}
        </div>
    )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function VentasPage() {
    const [desde, setDesde] = useState(monthAgo())
    const [hasta, setHasta] = useState(today())
    const [summary, setSummary] = useState<any>(null)
    const [syncing, setSyncing] = useState(false)
    const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null)
    const [loadingSummary, setLoadingSummary] = useState(false)

    const loadSummary = useCallback(async (d: string, h: string) => {
        setLoadingSummary(true)
        const res = await fetch(`/api/chess/summary?desde=${d}&hasta=${h}`)
        const data = await res.json()
        setSummary(data)
        setLoadingSummary(false)
    }, [])

    const runSync = async () => {
        setSyncing(true)
        setSyncMsg(null)
        try {
            const res = await fetch(`/api/chess/sync?desde=${desde}&hasta=${hasta}`, { method: 'POST' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error desconocido')
            setSyncMsg({ ok: true, text: `Sync OK · ${data.counts?.headers || 0} cabeceras · ${data.counts?.lines || 0} líneas` })
            await loadSummary(desde, hasta)
        } catch (e: any) {
            setSyncMsg({ ok: false, text: e.message })
        }
        setSyncing(false)
    }

    const applyRange = () => loadSummary(desde, hasta)

    const totals = summary?.totals
    const lastRun = summary?.last_run
    const byTipoPago = summary?.by_tipo_pago || []
    const byVendedor = summary?.by_vendedor || []

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
                        <BarChart2 size={26} className="text-indigo-400" />
                        Reportes de Ventas
                    </h1>
                    <p className="text-neutral-400">Chess ERP — sincronización y análisis de comprobantes.</p>
                </div>
                {lastRun && (
                    <div className="text-right text-xs text-neutral-600">
                        <p>Último sync: {format(new Date(lastRun.finished_at), "d MMM HH:mm", { locale: es })}</p>
                        <p className="font-mono">{lastRun.fecha_desde} → {lastRun.fecha_hasta}</p>
                    </div>
                )}
            </div>

            {/* Controles */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="text-xs text-neutral-500 block mb-1">Desde</label>
                        <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                            className="input-base [color-scheme:dark]" />
                    </div>
                    <div>
                        <label className="text-xs text-neutral-500 block mb-1">Hasta</label>
                        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                            className="input-base [color-scheme:dark]" />
                    </div>
                    <button onClick={applyRange} disabled={loadingSummary}
                        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                        <RefreshCw size={14} className={loadingSummary ? 'animate-spin' : ''} />
                        Ver datos
                    </button>
                    <button onClick={runSync} disabled={syncing}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                        <Download size={14} className={syncing ? 'animate-bounce' : ''} />
                        {syncing ? 'Sincronizando...' : 'Sincronizar con ERP'}
                    </button>
                </div>

                {syncMsg && (
                    <div className={`mt-3 flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${syncMsg.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {syncMsg.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        {syncMsg.text}
                    </div>
                )}
            </div>

            {/* KPIs */}
            {totals ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KpiCard label="Total Final" value={fmt(totals.total_final)} accent />
                    <KpiCard label="Total Neto" value={fmt(totals.total_neto)} />
                    <KpiCard label="Comprobantes" value={fmtN(totals.comprobantes)} />
                    <KpiCard label="Anulados" value={fmtN(totals.anulados)} sub="excluidos del total" />
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 animate-pulse">
                            <div className="h-3 bg-neutral-800 rounded w-24 mb-3" />
                            <div className="h-7 bg-neutral-800 rounded w-36" />
                        </div>
                    ))}
                </div>
            )}

            {/* Gráficos */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                        <h2 className="font-semibold text-white mb-4 text-sm">Por tipo de pago</h2>
                        {byTipoPago.length === 0 ? (
                            <p className="text-neutral-600 text-sm">Sin datos</p>
                        ) : (
                            <BarChart data={byTipoPago} valueKey="total" labelKey="ds_tipo_pago" color="violet" />
                        )}
                    </div>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                        <h2 className="font-semibold text-white mb-4 text-sm">Por vendedor (top 10)</h2>
                        {byVendedor.length === 0 ? (
                            <p className="text-neutral-600 text-sm">Sin datos</p>
                        ) : (
                            <BarChart data={byVendedor} valueKey="total" labelKey="label" color="emerald" />
                        )}
                    </div>
                </div>
            )}

            {/* Tabla */}
            <HeadersTable desde={desde} hasta={hasta} />
        </div>
    )
}

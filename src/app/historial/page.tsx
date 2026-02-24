'use client'

import { useEffect, useState, useMemo } from 'react'
import { History, Search, Clock, FileSpreadsheet, Pencil, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface PrecioHistorial {
    id: string
    sku: string
    descripcion: string
    proveedor_id: string
    proveedor_nombre: string
    precio_compra: number
    bonif_total_pct: number
    neto_bonificado: number
    vigente: boolean
    estado: string
    origen: string
    created_at: string
    import_filename: string | null
}

const fmt = (n: number) =>
    new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(n)

const round3 = (v: number) => Math.round(v * 1000) / 1000

function BadgeEstado({ vigente, estado }: { vigente: boolean; estado: string }) {
    if (vigente) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">VIGENTE</span>
    if (estado === 'draft') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">BORRADOR</span>
    if (estado === 'applied') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-500/20 text-neutral-400 border border-neutral-700">APLICADO</span>
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-700/50 text-neutral-500 border border-neutral-700">{estado}</span>
}

function BadgeOrigen({ origen, filename }: { origen: string; filename: string | null }) {
    if (origen === 'import') return (
        <span className="flex items-center gap-1 text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
            <FileSpreadsheet size={10} />
            {filename ? filename.split('_').slice(-1)[0].replace('.xlsx', '') : 'Import'}
        </span>
    )
    return (
        <span className="flex items-center gap-1 text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
            <Pencil size={10} />
            Manual
        </span>
    )
}

// ── Tab 1: Feed de últimas actualizaciones ─────────────────────────────────
function TabUltimas({ data }: { data: PrecioHistorial[] }) {
    // Agrupar por SKU+proveedor para comparar con el siguiente registro (anterior)
    const entries = useMemo(() => {
        const byKey = new Map<string, PrecioHistorial[]>()
        data.forEach(p => {
            const key = `${p.proveedor_id}__${p.sku}`
            if (!byKey.has(key)) byKey.set(key, [])
            byKey.get(key)!.push(p)
        })
        // Para cada serie, el primer registro es el más reciente (vigente o draft), el segundo es el anterior
        const result: Array<{ current: PrecioHistorial; prev: PrecioHistorial | null }> = []
        byKey.forEach(list => {
            // list está ordenado desc por created_at desde la API
            result.push({ current: list[0], prev: list[1] ?? null })
        })
        return result.sort((a, b) => new Date(b.current.created_at).getTime() - new Date(a.current.created_at).getTime())
    }, [data])

    if (entries.length === 0) return (
        <div className="py-20 text-center text-neutral-500 text-sm">No hay registros de actualizaciones.</div>
    )

    return (
        <div className="space-y-2">
            {entries.map(({ current, prev }) => {
                const delta = prev ? round3(current.neto_bonificado) - round3(prev.neto_bonificado) : null
                const pct = prev && prev.neto_bonificado > 0
                    ? ((current.neto_bonificado - prev.neto_bonificado) / prev.neto_bonificado * 100)
                    : null

                return (
                    <div key={current.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-colors">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="font-mono text-sm text-white font-semibold">{current.sku}</span>
                                    <BadgeEstado vigente={current.vigente} estado={current.estado} />
                                    <BadgeOrigen origen={current.origen} filename={current.import_filename} />
                                    <span className="text-xs text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                                        {current.proveedor_nombre}
                                    </span>
                                </div>
                                <p className="text-xs text-neutral-400 truncate max-w-md">{current.descripcion || '—'}</p>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-neutral-500 shrink-0">
                                <Clock size={12} />
                                {formatDistanceToNow(new Date(current.created_at), { locale: es, addSuffix: true })}
                            </div>
                        </div>

                        <div className="mt-3 flex items-center gap-3 flex-wrap">
                            {prev && (
                                <>
                                    <div className="text-right">
                                        <p className="text-[10px] text-neutral-500 mb-0.5">Anterior</p>
                                        <p className="font-mono text-sm text-neutral-400 line-through">$ {fmt(round3(prev.neto_bonificado))}</p>
                                    </div>
                                    <div className="text-neutral-600">→</div>
                                </>
                            )}
                            <div className="text-right">
                                <p className="text-[10px] text-neutral-500 mb-0.5">Neto bonif.</p>
                                <p className="font-mono text-sm text-emerald-400 font-semibold">$ {fmt(round3(current.neto_bonificado))}</p>
                            </div>

                            {delta !== null && pct !== null && (
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold
                                    ${delta > 0 ? 'bg-red-500/10 text-red-400' : delta < 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-800 text-neutral-500'}`}>
                                    {delta > 0 ? <TrendingUp size={12} /> : delta < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                                    {delta > 0 ? '+' : ''}{pct.toFixed(1)}%
                                </div>
                            )}

                            <div className="ml-auto text-right">
                                <p className="text-[10px] text-neutral-500 mb-0.5">Precio unitario</p>
                                <p className="font-mono text-xs text-neutral-300">$ {fmt(round3(current.precio_compra))} · {current.bonif_total_pct?.toFixed(1)}% bonif.</p>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// ── Tab 2: Historial por SKU ───────────────────────────────────────────────
function TabSKU() {
    const [sku, setSku] = useState('')
    const [inputSku, setInputSku] = useState('')
    const [historial, setHistorial] = useState<PrecioHistorial[]>([])
    const [loading, setLoading] = useState(false)
    const [searched, setSearched] = useState(false)

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (!inputSku.trim()) return
        setSku(inputSku.trim().toUpperCase())
    }

    useEffect(() => {
        if (!sku) return
        setLoading(true)
        setSearched(true)
        fetch(`/api/historial?sku=${encodeURIComponent(sku)}&limit=200`)
            .then(r => r.json())
            .then(d => setHistorial(Array.isArray(d) ? d : []))
            .finally(() => setLoading(false))
    }, [sku])

    return (
        <div className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Ingresá un SKU exacto..."
                        value={inputSku}
                        onChange={e => setInputSku(e.target.value.toUpperCase())}
                        className="w-full bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                    />
                </div>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
                    Buscar
                </button>
            </form>

            {loading && (
                <div className="flex justify-center py-12 text-neutral-500 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        Cargando historial...
                    </div>
                </div>
            )}

            {!loading && searched && historial.length === 0 && (
                <div className="py-16 text-center text-neutral-500 text-sm">No se encontró historial para el SKU <span className="font-mono text-white">{sku}</span>.</div>
            )}

            {!loading && historial.length > 0 && (
                <div>
                    <div className="mb-3">
                        <p className="text-white font-semibold">{historial[0].descripcion || sku}</p>
                        <p className="text-xs text-neutral-500">{historial.length} registros encontrados</p>
                    </div>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase text-neutral-500 bg-neutral-950/60 border-b border-neutral-800">
                                <tr>
                                    <th className="px-4 py-3">Fecha</th>
                                    <th className="px-4 py-3">Proveedor</th>
                                    <th className="px-4 py-3 text-right">Precio Unit.</th>
                                    <th className="px-4 py-3 text-right">Bonif %</th>
                                    <th className="px-4 py-3 text-right">Neto Bonif.</th>
                                    <th className="px-4 py-3">Estado</th>
                                    <th className="px-4 py-3">Origen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/40">
                                {historial.map((p, i) => {
                                    const next = historial[i + 1]
                                    const delta = next ? round3(p.neto_bonificado) - round3(next.neto_bonificado) : null

                                    return (
                                        <tr key={p.id} className={`hover:bg-neutral-800/20 transition-colors ${p.vigente ? 'bg-emerald-500/5' : ''}`}>
                                            <td className="px-4 py-3 text-xs text-neutral-400 whitespace-nowrap">
                                                {format(new Date(p.created_at), 'd MMM yyyy, HH:mm', { locale: es })}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-neutral-300">{p.proveedor_nombre}</td>
                                            <td className="px-4 py-3 text-right font-mono text-neutral-200 text-xs">$ {fmt(round3(p.precio_compra))}</td>
                                            <td className="px-4 py-3 text-right text-xs text-neutral-400">{p.bonif_total_pct?.toFixed(1)}%</td>
                                            <td className="px-4 py-3 text-right font-mono text-xs">
                                                <span className={p.vigente ? 'text-emerald-400 font-bold' : 'text-neutral-300'}>
                                                    $ {fmt(round3(p.neto_bonificado))}
                                                </span>
                                                {delta !== null && delta !== 0 && (
                                                    <span className={`ml-2 text-[10px] ${delta > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                        {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(3)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3"><BadgeEstado vigente={p.vigente} estado={p.estado} /></td>
                                            <td className="px-4 py-3"><BadgeOrigen origen={p.origen} filename={p.import_filename} /></td>
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

// ── Página principal ───────────────────────────────────────────────────────
export default function HistorialPage() {
    const [tab, setTab] = useState<'ultimas' | 'sku'>('ultimas')
    const [data, setData] = useState<PrecioHistorial[]>([])
    const [loading, setLoading] = useState(true)
    const [proveedorFiltro, setProveedorFiltro] = useState('')

    useEffect(() => {
        setLoading(true)
        const url = proveedorFiltro ? `/api/historial?proveedor_id=${proveedorFiltro}&limit=200` : '/api/historial?limit=200'
        fetch(url)
            .then(r => r.json())
            .then(d => setData(Array.isArray(d) ? d : []))
            .finally(() => setLoading(false))
    }, [proveedorFiltro])

    const proveedores = useMemo(() => {
        const seen = new Map<string, string>()
        data.forEach(p => seen.set(p.proveedor_id, p.proveedor_nombre))
        return [...seen.entries()].map(([id, nombre]) => ({ id, nombre }))
    }, [data])

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <History size={28} className="text-indigo-400" />
                        Historial de Precios
                    </h1>
                    <p className="text-neutral-400 mt-1">Seguí la evolución de precios y últimas actualizaciones.</p>
                </div>

                {tab === 'ultimas' && (
                    <select
                        value={proveedorFiltro}
                        onChange={e => setProveedorFiltro(e.target.value)}
                        className="bg-neutral-900 border border-neutral-800 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                        <option value="">Todos los proveedores</option>
                        {proveedores.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-neutral-900 border border-neutral-800 rounded-xl p-1 w-fit">
                {([['ultimas', 'Últimas actualizaciones'], ['sku', 'Buscar por SKU']] as const).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key
                            ? 'bg-indigo-600 text-white shadow'
                            : 'text-neutral-400 hover:text-white'
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Contenido */}
            {tab === 'ultimas' && (
                loading
                    ? <div className="flex justify-center py-20 text-neutral-500 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            Cargando...
                        </div>
                    </div>
                    : <TabUltimas data={data} />
            )}

            {tab === 'sku' && <TabSKU />}
        </div>
    )
}

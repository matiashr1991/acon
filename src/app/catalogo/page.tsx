'use client'

import { useEffect, useState, useMemo } from 'react'
import { Search, LayoutGrid, ChevronUp, ChevronDown, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Producto {
    id: string
    sku: string
    descripcion: string
    barcode: string
    proveedor_id: string
    proveedor_codigo: string
    proveedor_nombre: string
    precio_compra: number
    bonif_total_pct: number
    neto_bonificado: number
    vig_desde: string | null
    vig_hasta: string | null
}

type SortKey = 'sku' | 'descripcion' | 'proveedor_nombre' | 'precio_compra' | 'neto_bonificado'

const PROVEEDOR_COLORS = [
    'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'bg-rose-500/20 text-rose-300 border-rose-500/30',
    'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    'bg-violet-500/20 text-violet-300 border-violet-500/30',
    'bg-orange-500/20 text-orange-300 border-orange-500/30',
    'bg-teal-500/20 text-teal-300 border-teal-500/30',
]

const fmt = (n: number) =>
    new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(n)

export default function CatalogoPage() {
    const [productos, setProductos] = useState<Producto[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [search, setSearch] = useState('')
    const [proveedorFiltro, setProveedorFiltro] = useState('')
    const [sortKey, setSortKey] = useState<SortKey>('sku')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
    const [page, setPage] = useState(1)
    const PAGE_SIZE = 50

    useEffect(() => {
        setLoading(true)
        fetch('/api/catalogo')
            .then(r => r.json())
            .then(d => {
                if (d.error) setError(d.error)
                else setProductos(d)
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false))
    }, [])

    // Mapa de colores por proveedor
    const colorMap = useMemo(() => {
        const ids = [...new Set(productos.map(p => p.proveedor_id))]
        const map: Record<string, string> = {}
        ids.forEach((id, i) => { map[id] = PROVEEDOR_COLORS[i % PROVEEDOR_COLORS.length] })
        return map
    }, [productos])

    // Lista de proveedores únicos para el filtro
    const proveedores = useMemo(() => {
        const seen = new Map<string, string>()
        productos.forEach(p => seen.set(p.proveedor_id, p.proveedor_nombre))
        return [...seen.entries()].map(([id, nombre]) => ({ id, nombre }))
    }, [productos])

    // Filtrado + ordenamiento
    const filtered = useMemo(() => {
        const s = search.toLowerCase()
        let list = productos.filter(p => {
            const matchSearch = !s ||
                p.sku?.toLowerCase().includes(s) ||
                p.descripcion?.toLowerCase().includes(s) ||
                p.barcode?.toLowerCase().includes(s)
            const matchProv = !proveedorFiltro || p.proveedor_id === proveedorFiltro
            return matchSearch && matchProv
        })

        list = [...list].sort((a, b) => {
            const av = a[sortKey] ?? ''
            const bv = b[sortKey] ?? ''
            if (typeof av === 'number' && typeof bv === 'number') {
                return sortDir === 'asc' ? av - bv : bv - av
            }
            return sortDir === 'asc'
                ? String(av).localeCompare(String(bv))
                : String(bv).localeCompare(String(av))
        })
        return list
    }, [productos, search, proveedorFiltro, sortKey, sortDir])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortKey(key); setSortDir('asc') }
        setPage(1)
    }

    const SortIcon = ({ k }: { k: SortKey }) => {
        if (sortKey !== k) return <ChevronUp size={12} className="text-neutral-600" />
        return sortDir === 'asc'
            ? <ChevronUp size={12} className="text-indigo-400" />
            : <ChevronDown size={12} className="text-indigo-400" />
    }

    const handleSearch = (v: string) => { setSearch(v); setPage(1) }
    const handleProv = (v: string) => { setProveedorFiltro(v); setPage(1) }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <LayoutGrid size={28} className="text-indigo-400" />
                        Catálogo Global
                    </h1>
                    <p className="text-neutral-400 mt-1">
                        Todos los productos vigentes de todos los proveedores en una sola vista.
                    </p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-right">
                    <p className="text-2xl font-bold text-white">{filtered.length.toLocaleString('es-AR')}</p>
                    <p className="text-xs text-neutral-500">productos encontrados</p>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Buscar por SKU, descripción o barcode..."
                        value={search}
                        onChange={e => handleSearch(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 rounded-lg px-4 py-2.5 pl-9 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    {search && (
                        <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white">
                            <X size={14} />
                        </button>
                    )}
                </div>

                <select
                    value={proveedorFiltro}
                    onChange={e => handleProv(e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors min-w-52"
                >
                    <option value="">Todos los proveedores</option>
                    {proveedores.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                </select>
            </div>

            {/* Badges de proveedores */}
            {proveedores.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {proveedores.map(p => (
                        <button
                            key={p.id}
                            onClick={() => handleProv(proveedorFiltro === p.id ? '' : p.id)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${colorMap[p.id]} ${proveedorFiltro === p.id ? 'ring-2 ring-offset-1 ring-offset-neutral-950 ring-current' : 'opacity-70 hover:opacity-100'}`}
                        >
                            {p.nombre}
                        </button>
                    ))}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
                    {error}
                </div>
            )}

            {/* Tabla */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-24 text-neutral-500">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Cargando catálogo...</span>
                        </div>
                    </div>
                ) : paginated.length === 0 ? (
                    <div className="py-20 text-center text-neutral-500 text-sm">
                        No se encontraron productos con los filtros aplicados.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase text-neutral-500 bg-neutral-950/50 border-b border-neutral-800">
                                <tr>
                                    {([
                                        ['sku', 'SKU'],
                                        ['descripcion', 'Descripción'],
                                        ['proveedor_nombre', 'Proveedor'],
                                        ['precio_compra', 'Precio Unit.'],
                                        ['neto_bonificado', 'Neto Bonif.'],
                                    ] as [SortKey, string][]).map(([key, label]) => (
                                        <th
                                            key={key}
                                            className="px-4 py-3 cursor-pointer select-none hover:text-white transition-colors"
                                            onClick={() => toggleSort(key)}
                                        >
                                            <div className="flex items-center gap-1">
                                                {label}
                                                <SortIcon k={key} />
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-neutral-500">Bonif %</th>
                                    <th className="px-4 py-3 text-neutral-500">Vigente Hasta</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/40">
                                {paginated.map(p => (
                                    <tr key={p.id} className="hover:bg-neutral-800/30 transition-colors">
                                        <td className="px-4 py-3 font-mono text-neutral-300 whitespace-nowrap">{p.sku}</td>
                                        <td className="px-4 py-3 text-white max-w-xs truncate" title={p.descripcion}>{p.descripcion || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colorMap[p.proveedor_id]}`}>
                                                {p.proveedor_nombre}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-neutral-200 whitespace-nowrap">
                                            $ {fmt(p.precio_compra)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-emerald-400 whitespace-nowrap font-medium">
                                            $ {fmt(p.neto_bonificado)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-neutral-400">
                                            {p.bonif_total_pct?.toFixed(1)}%
                                        </td>
                                        <td className="px-4 py-3 text-neutral-500 whitespace-nowrap text-xs">
                                            {p.vig_hasta
                                                ? format(new Date(p.vig_hasta), 'd MMM yyyy', { locale: es })
                                                : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-neutral-400">
                    <span>
                        Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 disabled:opacity-40 hover:border-neutral-600 transition-colors"
                        >
                            ← Anterior
                        </button>
                        <span className="px-3 py-1.5 text-white font-medium">{page} / {totalPages}</span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 disabled:opacity-40 hover:border-neutral-600 transition-colors"
                        >
                            Siguiente →
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

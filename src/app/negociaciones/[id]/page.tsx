'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown, Minus,
    FileText, Package, X, Edit2, Upload, File, ImageIcon, ExternalLink, Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const fmt = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(n)
const fmtPct = (n: number) => `${Number(n).toFixed(2)}%`

// ── Modal Concepto (crear / editar) ─────────────────────────────────────────

function ModalConcepto({
    negId, initial, onClose, onSaved
}: { negId: string; initial?: any; onClose: () => void; onSaved: () => void }) {
    const isEdit = !!initial
    const [tipoBase, setTipoBase] = useState<'monto_factura' | 'unidades'>(
        initial?.tipo_base || 'monto_factura'
    )
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true); setError('')
        const fd = new FormData(e.currentTarget)
        const body = { ...Object.fromEntries(fd), tipo_base: tipoBase }
        try {
            const url = isEdit
                ? `/api/negociaciones/${negId}/conceptos?concepto_id=${initial.id}`
                : `/api/negociaciones/${negId}/conceptos`
            const res = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            onSaved(); onClose()
        } catch (err: any) { setError(err.message) }
        finally { setLoading(false) }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-lg shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                    <h3 className="font-semibold text-white">{isEdit ? 'Editar Concepto' : 'Agregar Concepto'}</h3>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white"><X size={18} /></button>
                </div>
                {error && <div className="mx-4 mt-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-2 rounded">{error}</div>}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="text-xs text-neutral-400 font-medium uppercase tracking-wider block mb-1.5">Descripción</label>
                        <input name="descripcion" required defaultValue={initial?.descripcion} placeholder="Ej: Compra dic-25 factura 12345" className="input-base w-full" />
                    </div>
                    <div>
                        <label className="text-xs text-neutral-400 font-medium uppercase tracking-wider block mb-1.5">Tipo de base</label>
                        <div className="flex gap-2">
                            {(['monto_factura', 'unidades'] as const).map(t => (
                                <button key={t} type="button" onClick={() => setTipoBase(t)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${tipoBase === t ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'}`}>
                                    {t === 'monto_factura' ? '💵 Monto factura' : '📦 Unidades'}
                                </button>
                            ))}
                        </div>
                    </div>
                    {tipoBase === 'monto_factura' ? (
                        <div>
                            <label className="text-xs text-neutral-400 font-medium uppercase tracking-wider block mb-1.5">Monto de la factura ($)</label>
                            <input name="monto_factura" type="number" step="0.01" required defaultValue={initial?.monto_factura} placeholder="0.00" className="input-base w-full" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-3">
                            <div><label className="text-xs text-neutral-400 block mb-1">SKU</label>
                                <input name="sku" defaultValue={initial?.sku} placeholder="SKU123" className="input-base w-full" /></div>
                            <div><label className="text-xs text-neutral-400 block mb-1">Cantidad</label>
                                <input name="cantidad" type="number" step="0.001" required defaultValue={initial?.cantidad} placeholder="0" className="input-base w-full" /></div>
                            <div><label className="text-xs text-neutral-400 block mb-1">Precio unit. ($)</label>
                                <input name="precio_unitario" type="number" step="0.01" required defaultValue={initial?.precio_unitario} placeholder="0.00" className="input-base w-full" /></div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-neutral-400 font-medium uppercase tracking-wider block mb-1.5">% Dinámico</label>
                            <div className="relative">
                                <input name="porcentaje_dinam" type="number" step="0.01" min="0" max="100" required defaultValue={initial?.porcentaje_dinam} placeholder="25.00" className="input-base w-full pr-8" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">%</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-neutral-400 font-medium uppercase tracking-wider block mb-1.5">Fecha</label>
                            <input name="fecha" type="date" defaultValue={initial?.fecha} className="input-base w-full [color-scheme:dark]" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-neutral-400 font-medium uppercase tracking-wider block mb-1.5">Referencia</label>
                        <input name="referencia" defaultValue={initial?.referencia} placeholder="FC-0001-00012345" className="input-base w-full" />
                    </div>
                    <div className="pt-3 flex justify-end gap-2 border-t border-neutral-800/50">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors">Cancelar</button>
                        <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                            {loading ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Agregar Concepto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ── Modal Liquidación (crear / editar) ───────────────────────────────────────

function ModalLiquidacion({
    negId, initial, onClose, onSaved
}: { negId: string; initial?: any; onClose: () => void; onSaved: () => void }) {
    const isEdit = !!initial
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true); setError('')
        const fd = new FormData(e.currentTarget)
        try {
            const url = isEdit
                ? `/api/negociaciones/${negId}/liquidaciones?liquidacion_id=${initial.id}`
                : `/api/negociaciones/${negId}/liquidaciones`
            const res = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(fd))
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            onSaved(); onClose()
        } catch (err: any) { setError(err.message) }
        finally { setLoading(false) }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                    <h3 className="font-semibold text-white">{isEdit ? 'Editar Liquidación' : 'Registrar Liquidación'}</h3>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white"><X size={18} /></button>
                </div>
                {error && <div className="mx-4 mt-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-2 rounded">{error}</div>}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="text-xs text-neutral-400 font-medium uppercase tracking-wider block mb-1.5">Tipo</label>
                        <select name="tipo" required defaultValue={initial?.tipo || 'nc'} className="input-base w-full">
                            <option value="nc">📄 Nota de Crédito (NC)</option>
                            <option value="entrega_fisica">📦 Entrega Física</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs text-neutral-400 block mb-1">Monto ($)</label>
                            <input name="monto" type="number" step="0.01" required defaultValue={initial?.monto} placeholder="0.00" className="input-base w-full" /></div>
                        <div><label className="text-xs text-neutral-400 block mb-1">Fecha</label>
                            <input name="fecha" type="date" required defaultValue={initial?.fecha} className="input-base w-full [color-scheme:dark]" /></div>
                    </div>
                    <div>
                        <label className="text-xs text-neutral-400 block mb-1">Referencia (N° NC, remito...)</label>
                        <input name="referencia" defaultValue={initial?.referencia} placeholder="NC-0001-00001234" className="input-base w-full" />
                    </div>
                    <div>
                        <label className="text-xs text-neutral-400 block mb-1">Notas</label>
                        <textarea name="notas" rows={2} defaultValue={initial?.notas} placeholder="Observaciones..." className="input-base w-full resize-none" />
                    </div>
                    <div className="pt-3 flex justify-end gap-2 border-t border-neutral-800/50">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors">Cancelar</button>
                        <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                            {loading ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Registrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ── Sección de Comprobantes ──────────────────────────────────────────────────

function SeccionComprobantes({ negId }: { negId: string }) {
    const [files, setFiles] = useState<any[]>([])
    const [uploading, setUploading] = useState(false)
    const [loadingFiles, setLoadingFiles] = useState(true)
    const fileRef = useRef<HTMLInputElement>(null)

    const load = useCallback(async () => {
        setLoadingFiles(true)
        const res = await fetch(`/api/negociaciones/${negId}/comprobantes`)
        const data = await res.json()
        setFiles(Array.isArray(data) ? data : [])
        setLoadingFiles(false)
    }, [negId])

    useEffect(() => { load() }, [load])

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        const fd = new FormData()
        fd.append('file', file)
        await fetch(`/api/negociaciones/${negId}/comprobantes`, { method: 'POST', body: fd })
        await load()
        setUploading(false)
        if (fileRef.current) fileRef.current.value = ''
    }

    const deleteFile = async (path: string, name: string) => {
        if (!confirm(`¿Eliminar "${name}"?`)) return
        await fetch(`/api/negociaciones/${negId}/comprobantes?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
        await load()
    }

    const isImage = (name: string) => /\.(png|jpg|jpeg|gif|webp)$/i.test(name)
    const isPdf = (name: string) => /\.pdf$/i.test(name)

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                <h2 className="font-semibold text-white flex items-center gap-2">
                    <FileText size={16} className="text-amber-400" />
                    Comprobantes
                </h2>
                <div>
                    <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif" onChange={handleUpload} className="hidden" id="comprobante-upload" />
                    <label htmlFor="comprobante-upload" className={`cursor-pointer text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        {uploading ? 'Subiendo...' : 'Subir archivo'}
                    </label>
                </div>
            </div>

            {loadingFiles ? (
                <div className="p-6 text-center text-neutral-600 text-sm">Cargando...</div>
            ) : files.length === 0 ? (
                <div className="p-8 text-center text-neutral-600 text-sm">
                    No hay comprobantes adjuntos.
                    <br />
                    <span className="text-neutral-700 text-xs">PDF, PNG, JPG aceptados.</span>
                </div>
            ) : (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {files.map((f: any) => (
                        <div key={f.name} className="group relative bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden hover:border-amber-500/30 transition-colors">
                            {/* Preview */}
                            {isImage(f.name) && f.signedUrl ? (
                                <a href={f.signedUrl} target="_blank" rel="noopener noreferrer">
                                    <img src={f.signedUrl} alt={f.name} className="w-full h-28 object-cover" />
                                </a>
                            ) : (
                                <a href={f.signedUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center justify-center h-28 bg-neutral-900">
                                    {isPdf(f.name)
                                        ? <FileText size={36} className="text-red-400/60" />
                                        : <File size={36} className="text-neutral-600" />}
                                </a>
                            )}
                            {/* Footer */}
                            <div className="p-2 flex items-center justify-between gap-1">
                                <p className="text-[11px] text-neutral-400 truncate leading-tight flex-1" title={f.name}>
                                    {f.name.replace(/^\d+_/, '')}
                                </p>
                                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {f.signedUrl && (
                                        <a href={f.signedUrl} target="_blank" rel="noopener noreferrer"
                                            className="p-1 text-neutral-500 hover:text-amber-400 transition-colors">
                                            <ExternalLink size={13} />
                                        </a>
                                    )}
                                    <button onClick={() => deleteFile(f.path, f.name)}
                                        className="p-1 text-neutral-600 hover:text-red-400 transition-colors">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ── Página principal ─────────────────────────────────────────────────────────

export default function NegociacionDetallePage() {
    const { id } = useParams<{ id: string }>()
    const [neg, setNeg] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [conceptoModal, setConceptoModal] = useState<{ open: boolean; item?: any }>({ open: false })
    const [liquidModal, setLiquidModal] = useState<{ open: boolean; item?: any }>({ open: false })

    const reload = useCallback(() => {
        setLoading(true)
        fetch(`/api/negociaciones/${id}`)
            .then(r => r.json())
            .then(setNeg)
            .finally(() => setLoading(false))
    }, [id])

    useEffect(() => { reload() }, [reload])

    const deleteConcepto = async (cid: string) => {
        if (!confirm('¿Eliminar este concepto?')) return
        await fetch(`/api/negociaciones/${id}/conceptos?concepto_id=${cid}`, { method: 'DELETE' })
        reload()
    }

    const deleteLiquidacion = async (lid: string) => {
        if (!confirm('¿Eliminar esta liquidación?')) return
        await fetch(`/api/negociaciones/${id}/liquidaciones?liquidacion_id=${lid}`, { method: 'DELETE' })
        reload()
    }

    const toggleEstado = async () => {
        const nuevo = neg.estado === 'activa' ? 'cerrada' : 'activa'
        await fetch(`/api/negociaciones/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevo })
        })
        reload()
    }

    if (loading) return <div className="text-center py-16 text-neutral-500">Cargando...</div>
    if (!neg) return <div className="text-center py-16 text-red-400">No encontrado.</div>

    const saldo = neg.saldo_pendiente
    const saldoPositivo = saldo > 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <Link href="/negociaciones" className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white mt-0.5">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <p className="text-xs text-neutral-500 font-mono mb-0.5">{neg.proveedores?.codigo} — {neg.proveedores?.razon_social}</p>
                        <h1 className="text-2xl font-bold text-white">{neg.periodo}</h1>
                        {neg.descripcion && <p className="text-neutral-400 text-sm mt-0.5">{neg.descripcion}</p>}
                    </div>
                </div>
                <button onClick={toggleEstado}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${neg.estado === 'activa' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20' : 'text-neutral-500 border-neutral-700 bg-neutral-800 hover:bg-neutral-700'}`}>
                    {neg.estado}
                </button>
            </div>

            {/* Saldo Banner */}
            <div className={`rounded-xl border p-5 ${saldoPositivo ? 'bg-emerald-500/5 border-emerald-500/20' : saldo < 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-neutral-900 border-neutral-800'}`}>
                <div className="grid grid-cols-3 gap-6">
                    <div>
                        <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Crédito generado</p>
                        <p className="text-xl font-bold text-white">{fmt(neg.credito_total)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Liquidado</p>
                        <p className="text-xl font-bold text-neutral-300">{fmt(neg.liquidado_total)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Saldo pendiente</p>
                        <p className={`text-2xl font-bold flex items-center gap-2 ${saldoPositivo ? 'text-emerald-400' : saldo < 0 ? 'text-red-400' : 'text-neutral-400'}`}>
                            {saldoPositivo ? <TrendingUp size={20} /> : saldo < 0 ? <TrendingDown size={20} /> : <Minus size={20} />}
                            {fmt(saldo)}
                        </p>
                        <p className="text-xs mt-0.5 text-neutral-500">
                            {saldoPositivo ? '✅ El proveedor te debe' : saldo < 0 ? '⚠️ Le debés al proveedor' : '✔ Saldado'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Conceptos */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                    <h2 className="font-semibold text-white flex items-center gap-2">
                        <FileText size={16} className="text-indigo-400" />
                        Conceptos generadores de crédito
                    </h2>
                    <button onClick={() => setConceptoModal({ open: true })}
                        className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                        <Plus size={15} /> Agregar
                    </button>
                </div>
                {neg.conceptos.length === 0 ? (
                    <div className="p-8 text-center text-neutral-600 text-sm">No hay conceptos cargados.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-neutral-950/50 text-xs text-neutral-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3 text-left">Descripción</th>
                                    <th className="px-4 py-3 text-left">Tipo</th>
                                    <th className="px-4 py-3 text-right">Base</th>
                                    <th className="px-4 py-3 text-right">% Dinam</th>
                                    <th className="px-4 py-3 text-right text-indigo-400">Crédito</th>
                                    <th className="px-4 py-3 text-left">Referencia</th>
                                    <th className="px-4 py-3 text-center">Fecha</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/50">
                                {neg.conceptos.map((c: any) => {
                                    const base = c.tipo_base === 'monto_factura'
                                        ? fmt(c.monto_factura)
                                        : `${c.cantidad} u × ${fmt(c.precio_unitario)}`
                                    return (
                                        <tr key={c.id} className="hover:bg-neutral-800/20 group">
                                            <td className="px-4 py-3 text-neutral-200">{c.descripcion}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c.tipo_base === 'monto_factura' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                    {c.tipo_base === 'monto_factura' ? 'Factura' : 'Unidades'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-neutral-400 text-xs">{base}</td>
                                            <td className="px-4 py-3 text-right font-mono text-amber-400">{fmtPct(c.porcentaje_dinam)}</td>
                                            <td className="px-4 py-3 text-right font-mono font-semibold text-indigo-400">{fmt(c.credito_generado)}</td>
                                            <td className="px-4 py-3 text-neutral-500 text-xs font-mono">{c.referencia || '—'}</td>
                                            <td className="px-4 py-3 text-center text-xs text-neutral-500">
                                                {c.fecha ? format(new Date(c.fecha), 'd MMM yy', { locale: es }) : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setConceptoModal({ open: true, item: c })}
                                                        className="p-1 text-neutral-500 hover:text-indigo-400 transition-colors">
                                                        <Edit2 size={13} />
                                                    </button>
                                                    <button onClick={() => deleteConcepto(c.id)}
                                                        className="p-1 text-neutral-600 hover:text-red-400 transition-colors">
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Liquidaciones */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                    <h2 className="font-semibold text-white flex items-center gap-2">
                        <Package size={16} className="text-emerald-400" />
                        Liquidaciones (NC / Entregas físicas)
                    </h2>
                    <button onClick={() => setLiquidModal({ open: true })}
                        className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
                        <Plus size={15} /> Registrar
                    </button>
                </div>
                {neg.liquidaciones.length === 0 ? (
                    <div className="p-8 text-center text-neutral-600 text-sm">No hay liquidaciones registradas.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-neutral-950/50 text-xs text-neutral-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3 text-left">Tipo</th>
                                    <th className="px-4 py-3 text-left">Referencia</th>
                                    <th className="px-4 py-3 text-right text-emerald-400">Monto</th>
                                    <th className="px-4 py-3 text-center">Fecha</th>
                                    <th className="px-4 py-3 text-left">Notas</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/50">
                                {neg.liquidaciones.map((l: any) => (
                                    <tr key={l.id} className="hover:bg-neutral-800/20 group">
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${l.tipo === 'nc' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                {l.tipo === 'nc' ? '📄 NC' : '📦 Entrega'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono text-neutral-400">{l.referencia || '—'}</td>
                                        <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400">{fmt(l.monto)}</td>
                                        <td className="px-4 py-3 text-center text-xs text-neutral-500">
                                            {format(new Date(l.fecha), 'd MMM yy', { locale: es })}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-neutral-500">{l.notas || '—'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setLiquidModal({ open: true, item: l })}
                                                    className="p-1 text-neutral-500 hover:text-indigo-400 transition-colors">
                                                    <Edit2 size={13} />
                                                </button>
                                                <button onClick={() => deleteLiquidacion(l.id)}
                                                    className="p-1 text-neutral-600 hover:text-red-400 transition-colors">
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Comprobantes */}
            <SeccionComprobantes negId={id} />

            {/* Modales */}
            {conceptoModal.open && (
                <ModalConcepto
                    negId={id}
                    initial={conceptoModal.item}
                    onClose={() => setConceptoModal({ open: false })}
                    onSaved={reload}
                />
            )}
            {liquidModal.open && (
                <ModalLiquidacion
                    negId={id}
                    initial={liquidModal.item}
                    onClose={() => setLiquidModal({ open: false })}
                    onSaved={reload}
                />
            )}
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Upload, Download, CopyX, Search, Edit2, Play, Check, Calendar } from 'lucide-react'

export function ProveedorPanel({ proveedor }: { proveedor: any }) {
    const [activeTab, setActiveTab] = useState<'catalogo' | 'import'>('catalogo')

    const [catalogo, setCatalogo] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    // Edit State
    const [editingItem, setEditingItem] = useState<any>(null)
    const [editForm, setEditForm] = useState({ descripcion: '', precio_compra: '', bonif_total_pct: '' })
    const [savingEdit, setSavingEdit] = useState(false)

    // Fecha de lista
    const [fechaLista, setFechaLista] = useState<string>(proveedor.campos_plantilla?.fecha_lista || '')
    const [editingFecha, setEditingFecha] = useState(false)
    const [savingFecha, setSavingFecha] = useState(false)

    const saveFechaLista = async (nuevaFecha: string) => {
        setSavingFecha(true)
        try {
            const res = await fetch(`/api/proveedores/${proveedor.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campos_plantilla: {
                        ...proveedor.campos_plantilla,
                        fecha_lista: nuevaFecha || null
                    }
                })
            })
            if (res.ok) {
                setFechaLista(nuevaFecha)
                setEditingFecha(false)
            }
        } finally {
            setSavingFecha(false)
        }
    }

    // File Upload State
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [uploadStats, setUploadStats] = useState<any>(null)

    const fetchCatalogo = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/proveedores/${proveedor.id}/catalogo`)
            const data = await res.json()
            if (Array.isArray(data)) {
                setCatalogo(data)
            } else {
                console.error("Respuesta no es un array:", data)
                setCatalogo([])
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (activeTab === 'catalogo') {
            fetchCatalogo()
        }
    }, [activeTab, proveedor.id])

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return

        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('proveedor_id', proveedor.id)

        try {
            const res = await fetch('/api/import/maestro', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()
            if (res.ok) {
                setUploadStats(data.resumen)
                // Redirigir a vista de Diff con el job_id
                window.location.href = `/proveedores/${proveedor.id}/diff?job_id=${data.job_id}`
            } else {
                alert(data.error)
            }
        } catch (error) {
            console.error(error)
            alert("Error al subir archivo")
        } finally {
            setUploading(false)
        }
    }

    const [exporting, setExporting] = useState(false)

    const exportar = async () => {
        setExporting(true)
        try {
            const res = await fetch(`/api/export/sistemacoso?proveedor_id=${proveedor.id}&mode=vigentes`)
            if (!res.ok) {
                const data = await res.json()
                alert(`Error: ${data.error}`)
                setExporting(false)
                return
            }

            const blob = await res.blob()
            const disposition = res.headers.get('content-disposition')
            let filename = 'plantilla.xlsx'
            if (disposition && disposition.includes('filename="')) {
                filename = disposition.split('filename="')[1].split('"')[0]
            }

            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.style.display = 'none'
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (error) {
            console.error('Error al exportar:', error)
            alert('Error inesperado al exportar')
        } finally {
            setExporting(false)
        }
    }

    const openEditModal = (item: any) => {
        setEditingItem(item)
        setEditForm({
            descripcion: item.descripcion || '',
            precio_compra: item.precioVigente ? item.precioVigente.precio_compra : '',
            bonif_total_pct: item.precioVigente ? (Number(item.precioVigente.bonif_total_decimal) * 100).toString() : '0'
        })
    }

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingItem) return
        setSavingEdit(true)

        try {
            const res = await fetch(`/api/proveedores/${proveedor.id}/catalogo/${editingItem.sku}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            })

            if (res.ok) {
                setEditingItem(null)
                fetchCatalogo() // Reload data
            } else {
                const data = await res.json()
                alert(`Error: ${data.error}`)
            }
        } catch (error) {
            console.error('Error al editar:', error)
            alert('Error al guardar cambios')
        } finally {
            setSavingEdit(false)
        }
    }


    const filtered = catalogo.filter(c =>
        c.sku.toLowerCase().includes(search.toLowerCase()) ||
        c.descripcion?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">{proveedor.razon_social}</h1>
                        <p className="text-neutral-400 font-mono text-sm mt-0.5">{proveedor.codigo}</p>
                        {/* Fecha de lista */}
                        <div className="flex items-center gap-2 mt-1.5">
                            <Calendar size={12} className="text-indigo-400 shrink-0" />
                            {editingFecha ? (
                                <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); saveFechaLista(fd.get('fl') as string) }} className="flex items-center gap-1.5">
                                    <input
                                        name="fl"
                                        type="date"
                                        defaultValue={fechaLista}
                                        className="bg-neutral-800 border border-neutral-700 rounded px-2 py-0.5 text-xs text-white [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                    <button type="submit" disabled={savingFecha} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">
                                        {savingFecha ? '...' : 'OK'}
                                    </button>
                                    <button type="button" onClick={() => setEditingFecha(false)} className="text-xs text-neutral-500 hover:text-neutral-300">✕</button>
                                </form>
                            ) : (
                                <button onClick={() => setEditingFecha(true)} className="flex items-center gap-1 text-xs text-neutral-500 hover:text-indigo-400 transition-colors group">
                                    <span className="font-mono">
                                        {fechaLista ? `FECVIG: ${fechaLista}` : 'Sin fecha de lista'}
                                    </span>
                                    <Edit2 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href={`/proveedores/${proveedor.id}/diff`}
                        className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 border border-neutral-700"
                    >
                        <CopyX size={18} />
                        <span>Revisar Diferencias</span>
                    </Link>
                    <button
                        onClick={exportar}
                        disabled={exporting}
                        className="bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600 hover:text-white border border-emerald-500/50 hover:border-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
                    >
                        {exporting ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70"></div>
                        ) : (
                            <Download size={18} />
                        )}
                        <span>{exporting ? 'Exportando...' : 'Exportar Vigentes'}</span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-neutral-800 flex gap-6">
                <button
                    onClick={() => setActiveTab('catalogo')}
                    className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'catalogo' ? 'border-indigo-500 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
                >
                    Catálogo y Precios
                </button>
                <button
                    onClick={() => setActiveTab('import')}
                    className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'import' ? 'border-indigo-500 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
                >
                    Importar Maestro Excel
                </button>
            </div>

            {/* Content */}
            {activeTab === 'catalogo' && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar SKU o nombre..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                        <button className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors px-3 py-1.5 rounded-md hover:bg-indigo-500/10">
                            + Agregar SKU Manual
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-neutral-400">
                            <thead className="text-xs uppercase bg-neutral-950/50 text-neutral-500 font-semibold border-b border-neutral-800">
                                <tr>
                                    <th className="px-4 py-3">SKU</th>
                                    <th className="px-4 py-3">Descripción</th>
                                    <th className="px-4 py-3 text-right">Precio Compra (CC)</th>
                                    <th className="px-4 py-3 text-right">Bonif (CR)</th>
                                    <th className="px-4 py-3 text-right text-indigo-400">Neto (Calculado)</th>
                                    <th className="px-4 py-3 text-center">Estado</th>
                                    <th className="px-4 py-3 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/50">
                                {loading ? (
                                    <tr><td colSpan={7} className="text-center py-8">Cargando catálogo...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-8">No hay productos en el catálogo de este proveedor.</td></tr>
                                ) : (
                                    filtered.map(item => {
                                        const precio = item.precioVigente
                                        return (
                                            <tr key={item.sku} className="hover:bg-neutral-800/20 transition-colors group">
                                                <td className="px-4 py-3 font-mono text-neutral-300">{item.sku}</td>
                                                <td className="px-4 py-3 max-w-[200px] truncate" title={item.descripcion}>{item.descripcion}</td>
                                                <td className="px-4 py-3 text-right text-neutral-300">
                                                    {precio ? `$${Number(precio.precio_compra).toFixed(2)}` : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right text-amber-500">
                                                    {precio ? `${(Number(precio.bonif_total_decimal) * 100).toFixed(2)}%` : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-indigo-400">
                                                    {precio ? `$${Number(precio.neto_bonificado).toFixed(2)}` : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {precio ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-bold tracking-wider">
                                                            <Check size={12} /> Vigente
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 rounded bg-neutral-800 text-neutral-500 text-[10px] uppercase font-bold tracking-wider">Sin Precio</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => openEditModal(item)}
                                                            className="p-1.5 text-neutral-400 hover:text-indigo-400 bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
                                                            title="Editar Precio Manual"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'import' && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-2xl">
                    <h3 className="text-lg font-semibold text-white mb-2">Importar Excel Maestro</h3>
                    <p className="text-neutral-400 text-sm mb-6">Sube el archivo Excel provisto por el proveedor para actualizar los precios y el catálogo de forma masiva en estado "Candidato".</p>

                    <form onSubmit={handleUpload} className="space-y-6">
                        <div className="border-2 border-dashed border-neutral-700 hover:border-indigo-500/50 rounded-xl p-8 text-center transition-colors">
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="hidden"
                                id="file-upload"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3">
                                <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center text-indigo-400">
                                    <Upload size={24} />
                                </div>
                                <span className="text-white font-medium">{file ? file.name : 'Seleccionar Archivo Excel'}</span>
                                <span className="text-sm text-neutral-500">Solo archivos .xlsx soportados</span>
                            </label>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={!file || uploading}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                {uploading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <Play size={18} />
                                )}
                                <span>{uploading ? 'Procesando...' : 'Iniciar Importación'}</span>
                            </button>
                        </div>
                    </form>

                    {uploadStats && (
                        <div className="mt-8 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                            <h4 className="text-emerald-400 font-semibold mb-2">Resumen de Importación</h4>
                            <ul className="text-sm text-emerald-200 space-y-1">
                                <li>Filas leidas: {uploadStats.rowCount}</li>
                                <li>Filas exitosas: {uploadStats.okCount}</li>
                                <li>Errores: {uploadStats.errorCount}</li>
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Edición Múltiple */}
            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-neutral-800 bg-neutral-950/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-semibold text-white">Editar Producto</h3>
                                <p className="text-sm font-mono text-indigo-400">{editingItem.sku}</p>
                            </div>
                            <button onClick={() => setEditingItem(null)} className="text-neutral-500 hover:text-white p-1">
                                <CopyX size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Descripción</label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.descripcion}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, descripcion: e.target.value }))}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Costo (CC)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={editForm.precio_compra}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, precio_compra: e.target.value }))}
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Bonific (%)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={editForm.bonif_total_pct}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, bonif_total_pct: e.target.value }))}
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-3 pr-8 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">%</span>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingItem(null)}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                    {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

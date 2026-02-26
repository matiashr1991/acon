'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Edit2, Save, X, Database, ChevronLeft, ChevronRight, FileDown, Search, GitMerge, AlertCircle } from 'lucide-react'

export default function GlobalDataViewPage() {
    // ... truncating rest so doing replace specifically on sections...

    // It's better to do multiple `replace_file_content` or `multi_replace_file_content`.
    const [rows, setRows] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [meta, setMeta] = useState<any>({ total: 0, totalPages: 1 })
    const [exporting, setExporting] = useState(false)

    // Edit State
    const [editingRowId, setEditingRowId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<any>({})
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const limit = 50

    const fetchRows = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/excel-limpiador/records?page=${page}&limit=${limit}`)
            if (res.ok) {
                const data = await res.json()
                setRows(data.data)
                setMeta(data.meta)
            } else {
                setError('Error al cargar datos')
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRows()
    }, [page])

    const handleExportGlobal = async () => {
        setExporting(true);
        setError(null);
        try {
            const res = await fetch('/api/excel-limpiador/export-global');
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al exportar');
            }

            const link = document.createElement("a");
            link.href = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + data.file_base64;
            link.download = data.file_name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setExporting(false);
        }
    }

    const handleEditStart = (row: any) => {
        setEditingRowId(row.id)
        setEditForm({ ...row })
    }

    const handleEditCancel = () => {
        setEditingRowId(null)
        setEditForm({})
    }

    const handleEditSave = async () => {
        setSaving(true)
        setError(null)
        try {
            const res = await fetch(`/api/excel-limpiador/records/${editingRowId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            })

            if (res.ok) {
                const updatedRow = await res.json()
                setRows(rows.map(r => r.id === updatedRow.id ? updatedRow : r))
                setEditingRowId(null)
            } else {
                setError('Error al guardar registro')
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    const COLUMNS = [
        // Identidad (Metadata util para el usuario saber de donde viene la fila)
        { id: 'periodo_cod', label: 'Cód Período', type: 'text' },
        { id: 'cliente_cod', label: 'Cód Cliente', type: 'text' },
        { id: 'sucursal', label: 'Sucursal', type: 'text' },
        { id: 'codigo', label: 'Código Prod', type: 'text' },
        { id: 'vendedor', label: 'Vendedor', type: 'text' },
        // Resto
        { id: 'desc_producto', label: 'Desc. Producto', type: 'text' },
        { id: 'ramo', label: 'Ramo', type: 'text' },
        { id: 'desc_ramo', label: 'Desc. Ramo', type: 'text' },
        { id: 'desc_vendedor', label: 'Desc. Vendedor', type: 'text' },
        { id: 'marca', label: 'Marca', type: 'text' },
        { id: 'desc_marca', label: 'Desc. Marca', type: 'text' },
        { id: 'unidad_negocio', label: 'UN', type: 'text' },
        { id: 'desc_unidad_negocio', label: 'Desc. UN', type: 'text' },
        { id: 'precio', label: 'Precio', type: 'number' },
        { id: 'bonific', label: 'Bonific', type: 'number' },
        { id: 'pr_neto', label: 'Pr Neto', type: 'number' },
        { id: 'cant_totales', label: 'Cantidades', type: 'number' },
        { id: 'importes_netos', label: 'Imp. Netos', type: 'number' },
        { id: 'importes_finales', label: 'Imp. Finales', type: 'number' },
    ];

    return (
        <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
            <header className="flex items-center justify-between shrink-0 bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
                <div className="flex items-center gap-4">
                    <Link href="/importador" className="p-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-neutral-400 hover:text-white transition-all shadow-sm">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent flex items-center gap-3">
                            <Database size={28} className="text-blue-500" />
                            Base de Datos Histórica
                        </h1>
                        <p className="text-neutral-400 text-sm mt-1">
                            Consulta, edita y consolida todas tus facturaciones subidas. Total de filas procesadas: <strong className="text-emerald-400">{meta.total}</strong>
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <Link
                        href="/cruce-proveedor"
                        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-indigo-900/20 active:scale-95"
                    >
                        <GitMerge size={18} />
                        Cruce Proveedor
                    </Link>
                    <button
                        onClick={handleExportGlobal}
                        disabled={exporting || rows.length === 0}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                    >
                        {exporting ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
                        Exportar Todo a Excel
                    </button>
                </div>
            </header>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-sm shrink-0 flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col flex-1 shadow-xl">
                {/* Herramientas de tabla */}
                <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar en la vista actual..."
                            className="bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
                            disabled
                        />
                        <span className="text-xs text-neutral-600 absolute right-3 top-1/2 -translate-y-1/2">Pronto</span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-neutral-400 font-medium">
                        <span>Pág. {page} de {meta.totalPages || 1}</span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-lg bg-neutral-800 disabled:opacity-50 hover:bg-neutral-700 text-white transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={page >= meta.totalPages}
                                className="p-2 rounded-lg bg-neutral-800 disabled:opacity-50 hover:bg-neutral-700 text-white transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto relative custom-scrollbar">
                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/60 z-20 backdrop-blur-sm">
                            <Loader2 size={40} className="animate-spin text-blue-500 mb-4" />
                            <span className="text-neutral-400 font-medium">Cargando registros...</span>
                        </div>
                    ) : null}

                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="text-xs text-neutral-400 uppercase bg-neutral-950 border-b border-neutral-800 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-5 py-4 font-semibold text-center w-16 sticky left-0 bg-neutral-950 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">🛠️</th>
                                {COLUMNS.map(col => (
                                    <th key={col.id} className={`px-5 py-4 font-semibold ${col.type === 'number' ? 'text-right' : ''}`}>
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800/50">
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={COLUMNS.length + 1} className="px-6 py-24 text-center">
                                        <Database size={48} className="mx-auto text-neutral-700 mb-4" />
                                        <p className="text-lg text-neutral-400 font-medium">La base de datos está vacía</p>
                                        <p className="text-neutral-500 mt-1">Sube archivos desde el Gestor de Facturación para verlos aquí.</p>
                                    </td>
                                </tr>
                            ) : rows.map((row) => {
                                const isEditing = editingRowId === row.id;
                                return (
                                    <tr key={row.id} className={`group hover:bg-neutral-800/40 transition-colors ${isEditing ? 'bg-blue-900/10' : ''}`}>
                                        <td className="px-4 py-2 text-center border-r border-neutral-800/50 sticky left-0 bg-neutral-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.2)]">
                                            {isEditing ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={handleEditSave} disabled={saving} className="text-emerald-400 hover:text-emerald-300 bg-emerald-400/10 hover:bg-emerald-400/20 px-2 py-1.5 rounded-md disabled:opacity-50 transition-colors" title="Guardar cambios">
                                                        <Save size={16} />
                                                    </button>
                                                    <button onClick={handleEditCancel} disabled={saving} className="text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-2 py-1.5 rounded-md disabled:opacity-50 transition-colors" title="Descartar">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleEditStart(row)} className="text-neutral-500 group-hover:text-blue-400 transition-colors p-1.5 bg-neutral-800/20 hover:bg-blue-500/10 rounded-md" title="Editar Fila">
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                        </td>

                                        {COLUMNS.map(col => {
                                            if (isEditing) {
                                                return (
                                                    <td key={col.id} className="px-3 py-1.5">
                                                        <input
                                                            type={col.type === 'number' ? 'number' : 'text'}
                                                            step={col.type === 'number' ? '0.01' : undefined}
                                                            className={`w-full min-w-[140px] bg-neutral-950 border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.1)] rounded-md px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all ${col.type === 'number' ? 'text-right' : ''}`}
                                                            value={editForm[col.id] === null || editForm[col.id] === undefined ? '' : editForm[col.id]}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                setEditForm({
                                                                    ...editForm,
                                                                    [col.id]: val === '' ? null : (col.type === 'number' ? parseFloat(val) : val)
                                                                })
                                                            }}
                                                        />
                                                    </td>
                                                )
                                            } else {
                                                let displayVal = row[col.id];
                                                if (displayVal === null || displayVal === undefined) displayVal = '-';
                                                else if (col.type === 'number') {
                                                    displayVal = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(displayVal);
                                                }
                                                return (
                                                    <td key={col.id} className={`px-5 py-3 ${col.type === 'number' ? 'text-right font-mono tabular-nums text-neutral-300' : 'text-neutral-400'} group-hover:text-neutral-200 transition-colors`}>
                                                        {displayVal}
                                                    </td>
                                                )
                                            }
                                        })}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(23, 23, 23, 1);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(82, 82, 82, 1);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(115, 115, 115, 1);
                }
            `}</style>
        </div>
    )
}

'use client'

import { useState } from 'react'
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, Download, GitMerge } from 'lucide-react'

export default function EdeloroMergePage() {
    const [fileA, setFileA] = useState<File | null>(null)
    const [filesB, setFilesB] = useState<File[]>([])

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<{
        success: boolean;
        file_base64: string;
        file_name: string;
    } | null>(null)

    const handleFileAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFileA(e.target.files[0])
            resetState()
        }
    }

    const handleFileBChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFilesB(Array.from(e.target.files))
            resetState()
        }
    }

    const resetState = () => {
        setError(null)
        setResult(null)
    }

    const handleProcess = async () => {
        if (!fileA || filesB.length === 0) return
        setLoading(true)
        resetState()

        const formData = new FormData()
        formData.append('fileA', fileA)
        filesB.forEach(f => formData.append('fileB', f))

        try {
            const res = await fetch('/api/excel-merger/process', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Error al procesar los archivos')
            } else {
                setResult(data)
            }
        } catch (err: any) {
            setError(err.message || 'Error de red')
        } finally {
            setLoading(false)
        }
    }

    const handleDownload = () => {
        if (!result) return;
        const link = document.createElement("a");
        link.href = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + result.file_base64;
        link.download = result.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const handleResetAll = () => {
        setFileA(null);
        setFilesB([]);
        resetState();
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-br from-neutral-900 via-neutral-900 to-indigo-950/20 p-8 rounded-3xl border border-neutral-800 shadow-xl shadow-black/20">
                <div>
                    <h1 className="text-4xl font-black bg-gradient-to-r from-white via-white to-indigo-300 bg-clip-text text-transparent flex items-center gap-4">
                        <GitMerge className="text-indigo-500" size={40} />
                        Cruce VENTAS + PROVEEDOR
                    </h1>
                    <p className="text-neutral-400 mt-3 text-lg leading-relaxed">
                        Herramienta de cruce agnóstica. Sube tu exportación de Ventas limpias y la matriz de Costco/Precios de cualquier PROVEEDOR con el formato estándar.
                    </p>
                </div>
            </header>

            {!result ? (
                <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800/80 rounded-3xl p-10 shadow-2xl space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* File A Box */}
                        <div
                            className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300
                            ${fileA ? 'border-emerald-500 bg-emerald-500/5 shadow-[inset_0_0_30px_rgba(16,185,129,0.05)]' : 'border-neutral-700 hover:border-neutral-500 bg-neutral-950/50 hover:bg-neutral-950/80 group'}`}
                        >
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFileAChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="flex flex-col items-center justify-center pointer-events-none relative z-0">
                                <UploadCloud size={40} className={`mb-4 ${fileA ? 'text-emerald-400' : 'text-neutral-500'}`} />
                                <h3 className="text-lg font-bold text-white mb-2">Archivo A: Ventas (Limpias)</h3>
                                <p className="text-sm text-neutral-400 line-clamp-2">
                                    {fileA ? <span className="text-emerald-400 font-medium">{fileA.name}</span> : 'Arrastra el XLSX de Ventas aquí'}
                                </p>
                            </div>
                        </div>

                        {/* File B Box */}
                        <div
                            className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300
                            ${filesB.length > 0 ? 'border-indigo-500 bg-indigo-500/5 shadow-[inset_0_0_30px_rgba(99,102,241,0.05)]' : 'border-neutral-700 hover:border-neutral-500 bg-neutral-950/50 hover:bg-neutral-950/80 group'}`}
                        >
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                multiple
                                onChange={handleFileBChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="flex flex-col items-center justify-center pointer-events-none relative z-0">
                                <UploadCloud size={40} className={`mb-4 ${filesB.length > 0 ? 'text-indigo-400' : 'text-neutral-500'}`} />
                                <h3 className="text-lg font-bold text-white mb-2">Archivo(s) B: Matriz Proveedor</h3>
                                <div className="text-sm text-neutral-400">
                                    {filesB.length > 0 ? (
                                        <div className="flex flex-col gap-1">
                                            {filesB.map((f, i) => (
                                                <span key={i} className="text-indigo-400 font-medium truncate max-w-[200px]">{f.name}</span>
                                            ))}
                                        </div>
                                    ) : (
                                        'Arrastra uno o más XLSX aquí'
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-xl flex items-start gap-4 text-red-400">
                            <AlertCircle size={24} className="shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-red-300 mb-1">Error de procesamiento</h4>
                                <div className="text-sm opacity-90">{error}</div>
                            </div>
                        </div>
                    )}

                    <div className="pt-6 flex justify-end">
                        <button
                            onClick={handleProcess}
                            disabled={!fileA || filesB.length === 0 || loading}
                            className={`px-10 py-4 rounded-xl font-bold transition-all flex items-center gap-3 text-lg
                            ${(!fileA || filesB.length === 0) || loading
                                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:-translate-y-1 text-white active:scale-95'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={24} className="animate-spin" />
                                    <span>Cruzando Archivos...</span>
                                </>
                            ) : (
                                <>
                                    <GitMerge size={24} />
                                    <span>Generar Excel Enriquecido</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-gradient-to-b from-indigo-900/20 to-neutral-900 border border-indigo-500/30 rounded-3xl p-16 text-center space-y-10 shadow-[0_0_60px_-15px_rgba(99,102,241,0.2)] relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />

                    <div className="mx-auto w-28 h-28 rounded-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border-2 border-indigo-400/50 relative z-10 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                        <CheckCircle2 size={56} className="text-indigo-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                    </div>

                    <div className="relative z-10 space-y-4">
                        <h2 className="text-4xl font-black text-white">¡Cruce Exitoso!</h2>
                        <p className="text-neutral-400 text-xl max-w-2xl mx-auto leading-relaxed">
                            El archivo fue enriquecido con los campos de la Lista 1 de Edeloro y los cálculos solicitados.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-6 pt-6 relative z-10">
                        <button
                            onClick={handleDownload}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-5 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 text-lg hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:-translate-y-1 active:scale-95 border border-indigo-400/50"
                        >
                            <Download size={26} />
                            <span>Descargar Archivo C (Enriquecido)</span>
                        </button>

                        <button
                            onClick={handleResetAll}
                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-10 py-5 rounded-2xl font-semibold transition-all flex items-center justify-center border border-neutral-700 hover:border-neutral-500 hover:-translate-y-1 active:scale-95"
                        >
                            Hacer nuevo cruce
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

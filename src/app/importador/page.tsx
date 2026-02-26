'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, Download, FileSpreadsheet, Database, PlayCircle, GitMerge } from 'lucide-react'

export default function ExcelCleanerPage() {
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<{
        success: boolean;
        job_id: string;
        total_extracted: number;
        file_base64: string;
        file_name: string;
    } | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0])
            setError(null)
            setResult(null)
        }
    }

    const handleProcess = async () => {
        if (!file) return
        setLoading(true)
        setError(null)
        setResult(null)

        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/excel-limpiador/process', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Error al procesar el archivo')
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

    const handleReset = () => {
        setFile(null);
        setResult(null);
        setError(null);
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-br from-neutral-900 via-neutral-900 to-blue-950/20 p-8 rounded-3xl border border-neutral-800 shadow-xl shadow-black/20">
                <div>
                    <h1 className="text-4xl font-black bg-gradient-to-r from-white via-white to-blue-300 bg-clip-text text-transparent flex items-center gap-4">
                        <FileSpreadsheet className="text-blue-500" size={40} />
                        Gestor de Facturación
                    </h1>
                    <p className="text-neutral-400 mt-3 text-lg max-w-2xl leading-relaxed">
                        Sube uno o múltiples archivos Excel de facturación. El sistema extraerá y consolidará los datos automáticamente, identificando y actualizando registros existentes gracias al motor anti-duplicados.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                    <Link
                        href="/cruce-proveedor"
                        className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-3 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 px-6 py-4 rounded-xl font-semibold transition-all border border-indigo-500/20 hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] group"
                    >
                        <GitMerge size={22} className="group-hover:scale-110 transition-transform" />
                        Cruzar con Proveedor
                    </Link>
                    <Link
                        href="/importador/datos"
                        className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-6 py-4 rounded-xl font-semibold transition-all border border-blue-500/20 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] group"
                    >
                        <Database size={22} className="group-hover:scale-110 transition-transform" />
                        Base de Datos Global
                    </Link>
                </div>
            </header>

            {!result ? (
                <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800/80 rounded-3xl p-10 shadow-2xl">
                    <div
                        className={`relative border-2 border-dashed rounded-2xl p-20 text-center transition-all duration-300
                        ${file ? 'border-blue-500 bg-blue-500/5 shadow-[inset_0_0_30px_rgba(59,130,246,0.05)]' : 'border-neutral-700 hover:border-neutral-500 bg-neutral-950/50 hover:bg-neutral-950/80 group'}`}
                    >
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex flex-col items-center justify-center pointer-events-none relative z-0">
                            <div className={`p-6 rounded-full mb-6 transition-colors duration-300 ${file ? 'bg-blue-500/20' : 'bg-neutral-800 group-hover:bg-neutral-700'}`}>
                                <UploadCloud size={48} className={file ? 'text-blue-400' : 'text-neutral-400'} />
                            </div>

                            <h3 className="text-2xl font-bold text-white mb-3">
                                {file ? file.name : 'Arrastra tu archivo Excel mensual aquí'}
                            </h3>
                            <p className="text-neutral-500 text-lg">
                                {file ? (
                                    <span className="text-blue-400/80 font-medium">Peso del archivo: {(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                ) : (
                                    <>O <span className="text-blue-400 underline decoration-blue-500/30 underline-offset-4">explora tus archivos</span> (Solo .xlsx o .xls)</>
                                )}
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-8 bg-red-500/10 border border-red-500/20 p-5 rounded-xl flex items-start gap-4 text-red-400">
                            <AlertCircle size={24} className="shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-red-300 mb-1">El documento no pudo ser procesado</h4>
                                <div className="text-sm opacity-90">{error}</div>
                            </div>
                        </div>
                    )}

                    <div className="mt-10 flex justify-end">
                        <button
                            onClick={handleProcess}
                            disabled={!file || loading}
                            className={`px-10 py-4 rounded-xl font-bold transition-all flex items-center gap-3 text-lg
                            ${!file || loading
                                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:-translate-y-1 text-white active:scale-95'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={24} className="animate-spin" />
                                    <span>Procesando archivo e insertando en DB...</span>
                                </>
                            ) : (
                                <>
                                    <PlayCircle size={24} />
                                    <span>Comenzar Extracción</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-gradient-to-b from-blue-900/20 to-neutral-900 border border-blue-500/30 rounded-3xl p-16 text-center space-y-10 shadow-[0_0_60px_-15px_rgba(59,130,246,0.2)] relative overflow-hidden">
                    {/* Background glow element */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />

                    <div className="mx-auto w-28 h-28 rounded-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border-2 border-blue-400/50 relative z-10 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                        <CheckCircle2 size={56} className="text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                    </div>

                    <div className="relative z-10 space-y-4">
                        <h2 className="text-4xl font-black text-white">¡Facturación Importada!</h2>
                        <p className="text-neutral-400 text-xl max-w-2xl mx-auto leading-relaxed">
                            Se consolidaron exitosamente <strong className="text-white font-bold bg-neutral-800 px-3 py-1 rounded-md">{result.total_extracted}</strong> filas del archivo. Los duplicados fueron detectados y actualizados automáticamente en la memoria global.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-6 pt-6 relative z-10">
                        <button
                            onClick={handleDownload}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 text-lg hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:-translate-y-1 active:scale-95 border border-blue-400/50"
                        >
                            <Download size={26} />
                            <span>Descargar Excel Limpio de este mes</span>
                        </button>

                        <button
                            onClick={handleReset}
                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-10 py-5 rounded-2xl font-semibold transition-all flex items-center justify-center border border-neutral-700 hover:border-neutral-500 hover:-translate-y-1 active:scale-95"
                        >
                            Importar Siguiente Mes
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus, ArrowRight, PackageOpen, FileSpreadsheet,
  TrendingUp, Package, BarChart3, Clock
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'

// ── Tipos ──────────────────────────────────────────────────────────────────
interface Analytics {
  kpis: {
    totalVigentes: number
    totalProveedores: number
    totalHistoricos: number
    promedioNeto: number
    promedioBonif: number
    cambiosMes: number
  }
  evolucionMensual: { mes: string; avg_precio: number; avg_neto: number; registros: number }[]
  distribucionBonif: { rango: string; cantidad: number }[]
}

interface Proveedor { id: string; razon_social: string; codigo: string; created_at: string; proveedor_productos: { count: number }[] }
interface ImportJob { id: string; filename: string; status: string; started_at: string; proveedores: { razon_social: string } }

const fmt = (n: number) => new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

// ── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-neutral-500 mt-1">{sub}</p>}
    </div>
  )
}

// ── Tooltip customizado ────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-xs shadow-xl">
      <p className="text-neutral-400 mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-neutral-300">{p.name}:</span>
          <span className="text-white font-mono font-medium">
            {typeof p.value === 'number' && p.dataKey !== 'registros' ? `$${fmt(p.value)}` : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────
export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [recentImports, setRecentImports] = useState<ImportJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics').then(r => r.json()),
      fetch('/api/proveedores').then(r => r.json()),
    ]).then(([an, provs]) => {
      setAnalytics(an)
      setProveedores(Array.isArray(provs) ? provs : [])
    }).finally(() => setLoading(false))
  }, [])

  const kpis = analytics?.kpis

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-neutral-400 mt-1">Analítica de precios y estado general del sistema.</p>
        </div>
        <Link
          href="/proveedores/nuevo"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          <span>Nuevo Proveedor</span>
        </Link>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Productos vigentes"
          value={loading ? '—' : (kpis?.totalVigentes ?? 0).toLocaleString('es-AR')}
          sub={`${kpis?.cambiosMes ?? 0} nuevos este mes`}
          icon={Package}
          color="bg-indigo-500/20 text-indigo-400"
        />
        <KpiCard
          label="Proveedores"
          value={loading ? '—' : String(kpis?.totalProveedores ?? 0)}
          sub="registrados activos"
          icon={PackageOpen}
          color="bg-violet-500/20 text-violet-400"
        />
        <KpiCard
          label="Promedio neto bonif."
          value={loading ? '—' : `$${fmt(kpis?.promedioNeto ?? 0)}`}
          sub={`${kpis?.promedioBonif?.toFixed(1) ?? 0}% bonif. promedio`}
          icon={TrendingUp}
          color="bg-emerald-500/20 text-emerald-400"
        />
        <KpiCard
          label="Registros históricos"
          value={loading ? '—' : (kpis?.totalHistoricos ?? 0).toLocaleString('es-AR')}
          sub="en base de datos"
          icon={BarChart3}
          color="bg-amber-500/20 text-amber-400"
        />
      </div>

      {/* Gráficos */}
      {analytics && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Gráfico 1: Evolución mensual */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-base font-semibold text-white mb-1">Evolución mensual de precios</h2>
            <p className="text-xs text-neutral-500 mb-5">Promedio precio unitario vs. neto bonificado</p>
            {analytics.evolucionMensual.length < 2 ? (
              <div className="h-48 flex items-center justify-center text-neutral-600 text-sm">
                Se necesitan datos de al menos 2 meses para mostrar el gráfico.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={analytics.evolucionMensual} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="mes" tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${Math.round(v)}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#a3a3a3' }} />
                  <Line type="monotone" dataKey="avg_precio" name="Precio unitario" stroke="#818cf8" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="avg_neto" name="Neto bonificado" stroke="#34d399" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Gráfico 2: Distribución de bonificaciones */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-base font-semibold text-white mb-1">Distribución de bonificaciones</h2>
            <p className="text-xs text-neutral-500 mb-5">Cantidad de SKUs vigentes por rango de bonificación</p>
            {analytics.distribucionBonif.every(d => d.cantidad === 0) ? (
              <div className="h-48 flex items-center justify-center text-neutral-600 text-sm">
                No hay productos vigentes para mostrar.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.distribucionBonif} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis dataKey="rango" tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="cantidad" name="SKUs" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Proveedores + Imports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Proveedores */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <PackageOpen size={18} className="text-indigo-400" />
              Proveedores
            </h2>
            <Link href="/proveedores" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">Ver todos →</Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {proveedores.map((prov: any) => (
              <Link key={prov.id} href={`/proveedores/${prov.id}`}>
                <div className="bg-neutral-900 border border-neutral-800 hover:border-indigo-500/50 rounded-xl p-5 transition-all duration-200 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none" />
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">{prov.razon_social}</h3>
                      <p className="text-xs font-mono text-neutral-500 mt-0.5">{prov.codigo}</p>
                    </div>
                    <ArrowRight size={16} className="text-neutral-600 group-hover:text-indigo-400 transition-all group-hover:translate-x-0.5" />
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-neutral-800/50">
                    <span className="text-xs text-neutral-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                      {prov.proveedor_productos?.[0]?.count || 0} productos
                    </span>
                    <span className="text-xs text-neutral-500">
                      {format(new Date(prov.created_at), 'd MMM', { locale: es })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}

            {loading && (
              <div className="col-span-full py-10 text-center text-neutral-600 text-sm">Cargando...</div>
            )}
            {!loading && proveedores.length === 0 && (
              <div className="col-span-full py-10 text-center border border-dashed border-neutral-800 rounded-xl text-neutral-500 text-sm">
                No hay proveedores registrados aún.
              </div>
            )}
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Clock size={18} className="text-indigo-400" />
            Accesos rápidos
          </h2>
          <div className="space-y-2">
            {[
              { label: 'Ver Catálogo Global', href: '/catalogo', icon: BarChart3, desc: 'Todos los productos vigentes' },
              { label: 'Ver Historial', href: '/historial', icon: Clock, desc: 'Evolución de precios' },
              { label: 'Proveedores', href: '/proveedores', icon: PackageOpen, desc: 'Gestionar catálogos' },
            ].map(item => (
              <Link key={item.href} href={item.href}>
                <div className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-4 flex items-center gap-3 transition-all group">
                  <div className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0 group-hover:bg-indigo-600/20 transition-colors">
                    <item.icon size={16} className="text-neutral-400 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="text-xs text-neutral-500">{item.desc}</p>
                  </div>
                  <ArrowRight size={14} className="text-neutral-700 group-hover:text-indigo-400 ml-auto shrink-0 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

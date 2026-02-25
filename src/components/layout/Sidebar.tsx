'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Package, FileSpreadsheet, Settings, LayoutGrid, History, Handshake, BarChart2 } from 'lucide-react'

export function Sidebar() {
    const pathname = usePathname()

    const navItems = [
        { name: 'Dashboard', href: '/', icon: Home },
        { name: 'Proveedores', href: '/proveedores', icon: Package },
        { name: 'Catálogo Global', href: '/catalogo', icon: LayoutGrid },
        { name: 'Historial', href: '/historial', icon: History },
        { name: 'Ventas', href: '/ventas', icon: BarChart2 },
        { name: 'Negociaciones', href: '/negociaciones', icon: Handshake },
        { name: 'Importar Múltiple', href: '/import', icon: FileSpreadsheet },
        { name: 'Ajustes', href: '/settings', icon: Settings },
    ]

    return (
        <div className="w-64 h-screen bg-neutral-950 text-neutral-300 border-r border-neutral-800 flex flex-col fixed left-0 top-0">
            <div className="h-16 flex items-center px-6 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xl">S</div>
                    <span className="text-white font-bold text-lg tracking-tight">Sistemacoso Sync</span>
                </div>
            </div>

            <div className="flex-1 py-6 flex flex-col gap-2 px-3">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                    const Icon = item.icon

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
                ${isActive ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-neutral-900 hover:text-white'}
              `}
                        >
                            <Icon size={18} className={`transition-colors ${isActive ? 'text-indigo-400' : 'text-neutral-500 group-hover:text-neutral-300'}`} />
                            <span className="font-medium text-sm">{item.name}</span>
                        </Link>
                    )
                })}
            </div>

            <div className="p-4 border-t border-neutral-800">
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800">
                    <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center">
                        <span className="text-xs font-medium text-neutral-400">SA</span>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-white">Super Admin</p>
                        <p className="text-[10px] text-neutral-500">Administrador</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/service'

const BASE = process.env.CHESS_BASE_URL!
const CHESS_USER = process.env.CHESS_USER!
const CHESS_PASSWORD = process.env.CHESS_PASSWORD!
const ID_EMPRESA = Number(process.env.CHESS_ID_EMPRESA || '522')

// ── Helpers ──────────────────────────────────────────────────────────────────

async function chessLogin(): Promise<string> {
    const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: CHESS_USER, password: CHESS_PASSWORD }),
    })
    if (!res.ok) throw new Error(`Chess login HTTP ${res.status}`)
    const cookie = res.headers.get('set-cookie') || ''
    const match = cookie.match(/JSESSIONID=[^;]+/)
    if (!match) throw new Error('No JSESSIONID en la cookie de login')
    return match[0]
}

async function chessGet(cookie: string, path: string) {
    const res = await fetch(`${BASE}${path}`, {
        headers: { Cookie: cookie, Accept: 'application/json' },
        cache: 'no-store',
    })
    const text = await res.text()
    let data: any = null
    try { data = JSON.parse(text) } catch { data = text }
    return { status: res.status, data }
}

function extractItems(data: any): any[] {
    if (Array.isArray(data)) return data
    // Chess ERP: { dsReporteComprobantesApi: { VentasResumen: [...] } }
    if (data?.dsReporteComprobantesApi?.VentasResumen && Array.isArray(data.dsReporteComprobantesApi.VentasResumen))
        return data.dsReporteComprobantesApi.VentasResumen
    if (data && Array.isArray(data.dsReporteComprobantesApi)) return data.dsReporteComprobantesApi
    if (data && Array.isArray(data.items)) return data.items
    if (data && Array.isArray(data.data)) return data.data
    if (data && Array.isArray(data.ventas)) return data.ventas
    return []
}

const safeDate = (v: any) => {
    if (!v) return null
    const s = String(v)
    return s.includes('T') ? s.split('T')[0] : s
}

function normalizeHeader(item: any, runId: string) {
    return {
        run_id: runId,
        row_version: item.rowVersion ?? null,
        id_empresa: item.idEmpresa ?? ID_EMPRESA,
        id_documento: item.idDocumento ?? null,
        letra: item.letra ?? null,
        serie: item.serie ?? null,
        nrodoc: item.nrodoc ?? null,
        anulado: item.anulado ?? null,
        fecha_comprobante: safeDate(item.fechaComprobate || item.fechaComprobante),
        fecha_alta: safeDate(item.fechaAlta),
        fecha_entrega: safeDate(item.fechaEntrega),
        fecha_pago: safeDate(item.fechaPago),
        id_cliente: item.idCliente ?? null,
        nombre_cliente: item.nombreCliente ?? null,
        ds_localidad: item.dsLocalidad ?? null,
        ds_provincia: item.dsProvincia ?? null,
        id_vendedor: item.idVendedor ?? null,
        ds_vendedor: item.dsVendedor ?? null,
        id_tipo_pago: item.idTipoPago ?? null,
        ds_tipo_pago: item.dsTipoPago ?? null,
        subtotal_neto: item.subtotalNeto ?? null,
        subtotal_final: item.subtotalFinal ?? null,
        raw: item,
    }
}

function normalizeLine(item: any, runId: string) {
    return {
        run_id: runId,
        row_version: item.rowVersion ?? null,
        id_empresa: item.idEmpresa ?? ID_EMPRESA,
        id_documento: item.idDocumento ?? null,
        letra: item.letra ?? null,
        serie: item.serie ?? null,
        nrodoc: item.nrodoc ?? null,
        id_linea: item.idLinea ?? null,
        id_articulo: item.idArticulo ?? null,
        ds_articulo: item.dsArticulo ?? null,
        cantidad_solicitada: item.cantidadSolicitada ?? null,
        cantidades_total: item.cantidadesTotal ?? null,
        precio_unitario_bruto: item.precioUnitarioBruto ?? null,
        bonificacion: item.bonificacion ?? null,
        precio_unitario_neto: item.precioUnitarioNeto ?? null,
        subtotal_neto: item.subtotalNeto ?? null,
        subtotal_final: item.subtotalFinal ?? null,
        proveedor: item.proveedor ?? null,
        precio_compra_bruto: item.preciocomprabr ?? null,
        precio_compra_neto: item.preciocomprant ?? null,
        raw: item,
    }
}

async function insertBatch(supabase: any, table: string, rows: any[]) {
    if (rows.length === 0) return []
    const CHUNK = 200
    const errors: string[] = []
    for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK)
        const { error } = await supabase.from(table).insert(chunk)
        if (error) errors.push(error.message)
    }
    return errors
}

async function upsertBatch(supabase: any, table: string, rows: any[], onConflict: string) {
    if (rows.length === 0) return
    const CHUNK = 100
    for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK)
        const { error } = await supabase.from(table).upsert(chunk, { onConflict })
        if (error) console.error(`upsert ${table} error:`, error.message)
    }
}

// ── Main sync ─────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
    const { searchParams } = new URL(request.url)
    const desde = searchParams.get('desde') || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const hasta = searchParams.get('hasta') || new Date().toISOString().split('T')[0]

    const supabase = createAdminClient()

    // Crear run
    const { data: run, error: runErr } = await supabase
        .from('chess_sync_runs')
        .insert({ fecha_desde: desde, fecha_hasta: hasta, status: 'running' })
        .select()
        .single()

    if (runErr) return NextResponse.json({ error: runErr.message }, { status: 500 })
    const runId = run.id

    const counts = { headers: 0, lines: 0, stock: 0, errors: [] as string[] }

    try {
        // Login
        let cookie: string
        try {
            cookie = await chessLogin()
        } catch (e: any) {
            await supabase.from('chess_sync_runs').update({ status: 'error', error: { msg: e.message }, finished_at: new Date().toISOString() }).eq('id', runId)
            return NextResponse.json({ error: `Login fallido: ${e.message}` }, { status: 502 })
        }

        const dateParams = `fechaDesde=${desde}&fechaHasta=${hasta}`

        // ── 1) VENTAS RESUMEN (cabeceras) ────────────────────────────────────
        const headers: any[] = []
        for (let lote = 1; lote <= 200; lote++) {
            const { status, data } = await chessGet(cookie, `/ventas/?${dateParams}&detallado=false&nroLote=${lote}`)
            await supabase.from('chess_raw').insert({
                run_id: runId, endpoint: `/ventas resumen lote ${lote}`,
                nro_lote: lote, http_status: status,
                payload: status === 200 ? data : null,
                error: status !== 200 ? { status } : null,
            })
            if (status !== 200) break
            const items = extractItems(data)
            if (items.length === 0) break
            headers.push(...items.map(i => normalizeHeader(i, runId)))
        }
        await upsertBatch(supabase, 'chess_sales_headers', headers, 'id_empresa,id_documento,letra,serie,nrodoc')
        counts.headers = headers.length

        // ── 2) VENTAS DETALLADO (líneas) ─────────────────────────────────────
        const lines: any[] = []
        for (let lote = 1; lote <= 200; lote++) {
            const { status, data } = await chessGet(cookie, `/ventas/?${dateParams}&detallado=true&nroLote=${lote}`)
            await supabase.from('chess_raw').insert({
                run_id: runId, endpoint: `/ventas detallado lote ${lote}`,
                nro_lote: lote, http_status: status,
                payload: status === 200 ? data : null,
                error: status !== 200 ? { status } : null,
            })
            if (status !== 200) break
            const items = extractItems(data)
            if (items.length === 0) break
            lines.push(...items.map(i => normalizeLine(i, runId)))
        }
        // Limpiar líneas anteriores del período y hacer INSERT limpio
        await supabase.from('chess_sales_lines').delete().gte('id', 0)
        const lineErrors = await insertBatch(supabase, 'chess_sales_lines', lines)
        if (lineErrors.length > 0) counts.errors.push(...lineErrors.slice(0, 5))
        counts.lines = lines.length

        // ── 3) STOCK ─────────────────────────────────────────────────────────
        {
            const { status, data } = await chessGet(cookie, `/stock/?idDeposito=11&frescura=false`)
            await supabase.from('chess_raw').insert({
                run_id: runId, endpoint: '/stock', http_status: status,
                payload: status === 200 ? data : null,
                error: status !== 200 ? { status } : null,
            })
            if (status === 200) {
                const stockItems = extractItems(data).map(i => ({
                    run_id: runId,
                    id_deposito: i.idDeposito ?? 11,
                    id_articulo: i.idArticulo ?? null,
                    ds_articulo: i.dsArticulo ?? null,
                    cant_bultos: i.cantBultos ?? null,
                    cant_unidades: i.cantUnidades ?? null,
                    raw: i,
                }))
                await upsertBatch(supabase, 'chess_stock', stockItems, 'run_id,id_deposito,id_articulo')
                counts.stock = stockItems.length
            }
        }

        // ── 4) ROMA (opcional, no rompe si falla) ────────────────────────────
        for (const romaPath of [
            `/roma/cajas/?fechaDesde=${desde}&fechaHasta=${hasta}`,
            `/roma/ventas/?fechaDesde=${desde}&fechaHasta=${hasta}&detallado=false&nroLote=1`,
        ]) {
            try {
                const { status, data } = await chessGet(cookie, romaPath)
                await supabase.from('chess_raw').insert({
                    run_id: runId, endpoint: `ROMA: ${romaPath}`, http_status: status,
                    payload: status === 200 ? data : null,
                    error: status !== 200 ? { status } : null,
                })
                if (status !== 200) counts.errors.push(`ROMA ${romaPath}: ${status}`)
            } catch (e: any) {
                counts.errors.push(`ROMA ${romaPath}: ${e.message}`)
            }
        }

        await supabase.from('chess_sync_runs').update({
            status: 'ok', finished_at: new Date().toISOString()
        }).eq('id', runId)

        return NextResponse.json({ run_id: runId, status: 'ok', counts })
    } catch (e: any) {
        await supabase.from('chess_sync_runs').update({
            status: 'error', error: { msg: e.message }, finished_at: new Date().toISOString()
        }).eq('id', runId)
        return NextResponse.json({ error: e.message, run_id: runId }, { status: 500 })
    }
}

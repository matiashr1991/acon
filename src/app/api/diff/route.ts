import { NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const proveedor_id = searchParams.get('proveedor_id')
    const job_id = searchParams.get('job_id')

    if (!proveedor_id) {
        return NextResponse.json({ error: 'proveedor_id es requerido' }, { status: 400 })
    }

    const supabase = await createServerSideClient()

    try {
        // 1. Obtener vigentes actuales
        const { data: vigentes } = await supabase
            .from('precios_compra')
            .select('*, productos(descripcion, barcode)')
            .eq('proveedor_id', proveedor_id)
            .eq('vigente', true)

        // 2. Obtener candidatos (borradores)
        let queryCandidatos = supabase
            .from('precios_compra')
            .select('*, productos(descripcion, barcode)')
            .eq('proveedor_id', proveedor_id)
            .eq('estado', 'draft')

        if (job_id) {
            queryCandidatos = queryCandidatos.eq('import_job_id', job_id)
        }

        const { data: candidatos } = await queryCandidatos

        if (!candidatos || !vigentes) {
            return NextResponse.json({ error: 'Fallo al obtener datos' }, { status: 500 })
        }

        // Comparar
        const result = {
            nuevos: [] as any[],
            modificados: [] as any[],
            sin_cambios: [] as any[],
            eliminados: [] as any[]
        }

        const vigentesMap = new Map(vigentes.map(v => [v.sku, v]))
        const candidatosMap = new Map(candidatos.map(c => [c.sku, c]))

        // Evaluar candidatos frente a vigentes
        candidatos.forEach(cand => {
            const vigente = vigentesMap.get(cand.sku)

            if (!vigente) {
                result.nuevos.push({
                    candidato: cand
                })
            } else {
                // Verificar diferencias (Consideramos CC y CR)
                const diffCC = Number(cand.precio_compra) !== Number(vigente.precio_compra)
                const diffCR = Number(cand.bonif_total_decimal) !== Number(vigente.bonif_total_decimal)

                if (diffCC || diffCR) {
                    result.modificados.push({
                        candidato: cand,
                        anterior: vigente,
                        cambios: {
                            precio_compra: diffCC,
                            bonif_total_decimal: diffCR
                        }
                    })
                } else {
                    result.sin_cambios.push({
                        candidato: cand,
                        anterior: vigente
                    })
                }
            }
        })

        // Evaluar eliminados (están en vigentes pero no en candidatos)
        // Esto es especialmente útil si es un import full del catálogo
        if (job_id) {
            vigentes.forEach(vig => {
                if (!candidatosMap.has(vig.sku)) {
                    result.eliminados.push({
                        anterior: vig
                    })
                }
            })
        }

        return NextResponse.json({
            resumen: {
                nuevos: result.nuevos.length,
                modificados: result.modificados.length,
                sin_cambios: result.sin_cambios.length,
                eliminados: result.eliminados.length
            },
            detalles: result
        })

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

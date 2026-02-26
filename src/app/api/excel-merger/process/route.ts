import { NextResponse } from 'next/server'
import { processProveedorMerge } from '@/lib/excel-merger'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const fileA = formData.get('fileA') as File | null
        const filesB = formData.getAll('fileB') as File[]

        if (!fileA || filesB.length === 0) {
            return NextResponse.json({ error: 'Debes subir ambos archivos (Ventas y al menos un Proveedor)' }, { status: 400 })
        }

        const bufferA = await fileA.arrayBuffer()
        const buffersB = await Promise.all(filesB.map(f => f.arrayBuffer()));

        let base64Result: string;
        try {
            base64Result = processProveedorMerge(bufferA, buffersB);
        } catch (err: any) {
            console.error(err);
            return NextResponse.json({ error: err.stack || err.message || 'Error de procesamiento en cruce.' }, { status: 422 })
        }

        return NextResponse.json({
            success: true,
            file_base64: base64Result,
            file_name: `ventas_enriquecidas_${new Date().toISOString().split('T')[0]}.xlsx`
        })

    } catch (error: any) {
        console.error('Merge Error:', error)
        return NextResponse.json({ error: error.message || 'Server error interno' }, { status: 500 })
    }
}

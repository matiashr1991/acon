import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/service'
import * as XLSX from 'xlsx'

export async function GET() {
    try {
        const supabase = createAdminClient()

        // Obtener todos los registros limpios ordenados cronológicamente
        const { data: records, error } = await supabase
            .from('excel_clean_records')
            .select('*')
            .order('created_at', { ascending: true })

        if (error) throw error

        if (!records || records.length === 0) {
            return NextResponse.json({ error: 'No hay registros en la base de datos para exportar.' }, { status: 404 })
        }

        const exportWorkbook = XLSX.utils.book_new()

        // Mapear el total de la DB a las 16 columnas requeridas estrictamente
        const outputGrid = records.map(row => {
            const map: any = {
                'Ramo': row.ramo,
                'Descripción Ramo': row.desc_ramo,
                'Vendedor': row.vendedor,
                'Descripción Vendedor': row.desc_vendedor,
                'Código': row.codigo,
                'Descripción (Producto)': row.desc_producto,
                'Marca': row.marca,
            };

            // Opcionales regidas por la base
            if (row.desc_marca !== null && row.desc_marca !== undefined) {
                map['Descripción (Marca)'] = row.desc_marca;
            }

            map['Unidad de Negocio'] = row.unidad_negocio;

            if (row.desc_unidad_negocio !== null && row.desc_unidad_negocio !== undefined) {
                map['Descripción (Unidad de Negocio)'] = row.desc_unidad_negocio;
            }

            map['Precio'] = row.precio;
            map['Bonific'] = row.bonific;
            map['Pr Neto'] = row.pr_neto;
            map['Cantidades Totales'] = row.cant_totales;
            map['Importes Netos'] = row.importes_netos;
            map['Importes Finales'] = row.importes_finales;

            return map;
        });

        const newWorksheet = XLSX.utils.json_to_sheet(outputGrid);
        XLSX.utils.book_append_sheet(exportWorkbook, newWorksheet, 'LIMPIO_GLOBAL');

        const base64Excel = XLSX.write(exportWorkbook, { type: 'base64', bookType: 'xlsx' });

        return NextResponse.json({
            success: true,
            file_base64: base64Excel,
            file_name: `facturacion_global_${new Date().toISOString().split('T')[0]}.xlsx`
        })

    } catch (error: any) {
        console.error('Export Global Error:', error)
        return NextResponse.json({ error: error.message || 'Server error interno al exportar' }, { status: 500 })
    }
}

import * as XLSX from 'xlsx'

/**
 * Normaliza claves de código de artículo para cruce:
 * - A string
 * - Trim
 * - Quita decimales ".0" fijos al final si se casteó raro un entero
 * - Quita espacios, puntos y guiones
 */
function normalizeKey(val: any): string {
    if (val === null || val === undefined || val === '') return '';
    let s = String(val).trim();
    // Si Excel lo leyó como numérico con un .0, lo sacamos
    s = s.replace(/\.0$/, '');
    // Quitar espacios, puntos y guiones
    s = s.replace(/[\s.\-]/g, '');
    return s;
}

/**
 * Normaliza números con divisores variados, recortes de % y $
 */
function parseNumber(val: any): number | null {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return val;

    let s = String(val).trim().toUpperCase();
    if (s === '#N/D' || s === '#¡VALOR!' || s === 'VALOR CERO') return null;

    s = s.replace(/[$%]/g, '').trim();

    const hasComma = s.includes(',');
    const hasDot = s.includes('.');

    if (hasComma && hasDot) {
        const lastComma = s.lastIndexOf(',');
        const lastDot = s.lastIndexOf('.');
        if (lastComma > lastDot) {
            // 1.234,56 -> 1234.56
            s = s.replace(/\./g, '').replace(',', '.');
        } else {
            // 1,234.56 -> 1234.56
            s = s.replace(/,/g, '');
        }
    } else if (hasComma) {
        const parts = s.split(',');
        if (parts.length === 2 && parts[1].length <= 3) {
            s = s.replace(',', '.'); // decimal
        } else {
            s = s.replace(/,/g, ''); // separator
        }
    }

    const num = parseFloat(s);
    return isNaN(num) ? null : num;
}

export function processProveedorMerge(bufferA: ArrayBuffer, buffersB: ArrayBuffer[]): string {
    // 1. Leer Archivo A (Ventas)
    const wbA = XLSX.read(bufferA, { type: 'array' });
    const sheetA = wbA.Sheets[wbA.SheetNames[0]];
    const rawA: any[][] = XLSX.utils.sheet_to_json(sheetA, { header: 1, defval: null });

    if (rawA.length === 0) throw new Error("Archivo A (Ventas) está vacío.");

    // Encontrar header Ventas
    let headerAIdx = -1;
    let headersA: string[] = [];
    for (let i = 0; i < Math.min(30, rawA.length); i++) {
        const row = rawA[i];
        if (!Array.isArray(row)) continue;
        const rowStr = row.map(c => String(c || '').trim().toLowerCase());
        if ((rowStr.includes('código') || rowStr.includes('codigo')) && rowStr.includes('precio')) {
            headerAIdx = i;
            headersA = row.map(c => String(c || '').trim());
            // Recortar columnas vacías al final que inflan la memoria
            while (headersA.length > 0 && headersA[headersA.length - 1] === '') {
                headersA.pop();
            }
            break;
        }
    }
    if (headerAIdx === -1) throw new Error("No se encontró encabezado válido en Archivo A (necesita 'Código' y 'Precio').");

    const getIdxA = (names: string[]) => headersA.findIndex(h => names.some(n => h.toLowerCase() === n.toLowerCase()));

    const idxCodVenta = getIdxA(['código', 'codigo']);
    const idxPrNeto = getIdxA(['pr neto', 'pr. neto', 'precio neto']);
    const idxImpNetos = getIdxA(['importes netos', 'imp netos', 'importes netos.']);
    const idxCant = getIdxA(['cantidades totales', 'cant. totales']);

    if (idxCodVenta === -1) throw new Error("No se encontró la columna 'Código' en Archivo A.");

    // 2. Leer Archivos B (Proveedor/es)
    const dictB: Record<string, {
        estado: string | null;
        margen_int: number | null;
        precio_neto: number | null;
        iva: number | null;
        precio_final: number | null;
    }> = {};

    let processedAtLeastOneB = false;

    function isHabPrev(st: string | null): boolean {
        return st?.toLowerCase() === 'hab.';
    }

    for (const bufferB of buffersB) {
        const wbB = XLSX.read(bufferB, { type: 'array' });
        const sheetB = wbB.Sheets[wbB.SheetNames[0]];
        const rawB: any[][] = XLSX.utils.sheet_to_json(sheetB, { header: 1, defval: null });

        if (rawB.length === 0) continue;

        let headerBIdx = -1;
        let headersB: string[] = [];
        for (let i = 0; i < Math.min(50, rawB.length); i++) {
            const row = rawB[i];
            if (!Array.isArray(row)) continue;
            const rowStr = row.map(c => String(c || '').trim().toLowerCase());
            if (rowStr.includes('cod art') && rowStr.includes('estado') && rowStr.includes('descripcion')) {
                headerBIdx = i;
                headersB = row.map(c => String(c || '').trim());
                while (headersB.length > 0 && headersB[headersB.length - 1] === '') {
                    headersB.pop();
                }
                break;
            }
        }

        if (headerBIdx === -1) continue; // No tiene el formato esperado

        // Identificar LISTA 1 estrictamente
        const idxEstado = headersB.findIndex(h => h.toLowerCase() === 'estado');
        const idxCodArt = headersB.findIndex(h => h.toLowerCase() === 'cod art');

        // Ubicar "Margen int Lista 1"
        const idxMargenL1 = headersB.findIndex(h => h.toLowerCase().includes('margen int lista 1'));
        if (idxMargenL1 === -1) continue;

        // Asumimos offset +1, +2, +3 según la regla
        const idxPrecioNetoL1 = idxMargenL1 + 1;
        const idxIVAL1 = idxMargenL1 + 2;
        const idxPrecioFinalL1 = idxMargenL1 + 3;

        processedAtLeastOneB = true;

        for (let i = headerBIdx + 1; i < rawB.length; i++) {
            const row = rawB[i];
            if (!Array.isArray(row) || row.length === 0) continue;

            const codRaw = row[idxCodArt];
            if (!codRaw) continue; // Ignorar si no hay codigo

            const estadoRaw = row[idxEstado] ? String(row[idxEstado]).trim() : null;

            // Ignorar separadores de cualquier proveedor: si el codRaw es un texto muy largo no es un codigo de bar/num.
            if (typeof codRaw === 'string' && codRaw.length > 20 && codRaw.includes(' ')) continue;

            const key = normalizeKey(codRaw);
            if (!key) continue;

            // Regla: si ya existe, solo pisar si el nuevo es Hab. Si el existente ya es Hab, dejamos el primero por si acaso.
            const prev = dictB[key];
            const isHab = estadoRaw?.toLowerCase() === 'hab.';

            if (!prev || (!isHabPrev(prev.estado) && isHab)) {
                dictB[key] = {
                    estado: estadoRaw,
                    margen_int: parseNumber(row[idxMargenL1]),
                    precio_neto: parseNumber(row[idxPrecioNetoL1]),
                    iva: parseNumber(row[idxIVAL1]),
                    precio_final: parseNumber(row[idxPrecioFinalL1])
                };
            }
        }
    }

    if (!processedAtLeastOneB) {
        throw new Error("Ninguno de los archivos de Proveedor ingresados resultó tener el formato matriz correcto (Faltó ESTADO, COD ART o Margen int Lista 1)");
    }

    // 3. Cruzar Datos
    const outVentas: any[] = [];
    const outNoMatch: any[] = [];

    // Títulos extras requeridos por el output
    const extraHeaders = [
        'EDELORO_ESTADO',
        'LISTA1_MargenInt',
        'LISTA1_PrecioNeto',
        'LISTA1_IVA',
        'LISTA1_PrecioFinal_cIVA',
        'MATCH_STATUS',
        'VENTA_PrecioNetoUnit',
        'LISTA1_TotalNeto',
        'DIF_Unit_vs_LISTA1',
        'DIF_Total_vs_LISTA1'
    ];

    // Array output header
    const finalHeaders = [...headersA, ...extraHeaders];
    outVentas.push(finalHeaders);
    outNoMatch.push(finalHeaders);

    for (let i = headerAIdx + 1; i < rawA.length; i++) {
        const row = rawA[i];
        if (!Array.isArray(row)) continue;

        // descartar filas enteramente vacias
        if (!row.some(c => c !== null && c !== undefined && String(c).trim() !== '')) continue;

        const codigoVentaRaw = row[idxCodVenta];
        const key = normalizeKey(codigoVentaRaw);

        const prNetoVal = idxPrNeto !== -1 ? parseNumber(row[idxPrNeto]) : null;
        const impNetosVal = idxImpNetos !== -1 ? parseNumber(row[idxImpNetos]) : null;
        const cantVal = idxCant !== -1 ? parseNumber(row[idxCant]) : null;

        // Calculo VENTA_PrecioNetoUnit
        let ventaNetoUnit: number | null = null;

        // Heuristica: Pr Neto suele ser unitario, si los Importes Netos > Pr Neto y Cant > 1
        // Nos apegamos a la regla del prompt textualmente:
        // Si Pr Neto es unitario VENTA = Pr Neto
        // Si Pr Neto es total VENTA = Importes Netos / Cantidades Totales
        // Detectar si es total:
        if (prNetoVal !== null && cantVal !== null && cantVal > 0) {
            // Si prNetoVal * cantVal esta cerca de impNetosVal, prNetoVal es unitario
            if (impNetosVal !== null && Math.abs(prNetoVal * cantVal - impNetosVal) < 2) {
                ventaNetoUnit = prNetoVal;
            } else if (impNetosVal !== null && Math.abs(prNetoVal - impNetosVal) < 2 && cantVal > 1) {
                // Pr neto ya era el total
                ventaNetoUnit = impNetosVal / cantVal;
            } else {
                // Fallback a division
                ventaNetoUnit = impNetosVal !== null ? impNetosVal / cantVal : prNetoVal;
            }
        } else if (prNetoVal !== null) {
            ventaNetoUnit = prNetoVal;
        } else if (impNetosVal !== null && cantVal !== null && cantVal > 0) {
            ventaNetoUnit = impNetosVal / cantVal;
        }

        const match = dictB[key];

        const baseRow = row.slice(0, headersA.length);
        // Rellenar vacios del original
        while (baseRow.length < headersA.length) baseRow.push(null);

        if (match) {
            const isAnul = match.estado?.toLowerCase() === 'anul';
            const status = isAnul ? "MATCH_ANUL" : "MATCH";

            let l1TotalNeto: number | null = null;
            if (match.precio_neto !== null && cantVal !== null) {
                l1TotalNeto = match.precio_neto * cantVal;
            }

            let difUnit: number | null = null;
            if (ventaNetoUnit !== null && match.precio_neto !== null) {
                difUnit = ventaNetoUnit - match.precio_neto;
            }

            let difTotal: number | null = null;
            if (ventaNetoUnit !== null && cantVal !== null && l1TotalNeto !== null) {
                difTotal = (ventaNetoUnit * cantVal) - l1TotalNeto;
            }

            const enrichParams = [
                match.estado,
                match.margen_int,
                match.precio_neto,
                match.iva,
                match.precio_final,
                status,
                ventaNetoUnit,
                l1TotalNeto,
                difUnit,
                difTotal
            ];

            const finalRow = [...baseRow, ...enrichParams];
            outVentas.push(finalRow);

        } else {
            // No Match
            const status = "NO_MATCH";
            const enrichParams = [
                null, // ESTADO
                null, // Margen Int
                null, // Precio Neto
                null, // IVA
                null, // Precio final
                status,
                ventaNetoUnit,
                null, // l1TotalNeto
                null, // difUnit
                null  // difTotal
            ];

            const finalRow = [...baseRow, ...enrichParams];
            outVentas.push(finalRow);
            outNoMatch.push(finalRow);
        }
    }

    // Limpieza final de celdas nulas sobrantes extremas ("vacias absolutas") que crashean XLSX (Invalid array length)
    const pruneEmptyTails = (matrix: any[][]) => {
        return matrix.map(row => {
            let lastSolid = row.length - 1;
            while (lastSolid >= 0 && (row[lastSolid] === null || row[lastSolid] === undefined || row[lastSolid] === '')) {
                lastSolid--;
            }
            return row.slice(0, lastSolid + 1);
        });
    };

    const cleanOutVentas = pruneEmptyTails(outVentas);
    const cleanOutNoMatch = pruneEmptyTails(outNoMatch);

    // Exportar
    const outWb = XLSX.utils.book_new();
    const wsVentas = XLSX.utils.aoa_to_sheet(cleanOutVentas);
    XLSX.utils.book_append_sheet(outWb, wsVentas, 'VENTAS_ENRIQUECIDAS');

    if (cleanOutNoMatch.length > 1) {
        const wsNoMatch = XLSX.utils.aoa_to_sheet(cleanOutNoMatch);
        XLSX.utils.book_append_sheet(outWb, wsNoMatch, 'NO_MATCH');
    }

    return XLSX.write(outWb, { type: 'base64', bookType: 'xlsx' });
}

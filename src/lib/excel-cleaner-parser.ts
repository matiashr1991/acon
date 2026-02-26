/**
 * Utilidades para parseo de Excel EXTRICTO: Modo "Limpiador"
 * Basado posiciones de cabeceras, no en alias genéricos.
 */

export interface CleanDatasetRow {
    // Deduplication Keys
    periodo_cod: string | null;
    cliente_cod: string | null;
    sucursal: string | null;
    // Visibles
    ramo: string | null;
    desc_ramo: string | null;
    vendedor: string | null;
    desc_vendedor: string | null;
    codigo: string | null;
    desc_producto: string | null;
    marca: string | null;
    desc_marca: string | undefined; // Opcional
    unidad_negocio: string | null;
    desc_unidad_negocio: string | undefined; // Opcional
    precio: number | null;
    bonific: number | null;
    pr_neto: number | null;
    cant_totales: number | null;
    importes_netos: number | null;
    importes_finales: number | null;
}

/**
 * Función principal del rol "Limpiador de Excel".
 * Recibe la matriz cruda generada por xlsx (sheet_to_json con header: 1)
 */
export function extractCleanDataset(rawMatrix: any[][]): { rows: CleanDatasetRow[], metadata: { totalRaw: number } } {
    if (!rawMatrix || rawMatrix.length === 0) {
        throw new Error("El archivo está vacío.");
    }

    // 1. Buscar la fila real de headers
    // La heurística perfecta es buscar donde conviven las columnas obligatorias como "Código", "Ramo" y "Precio"
    let headerRowIndex = -1;
    let headerStrings: string[] = [];

    for (let i = 0; i < Math.min(20, rawMatrix.length); i++) {
        const row = rawMatrix[i];
        if (!Array.isArray(row)) continue;

        const rowStr = row.map(cell => String(cell || '').trim().toLowerCase());

        // Criterio de header: Debe contener Ramo y Código
        if (rowStr.includes('código') || rowStr.includes('codigo')) {
            if (rowStr.includes('ramo') && rowStr.includes('precio')) {
                headerRowIndex = i;
                headerStrings = row.map(cell => String(cell || '').trim());
                break;
            }
        }
    }

    if (headerRowIndex === -1) {
        throw new Error("No se detectó la fila de encabezados correcta. Asegúrate de que existan columnas como 'Ramo', 'Código' y 'Precio'.");
    }

    // 2. Extraer índices exactos basados en las reglas estrictas
    // (Búsqueda case-insensitive pero match exacto de palabra)
    const findExactColIdx = (targetNames: string[]): number => {
        return headerStrings.findIndex(h => targetNames.some(target => h.toLowerCase() === target.toLowerCase()));
    };

    // Claves de Deduplicacion
    const idxPeriodoCod = findExactColIdx(['cod. período', 'cod. periodo', 'cod periodo']);
    const idxClienteCod = findExactColIdx(['cod. cliente', 'cod cliente']);
    const idxSucursal = findExactColIdx(['sucursal']);

    const idxRamo = findExactColIdx(['ramo']);
    const idxDescRamo = findExactColIdx(['descripción ramo', 'descripcion ramo']);
    const idxVendedor = findExactColIdx(['vendedor']);
    const idxDescVendedor = findExactColIdx(['descripción vendedor', 'descripcion vendedor']);

    // Regla Crítica A: Código y Descripción (Producto)
    const idxCodigo = findExactColIdx(['código', 'codigo']);
    let idxDescProducto = -1;
    if (idxCodigo !== -1 && idxCodigo + 1 < headerStrings.length) {
        const nextHeader = headerStrings[idxCodigo + 1].toLowerCase();
        if (nextHeader === 'descripción' || nextHeader === 'descripcion' || nextHeader === 'detalle') {
            idxDescProducto = idxCodigo + 1;
        }
    }

    // Regla Crítica B: Marca y Descripción (Marca) (Opcional)
    const idxMarca = findExactColIdx(['marca']);
    let idxDescMarca = -1;
    if (idxMarca !== -1 && idxMarca + 1 < headerStrings.length) {
        const nextHeader = headerStrings[idxMarca + 1].toLowerCase();
        if (nextHeader === 'descripción' || nextHeader === 'descripcion' || nextHeader === 'detalle') {
            idxDescMarca = idxMarca + 1;
        }
    }

    // Regla Crítica C: Unidad de Negocio y Descripción (UN) (Opcional)
    const idxUnP = findExactColIdx(['unidad de negocio']);
    let idxDescUnP = -1;
    if (idxUnP !== -1 && idxUnP + 1 < headerStrings.length) {
        const nextHeader = headerStrings[idxUnP + 1].toLowerCase();
        if (nextHeader === 'descripción' || nextHeader === 'descripcion' || nextHeader === 'detalle') {
            idxDescUnP = idxUnP + 1;
        }
    }

    // Numéricos
    const idxPrecio = findExactColIdx(['precio']);
    // 'bonific' podria estar como 'bonific.' o 'bonific'
    const idxBonific = headerStrings.findIndex(h => h.toLowerCase().startsWith('bonific'));
    const idxPrNeto = findExactColIdx(['pr neto', 'pr. neto', 'precio neto']);
    const idxCantTotales = findExactColIdx(['cantidades totales', 'cant. totales']);
    const idxImportesNetos = findExactColIdx(['importes netos', 'imp. netos']);
    const idxImportesFinales = findExactColIdx(['importes finales', 'imp. finales']);

    // Check basic de viabilidad para evitar crasheos silenciosos por template erroneo
    if (idxCodigo === -1 || idxPrecio === -1) {
        throw new Error("El archivo no tiene el formato esperado. Faltan columnas fundamentales como 'Código' o 'Precio'.");
    }
    if (idxDescProducto === -1) {
        throw new Error("Regla estricta no cumplida: No se encontró la columna 'Descripción' inmediatamente después de 'Código'.");
    }

    // 3. Procesar las filas de datos reales (las que están abajo del header)
    const dataRowsArray = rawMatrix.slice(headerRowIndex + 1);
    const cleanDataset: CleanDatasetRow[] = [];

    for (const rawRow of dataRowsArray) {
        if (!Array.isArray(rawRow) || rawRow.length === 0) continue;

        // Descartar filas completamente vacias
        if (!rawRow.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')) {
            continue;
        }

        const getValue = (idx: number): any => idx !== -1 ? rawRow[idx] : null;

        const rowParams: CleanDatasetRow = {
            periodo_cod: parseFuzzyString(getValue(idxPeriodoCod)),
            cliente_cod: parseFuzzyString(getValue(idxClienteCod)),
            sucursal: parseFuzzyString(getValue(idxSucursal)),
            ramo: parseFuzzyString(getValue(idxRamo)),
            desc_ramo: parseFuzzyString(getValue(idxDescRamo)),
            vendedor: parseFuzzyString(getValue(idxVendedor)),
            desc_vendedor: parseFuzzyString(getValue(idxDescVendedor)),
            codigo: parseFuzzyString(getValue(idxCodigo)),
            desc_producto: parseFuzzyString(getValue(idxDescProducto)),
            marca: parseFuzzyString(getValue(idxMarca)),
            precio: parseFuzzyNumber(getValue(idxPrecio)),
            bonific: parseFuzzyNumber(getValue(idxBonific)),
            pr_neto: parseFuzzyNumber(getValue(idxPrNeto)),
            cant_totales: parseFuzzyNumber(getValue(idxCantTotales)),
            importes_netos: parseFuzzyNumber(getValue(idxImportesNetos)),
            importes_finales: parseFuzzyNumber(getValue(idxImportesFinales)),
            unidad_negocio: parseFuzzyString(getValue(idxUnP)),
            // Opcionales undefined si su indice es -1, o string si lo encontro
            desc_marca: idxDescMarca !== -1 ? (parseFuzzyString(getValue(idxDescMarca)) || undefined) : undefined,
            desc_unidad_negocio: idxDescUnP !== -1 ? (parseFuzzyString(getValue(idxDescUnP)) || undefined) : undefined
        };

        cleanDataset.push(rowParams);
    }

    return {
        rows: cleanDataset,
        metadata: {
            totalRaw: dataRowsArray.length
        }
    };
}


// Utilidades parseo

export function parseFuzzyString(val: any): string | null {
    if (val === null || val === undefined) return null;
    const s = String(val).trim();
    return s === '' ? null : s;
}

export function parseFuzzyNumber(val: any): number | null {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return val;

    let s = String(val).trim();

    // Remover $ y % (si alguien metio un simbolo en el template de bonific)
    s = s.replace(/[$%]/g, '').trim();

    // Logica EU/US
    const hasComma = s.includes(',');
    const hasDot = s.includes('.');

    if (hasComma && hasDot) {
        const lastCommaPos = s.lastIndexOf(',');
        const lastDotPos = s.lastIndexOf('.');
        if (lastCommaPos > lastDotPos) {
            // Formato 1.234,56 -> quito puntos, coma a punto
            s = s.replace(/\./g, '').replace(',', '.');
        } else {
            // Formato 1,234.56 -> quito comas
            s = s.replace(/,/g, '');
        }
    } else if (hasComma) {
        const parts = s.split(',');
        if (parts.length === 2 && parts[1].length <= 3) {
            s = s.replace(',', '.'); // es decimal europeo
        } else {
            s = s.replace(/,/g, ''); // es separador miles
        }
    }

    const num = parseFloat(s);
    if (isNaN(num)) return null;
    return num;
}

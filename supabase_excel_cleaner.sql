-- ==============================================================================
-- SCHEMA SUPABASE PARA MODULO LIMPIADOR EXCEL ESTRICTO
-- ==============================================================================

-- 1. Tabla de Historial (Log de las conversiones)
CREATE TABLE public.excel_clean_data_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    total_raw_rows INTEGER DEFAULT 0,
    valid_clean_rows INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Filas Limpias extraídas exactamente bajo la regla de las 16 columnas
CREATE TABLE public.excel_clean_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.excel_clean_data_jobs(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    
    ramo TEXT,
    desc_ramo TEXT,
    vendedor TEXT,
    desc_vendedor TEXT,
    codigo TEXT,
    desc_producto TEXT,
    marca TEXT,
    desc_marca TEXT,
    unidad_negocio TEXT,
    desc_unidad_negocio TEXT,
    
    precio NUMERIC,
    bonific NUMERIC,
    pr_neto NUMERIC,
    cant_totales NUMERIC,
    importes_netos NUMERIC,
    importes_finales NUMERIC,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para borrar rápido en cascada o lecturas
CREATE INDEX idx_excel_clean_records_job_id ON public.excel_clean_records(job_id);

-- ==============================================================================
-- 🚨 PASO 1: ELIMINAR TABLAS DEL MÓDULO VIEJO (Si existen)
-- ==============================================================================
DROP TABLE IF EXISTS public.excel_import_raw_rows CASCADE;
DROP TABLE IF EXISTS public.excel_import_clean_rows CASCADE;
DROP TABLE IF EXISTS public.excel_import_errors CASCADE;
DROP TABLE IF EXISTS public.excel_export_presets CASCADE;
DROP TABLE IF EXISTS public.excel_imports CASCADE;

-- Si ya habías creado la tabla limpia estricta, la borramos para rehacerla con la Clave Única
DROP TABLE IF EXISTS public.excel_clean_records CASCADE;
DROP TABLE IF EXISTS public.excel_clean_data_jobs CASCADE;

-- ==============================================================================
-- ✅ PASO 2: CREAR TABLAS PARA EL NUEVO MÓDULO "LIMPIADOR ESTRICTO"
-- ==============================================================================

-- Tabla de Historial (Log de conversiones)
CREATE TABLE public.excel_clean_data_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    total_raw_rows INTEGER DEFAULT 0,
    valid_clean_rows INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de Filas Limpias extraídas
CREATE TABLE public.excel_clean_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.excel_clean_data_jobs(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    
    -- --- CLAVES DE DEDUPLICACIÓN (Se extraen aunque no salgan en el Excel final) ---
    periodo_cod TEXT,
    cliente_cod TEXT,
    sucursal TEXT,
    -- --------------------------------------------------------------------------------
    
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
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 🔒 CANDADO ANTI-DUPLICADOS (El Upsert se basará en esto)
    -- "Cod. Período + Cod. Cliente + Sucursal + Código + Vendedor"
    CONSTRAINT unique_excel_record UNIQUE (periodo_cod, cliente_cod, sucursal, codigo, vendedor)
);

-- Índices adicionales
CREATE INDEX idx_excel_clean_records_job_id ON public.excel_clean_records(job_id);

GRANT ALL ON TABLE public.excel_clean_data_jobs TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.excel_clean_records TO postgres, anon, authenticated, service_role;

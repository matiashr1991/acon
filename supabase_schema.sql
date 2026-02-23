-- ==============================================================================
-- SCHEMA SUPABASE: SISTEMACOSO PRECIOS
-- ==============================================================================

-- 1. Tabla: proveedores
CREATE TABLE public.proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL,
    razon_social TEXT NOT NULL,
    campos_plantilla JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla: productos
CREATE TABLE public.productos (
    sku TEXT PRIMARY KEY,
    descripcion TEXT NOT NULL,
    barcode TEXT, -- Puede ser nulo si "NO TIENE"
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabla: proveedor_productos (Relación para saber qué productos tiene un proveedor en su catálogo)
CREATE TABLE public.proveedor_productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proveedor_id UUID NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
    sku TEXT NOT NULL REFERENCES public.productos(sku) ON DELETE CASCADE,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(proveedor_id, sku)
);

-- 4. Tipo Enum: Origen de precios y estado del candidato
CREATE TYPE origen_precio AS ENUM ('import', 'manual');
CREATE TYPE estado_precio AS ENUM ('draft', 'approved', 'applied');

-- 5. Tabla: import_jobs (Cabecera de la importación)
CREATE TABLE public.import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proveedor_id UUID NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    row_count INTEGER DEFAULT 0,
    ok_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    status TEXT NOT NULL, -- Ej: 'processing', 'completed', 'failed'
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    created_by UUID, -- Referencia opcional al usuario (auth.uid())
    notes TEXT
);

-- 6. Tabla: precios_compra (Historial, vigentes y borradores)
CREATE TABLE public.precios_compra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proveedor_id UUID NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
    sku TEXT NOT NULL REFERENCES public.productos(sku) ON DELETE CASCADE,
    
    precio_compra NUMERIC NOT NULL, -- CC
    bonif_total_decimal NUMERIC NOT NULL CHECK (bonif_total_decimal >= 0), -- CR (Siempre positivo)
    bonif_total_pct NUMERIC NOT NULL, -- CC * 100
    neto_bonificado NUMERIC NOT NULL, -- CC * (1 - CR)
    
    vig_desde TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    vig_hasta DATE,
    vigente BOOLEAN NOT NULL DEFAULT false,
    
    origen origen_precio NOT NULL,
    import_job_id UUID REFERENCES public.import_jobs(id) ON DELETE SET NULL,
    estado estado_precio NOT NULL DEFAULT 'draft',
    
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Tabla: import_job_errors (Detalle de errores al importar)
CREATE TABLE public.import_job_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    sku TEXT,
    error_code TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDICES PARA MEJORAR RENDIMIENTO
-- ==============================================================================
CREATE INDEX idx_precios_compra_proveedor_sku ON public.precios_compra(proveedor_id, sku);
CREATE INDEX idx_precios_compra_vigente ON public.precios_compra(proveedor_id, sku) WHERE vigente = true;
CREATE INDEX idx_import_job_errores ON public.import_job_errors(job_id);

-- ==============================================================================
-- UNIQUE CONSTRAINT PARCIAL: Solo un precio "vigente" por proveedor y sku
-- ==============================================================================
CREATE UNIQUE INDEX uk_precios_compra_vigente_unico ON public.precios_compra (proveedor_id, sku) WHERE vigente = true;

-- ==============================================================================
-- FUNCIÓN: Trigger de Updated_At
-- ==============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_precios_compra_updated_at
BEFORE UPDATE ON public.precios_compra
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==============================================================================
-- RLS Y POLICIES (Básico para proteger datos si se accede desde el cliente. Como se usará Server Actions / API Routes, puede omitirse o configurarse simple)
-- ==============================================================================

-- Habilitar RLS en todas las tablas
/*
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedor_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precios_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_job_errors ENABLE ROW LEVEL SECURITY;

-- Por defecto permitimos a los usuarios autenticados todo (Ajustar a la necesidad)
CREATE POLICY "Allow authenticated read/write on proveedores" ON public.proveedores FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated read/write on productos" ON public.productos FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated read/write on proveedor_productos" ON public.proveedor_productos FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated read/write on precios_compra" ON public.precios_compra FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated read/write on import_jobs" ON public.import_jobs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated read/write on import_job_errors" ON public.import_job_errors FOR ALL TO authenticated USING (true);
*/

-- ============================================================
--  SISTEMA DE CURSOS — ESQUEMA CON ROLES
--  Ejecutar completo en: Supabase > SQL Editor > New query
-- ============================================================

-- ------------------------------------------------------------
--  LIMPIAR TABLAS ANTERIORES
-- ------------------------------------------------------------
DROP TABLE IF EXISTS estudiantes  CASCADE;
DROP TABLE IF EXISTS cursos       CASCADE;
DROP TABLE IF EXISTS programas    CASCADE;
DROP TABLE IF EXISTS asignaciones CASCADE;
DROP TABLE IF EXISTS ministerios  CASCADE;
DROP TABLE IF EXISTS perfiles     CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS es_admin() CASCADE;
DROP FUNCTION IF EXISTS es_director_de(UUID) CASCADE;


-- ------------------------------------------------------------
-- 1. PERFILES
-- ------------------------------------------------------------
CREATE TABLE perfiles (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre    TEXT NOT NULL,
  rol       TEXT NOT NULL DEFAULT 'director' CHECK (rol IN ('admin', 'director')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT ALL ON TABLE perfiles TO postgres, service_role, authenticated, anon;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, rol)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'nombre'), ''), split_part(NEW.email, '@', 1)),
    'director'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ------------------------------------------------------------
-- 2. MINISTERIOS
-- ------------------------------------------------------------
CREATE TABLE ministerios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  creado_por  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT ALL ON TABLE ministerios TO postgres, service_role, authenticated, anon;


-- ------------------------------------------------------------
-- 3. ASIGNACIONES (admin asigna directores a ministerios)
-- ------------------------------------------------------------
CREATE TABLE asignaciones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ministerio_id UUID NOT NULL REFERENCES ministerios(id) ON DELETE CASCADE,
  director_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asignado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ministerio_id, director_id)
);

GRANT ALL ON TABLE asignaciones TO postgres, service_role, authenticated, anon;


-- ------------------------------------------------------------
-- 4. PROGRAMAS
-- ------------------------------------------------------------
CREATE TABLE programas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ministerio_id UUID NOT NULL REFERENCES ministerios(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  fecha_inicio  DATE NOT NULL,
  creado_por    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT ALL ON TABLE programas TO postgres, service_role, authenticated, anon;


-- ------------------------------------------------------------
-- 5. ESTUDIANTES
-- ------------------------------------------------------------
CREATE TABLE estudiantes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programa_id  UUID NOT NULL REFERENCES programas(id) ON DELETE CASCADE,
  nombre       TEXT NOT NULL,
  agregado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agregado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT ALL ON TABLE estudiantes TO postgres, service_role, authenticated, anon;


-- ============================================================
--  VISTAS
-- ============================================================

CREATE OR REPLACE VIEW vista_programas AS
SELECT
  p.id,
  p.nombre         AS programa,
  p.fecha_inicio,
  p.creado_por,
  p.ministerio_id,
  m.nombre         AS ministerio,
  COUNT(e.id)      AS total_estudiantes,
  p.creado_en
FROM programas p
JOIN ministerios m ON m.id = p.ministerio_id
LEFT JOIN estudiantes e ON e.programa_id = p.id
GROUP BY p.id, m.id;

CREATE OR REPLACE VIEW vista_ministerios AS
SELECT
  m.id,
  m.nombre,
  m.descripcion,
  m.creado_por,
  COUNT(DISTINCT p.id)          AS total_programas,
  COUNT(DISTINCT a.director_id) AS total_directores,
  m.creado_en
FROM ministerios m
LEFT JOIN programas p    ON p.ministerio_id = m.id
LEFT JOIN asignaciones a ON a.ministerio_id = m.id
GROUP BY m.id;

CREATE OR REPLACE VIEW vista_directores AS
SELECT
  pf.id,
  pf.nombre,
  pf.rol,
  array_agg(DISTINCT m.nombre ORDER BY m.nombre)
    FILTER (WHERE m.id IS NOT NULL) AS ministerios_asignados,
  COUNT(DISTINCT a.ministerio_id)   AS total_asignaciones
FROM perfiles pf
LEFT JOIN asignaciones a ON a.director_id = pf.id
LEFT JOIN ministerios m  ON m.id = a.ministerio_id
WHERE pf.rol = 'director'
GROUP BY pf.id;


-- ============================================================
--  HELPERS
-- ============================================================

CREATE OR REPLACE FUNCTION es_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin') $$;

CREATE OR REPLACE FUNCTION es_director_de(p_ministerio_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (
  SELECT 1 FROM asignaciones
  WHERE director_id = auth.uid() AND ministerio_id = p_ministerio_id
) $$;


-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE perfiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministerios  ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE programas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE estudiantes  ENABLE ROW LEVEL SECURITY;

-- PERFILES
CREATE POLICY "todos ven perfiles"            ON perfiles FOR SELECT USING (true);
CREATE POLICY "trigger inserta perfiles"      ON perfiles FOR INSERT WITH CHECK (true);
CREATE POLICY "admin o propio actualiza"      ON perfiles FOR UPDATE USING (es_admin() OR auth.uid() = id);

-- MINISTERIOS
CREATE POLICY "todos ven ministerios"         ON ministerios FOR SELECT USING (true);
CREATE POLICY "solo admin crea ministerio"    ON ministerios FOR INSERT WITH CHECK (es_admin());
CREATE POLICY "solo admin edita ministerio"   ON ministerios FOR UPDATE USING (es_admin());
CREATE POLICY "solo admin elimina ministerio" ON ministerios FOR DELETE USING (es_admin());

-- ASIGNACIONES
CREATE POLICY "todos ven asignaciones"        ON asignaciones FOR SELECT USING (true);
CREATE POLICY "solo admin crea asignacion"    ON asignaciones FOR INSERT WITH CHECK (es_admin());
CREATE POLICY "solo admin elimina asignacion" ON asignaciones FOR DELETE USING (es_admin());

-- PROGRAMAS
CREATE POLICY "todos ven programas"           ON programas FOR SELECT USING (true);
CREATE POLICY "director asignado crea"        ON programas FOR INSERT
  WITH CHECK (auth.uid() = creado_por AND es_director_de(ministerio_id));
CREATE POLICY "creador edita programa"        ON programas FOR UPDATE USING (auth.uid() = creado_por);
CREATE POLICY "creador elimina programa"      ON programas FOR DELETE USING (auth.uid() = creado_por);

-- ESTUDIANTES
CREATE POLICY "todos ven estudiantes"         ON estudiantes FOR SELECT USING (true);
CREATE POLICY "autenticados agregan"          ON estudiantes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "quien agregó puede quitar"     ON estudiantes FOR DELETE USING (auth.uid() = agregado_por);


-- ============================================================
--  HACER ADMIN  —  ejecuta esto DESPUÉS de registrarte en la app
--  Cambia el correo por el tuyo
-- ============================================================
-- UPDATE perfiles SET rol = 'admin'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'tucorreo@ejemplo.com');

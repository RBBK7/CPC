-- ============================================================
--  SISTEMA DE GESTIÓN DE CURSOS POR MINISTERIO
--  Ejecutar completo en: Supabase > SQL Editor > New query
-- ============================================================


-- ------------------------------------------------------------
-- 1. PERFILES (extiende el auth de Supabase)
-- ------------------------------------------------------------
CREATE TABLE perfiles (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre    TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Se crea automáticamente cuando alguien se registra
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO perfiles (id, nombre)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'nombre');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ------------------------------------------------------------
-- 2. MINISTERIOS / CENTROS
-- ------------------------------------------------------------
CREATE TABLE ministerios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  creado_por  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ministerios_creador ON ministerios (creado_por);


-- ------------------------------------------------------------
-- 3. CURSOS
-- ------------------------------------------------------------
CREATE TABLE cursos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ministerio_id UUID NOT NULL REFERENCES ministerios(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  fecha_inicio  DATE NOT NULL,
  creado_por    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cursos_ministerio ON cursos (ministerio_id);
CREATE INDEX idx_cursos_creador    ON cursos (creado_por);


-- ------------------------------------------------------------
-- 4. ESTUDIANTES
-- ------------------------------------------------------------
CREATE TABLE estudiantes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id     UUID NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  nombre       TEXT NOT NULL,
  agregado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agregado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_estudiantes_curso ON estudiantes (curso_id);


-- ============================================================
--  VISTAS
-- ============================================================

CREATE OR REPLACE VIEW vista_cursos AS
SELECT
  c.id,
  c.nombre                  AS curso,
  c.fecha_inicio,
  c.creado_por,
  m.id                      AS ministerio_id,
  m.nombre                  AS ministerio,
  COUNT(e.id)               AS total_estudiantes,
  c.creado_en
FROM cursos c
JOIN ministerios m ON m.id = c.ministerio_id
LEFT JOIN estudiantes e ON e.curso_id = c.id
GROUP BY c.id, m.id;

CREATE OR REPLACE VIEW vista_ministerios AS
SELECT
  m.id,
  m.nombre,
  m.descripcion,
  m.creado_por,
  COUNT(c.id) AS total_cursos,
  m.creado_en
FROM ministerios m
LEFT JOIN cursos c ON c.ministerio_id = m.id
GROUP BY m.id;


-- ============================================================
--  ROW LEVEL SECURITY
--  Regla: todos ven todo, solo el creador edita/elimina
-- ============================================================

ALTER TABLE perfiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministerios ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE estudiantes ENABLE ROW LEVEL SECURITY;

-- PERFILES
CREATE POLICY "usuarios ven todos los perfiles"
  ON perfiles FOR SELECT USING (true);

CREATE POLICY "usuario edita su propio perfil"
  ON perfiles FOR UPDATE USING (auth.uid() = id);

-- MINISTERIOS
CREATE POLICY "todos ven ministerios"
  ON ministerios FOR SELECT USING (true);

CREATE POLICY "usuarios autenticados crean ministerios"
  ON ministerios FOR INSERT WITH CHECK (auth.uid() = creado_por);

CREATE POLICY "solo el creador edita ministerio"
  ON ministerios FOR UPDATE USING (auth.uid() = creado_por);

CREATE POLICY "solo el creador elimina ministerio"
  ON ministerios FOR DELETE USING (auth.uid() = creado_por);

-- CURSOS
CREATE POLICY "todos ven cursos"
  ON cursos FOR SELECT USING (true);

CREATE POLICY "usuarios autenticados crean cursos"
  ON cursos FOR INSERT WITH CHECK (auth.uid() = creado_por);

CREATE POLICY "solo el creador edita curso"
  ON cursos FOR UPDATE USING (auth.uid() = creado_por);

CREATE POLICY "solo el creador elimina curso"
  ON cursos FOR DELETE USING (auth.uid() = creado_por);

-- ESTUDIANTES (cualquier usuario autenticado puede agregar/quitar)
CREATE POLICY "todos ven estudiantes"
  ON estudiantes FOR SELECT USING (true);

CREATE POLICY "usuarios autenticados agregan estudiantes"
  ON estudiantes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "el que agregó puede quitar estudiante"
  ON estudiantes FOR DELETE USING (auth.uid() = agregado_por);

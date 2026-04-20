# Gestión de Cursos por Ministerio

Sistema web para administrar cursos por ministerio o centro.
Registro abierto — cualquiera con el link puede crear cuenta.
Solo el creador de cada ministerio/curso puede editarlo o eliminarlo.

---

## Paso 1 — Configurar Supabase (base de datos)

1. Entra a https://supabase.com y crea una cuenta gratuita
2. Clic en **New project** → ponle nombre → guarda la contraseña → crea
3. Espera ~2 minutos mientras se crea el proyecto
4. Ve a **SQL Editor** en el menú izquierdo
5. Clic en **New query**
6. Copia y pega el contenido del archivo `schema.sql`
7. Clic en **Run** (botón verde)
8. Todas las tablas quedan creadas ✓

### Obtener tus credenciales de Supabase

En el panel de Supabase ve a **Settings → API**:
- Copia la **Project URL** → la necesitas en el paso 3
- Copia la **anon public key** → la necesitas en el paso 3

---

## Paso 2 — Subir el código a GitHub

1. Crea una cuenta en https://github.com
2. Clic en **New repository** → dale un nombre → crea
3. Sube todos los archivos de esta carpeta al repositorio
   - Puedes usar GitHub Desktop (más fácil) o la terminal con git

---

## Paso 3 — Publicar en Vercel (link público)

1. Entra a https://vercel.com con tu cuenta de GitHub
2. Clic en **Add New Project**
3. Importa el repositorio que creaste
4. En la sección **Environment Variables** agrega:
   - `VITE_SUPABASE_URL` = tu Project URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` = tu anon public key de Supabase
5. Clic en **Deploy**
6. Vercel te da un link como `https://tu-proyecto.vercel.app` ✓

Comparte ese link con cualquier persona.
Cada quien se registra con su correo y contraseña.

---

## Paso 4 — Configurar confirmación de correo (opcional)

Por defecto Supabase pide confirmar el correo al registrarse.
Si quieres que entren sin confirmar:

1. En Supabase ve a **Authentication → Settings**
2. Desactiva **Enable email confirmations**
3. Guarda

---

## Estructura del proyecto

```
gestion-cursos/
├── schema.sql              ← Script de base de datos (ejecutar en Supabase)
├── index.html
├── package.json
├── vite.config.js
├── .env.example            ← Copia esto como .env.local para desarrollo local
└── src/
    ├── App.jsx             ← Raíz de la app, maneja sesión
    ├── index.css
    ├── main.jsx
    ├── lib/
    │   └── supabase.js     ← Cliente de Supabase
    ├── pages/
    │   ├── Auth.jsx        ← Login y registro
    │   └── Dashboard.jsx   ← Panel principal
    └── components/
        ├── Ministerios.jsx       ← Lista de ministerios
        ├── MinisterioDetalle.jsx ← Cursos de un ministerio
        ├── CursoDetalle.jsx      ← Estudiantes de un curso
        ├── TodosCursos.jsx       ← Vista global de cursos
        └── shared.module.css     ← Estilos compartidos
```

---

## Desarrollo local (opcional)

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo de variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# 3. Iniciar servidor local
npm run dev
# Abre http://localhost:5173
```

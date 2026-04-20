import { useState } from 'react'
import { supabase } from '../lib/supabase'
import s from './Auth.module.css'

export default function Auth() {
  const [tab, setTab] = useState('login')
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: correo, password: pass })
    if (error) setError('Correo o contraseña incorrectos')
    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    if (pass.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); setLoading(false); return }
    const { error } = await supabase.auth.signUp({
      email: correo,
      password: pass,
      options: { data: { nombre } }
    })
    if (error) setError(error.message)
    else setMsg('Cuenta creada. Revisa tu correo para confirmar.')
    setLoading(false)
  }

  return (
    <div className={s.wrap}>
      <div className={s.card}>
        <h1 className={s.title}>Gestión de Cursos</h1>
        <p className={s.sub}>Sistema de administración por ministerio</p>

        <div className={s.tabs}>
          <button className={`${s.tab} ${tab === 'login' ? s.active : ''}`} onClick={() => { setTab('login'); setError(''); setMsg('') }}>Ingresar</button>
          <button className={`${s.tab} ${tab === 'register' ? s.active : ''}`} onClick={() => { setTab('register'); setError(''); setMsg('') }}>Registrarse</button>
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className={s.field}>
              <label>Correo electrónico</label>
              <input type="email" value={correo} onChange={e => setCorreo(e.target.value)} placeholder="correo@ejemplo.com" required />
            </div>
            <div className={s.field}>
              <label>Contraseña</label>
              <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" required />
            </div>
            {error && <p className={s.error}>{error}</p>}
            <button className={s.btnPrimary} type="submit" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className={s.field}>
              <label>Nombre completo</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre" required />
            </div>
            <div className={s.field}>
              <label>Correo electrónico</label>
              <input type="email" value={correo} onChange={e => setCorreo(e.target.value)} placeholder="correo@ejemplo.com" required />
            </div>
            <div className={s.field}>
              <label>Contraseña</label>
              <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Mínimo 6 caracteres" required />
            </div>
            {error && <p className={s.error}>{error}</p>}
            {msg && <p className={s.success}>{msg}</p>}
            <button className={s.btnPrimary} type="submit" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

import { supabase } from '../lib/supabase'
import AdminPanel from '../components/AdminPanel'
import DirectorPanel from '../components/DirectorPanel'
import s from './Dashboard.module.css'

export default function Dashboard({ session, perfil }) {
  const isAdmin = perfil.rol === 'admin'

  const initials = perfil.nombre
    ? perfil.nombre.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className={s.wrap}>
      <div className={s.app}>
        <div className={s.topbar}>
          <span className={s.topTitle}>Gestión de Cursos</span>
          <div className={s.userRow}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <span className={s.userName}>{perfil.nombre}</span>
              <span className={isAdmin ? s.badgeAdmin : s.badgeDirector}>
                {isAdmin ? 'Administrador' : 'Director'}
              </span>
            </div>
            <div className={s.avatar}>{initials}</div>
            <button className={s.btnSm} onClick={handleLogout}>Salir</button>
          </div>
        </div>

        {isAdmin
          ? <AdminPanel userId={session.user.id} />
          : <DirectorPanel userId={session.user.id} />
        }
      </div>
    </div>
  )
}

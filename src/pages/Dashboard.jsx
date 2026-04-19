import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Ministerios from '../components/Ministerios'
import MinisterioDetalle from '../components/MinisterioDetalle'
import CursoDetalle from '../components/CursoDetalle'
import TodosCursos from '../components/TodosCursos'
import s from './Dashboard.module.css'

export default function Dashboard({ session }) {
  const [tab, setTab] = useState('ministerios')
  const [ministerioId, setMinisterioId] = useState(null)
  const [cursoId, setCursoId] = useState(null)
  const [perfil, setPerfil] = useState(null)

  useEffect(() => {
    supabase
      .from('perfiles')
      .select('nombre')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setPerfil(data))
  }, [session])

  const initials = perfil?.nombre
    ? perfil.nombre.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  function goBack() {
    if (cursoId) { setCursoId(null); return }
    if (ministerioId) { setMinisterioId(null); return }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const showNav = !ministerioId && !cursoId

  return (
    <div className={s.wrap}>
      <div className={s.app}>
        <div className={s.topbar}>
          <span className={s.topTitle}>Gestión de Cursos</span>
          <div className={s.userRow}>
            <span className={s.userName}>{perfil?.nombre || ''}</span>
            <div className={s.avatar}>{initials}</div>
            <button className={s.btnSm} onClick={handleLogout}>Salir</button>
          </div>
        </div>

        {showNav && (
          <div className={s.nav}>
            <button className={`${s.navBtn} ${tab === 'ministerios' ? s.navActive : ''}`} onClick={() => setTab('ministerios')}>Ministerios</button>
            <button className={`${s.navBtn} ${tab === 'cursos' ? s.navActive : ''}`} onClick={() => setTab('cursos')}>Todos los cursos</button>
          </div>
        )}

        {cursoId ? (
          <CursoDetalle
            cursoId={cursoId}
            userId={session.user.id}
            onBack={goBack}
          />
        ) : ministerioId ? (
          <MinisterioDetalle
            ministerioId={ministerioId}
            userId={session.user.id}
            onBack={goBack}
            onSelectCurso={setCursoId}
          />
        ) : tab === 'ministerios' ? (
          <Ministerios
            userId={session.user.id}
            onSelect={setMinisterioId}
          />
        ) : (
          <TodosCursos
            onSelectCurso={(cid, mid) => { setMinisterioId(mid); setCursoId(cid) }}
          />
        )}
      </div>
    </div>
  )
}

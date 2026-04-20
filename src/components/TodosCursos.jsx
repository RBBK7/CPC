import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import s from './shared.module.css'

export default function TodosCursos({ onSelectCurso }) {
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('vista_cursos')
      .select('*')
      .order('fecha_inicio', { ascending: false })
      .then(({ data }) => { setCursos(data || []); setLoading(false) })
  }, [])

  if (loading) return <div className={s.empty}>Cargando...</div>

  return (
    <div className={s.card}>
      <div className={s.header}>
        <span className={s.sectionTitle}>Todos los cursos</span>
        <span className={`${s.badge} ${s.badgeGray}`}>{cursos.length} total</span>
      </div>

      {cursos.length === 0
        ? <div className={s.empty}>No hay cursos registrados.</div>
        : cursos.map(c => {
          const fecha = new Date(c.fecha_inicio + 'T00:00:00').toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })
          return (
            <div className={s.listItem} key={c.id}>
              <div>
                <div className={s.itemTitle}>{c.curso}</div>
                <div className={s.itemSub}>
                  {c.ministerio} · Inicio: {fecha} ·{' '}
                  <span className={s.chip}>{c.total_estudiantes} estudiante{c.total_estudiantes !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <button className={s.btn} onClick={() => onSelectCurso(c.id, c.ministerio_id)}>Ver</button>
            </div>
          )
        })
      }
    </div>
  )
}

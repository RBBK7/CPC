import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import s from './shared.module.css'

export default function MinisterioDetalle({ ministerioId, userId, onBack, onSelectCurso }) {
  const [ministerio, setMinisterio] = useState(null)
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [nombre, setNombre] = useState('')
  const [fecha, setFecha] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const [{ data: m }, { data: c }] = await Promise.all([
      supabase.from('ministerios').select('*').eq('id', ministerioId).single(),
      supabase.from('vista_cursos').select('*').eq('ministerio_id', ministerioId).order('fecha_inicio', { ascending: false })
    ])
    setMinisterio(m)
    setCursos(c || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [ministerioId])

  async function save() {
    if (!nombre.trim()) { setError('El nombre es requerido'); return }
    if (!fecha) { setError('La fecha de inicio es requerida'); return }
    setSaving(true)
    const { error: err } = await supabase.from('cursos').insert({
      ministerio_id: ministerioId,
      nombre: nombre.trim(),
      fecha_inicio: fecha,
      creado_por: userId
    })
    if (err) { setError('Error al guardar'); setSaving(false); return }
    setModal(false); setNombre(''); setFecha(''); setError('')
    setSaving(false); load()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este curso y sus estudiantes?')) return
    await supabase.from('cursos').delete().eq('id', id)
    load()
  }

  if (loading) return <div className={s.empty}>Cargando...</div>

  return (
    <div>
      <button className={s.backBtn} onClick={onBack}>← Volver</button>
      <div className={s.card}>
        <div className={s.header}>
          <div>
            <div className={s.sectionTitle}>{ministerio?.nombre}</div>
            {ministerio?.descripcion && <div className={s.sectionSub}>{ministerio.descripcion}</div>}
          </div>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setModal(true)}>+ Nuevo curso</button>
        </div>

        {cursos.length === 0
          ? <div className={s.empty}>No hay cursos en este ministerio.<br />Crea el primero.</div>
          : cursos.map(c => {
            const fecha = new Date(c.fecha_inicio + 'T00:00:00').toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })
            return (
              <div className={s.listItem} key={c.id}>
                <div>
                  <div className={s.itemTitle}>{c.curso}</div>
                  <div className={s.itemSub}>
                    Inicio: {fecha} &nbsp;
                    <span className={s.chip}>{c.total_estudiantes} estudiante{c.total_estudiantes !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className={s.actions}>
                  <button className={s.btn} onClick={() => onSelectCurso(c.id)}>Ver estudiantes</button>
                  {c.creado_por === userId && (
                    <button className={`${s.btn} ${s.btnDanger}`} onClick={() => eliminar(c.id)}>Eliminar</button>
                  )}
                </div>
              </div>
            )
          })
        }
      </div>

      {modal && (
        <div className={s.modalBg} onClick={() => setModal(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalTitle}>Nuevo curso</div>
            <div className={s.field}>
              <label>Nombre del curso *</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Fundamentos de Fe" />
            </div>
            <div className={s.field}>
              <label>Fecha de inicio *</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            {error && <p className={s.error}>{error}</p>}
            <div className={s.modalActions}>
              <button className={s.btn} onClick={() => { setModal(false); setError('') }}>Cancelar</button>
              <button className={`${s.btn} ${s.btnPrimary}`} onClick={save} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

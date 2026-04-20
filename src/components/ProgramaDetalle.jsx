import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import s from './shared.module.css'

export default function ProgramaDetalle({ programaId, userId, onBack }) {
  const [programa, setPrograma] = useState(null)
  const [estudiantes, setEstudiantes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const [{ data: p }, { data: e }] = await Promise.all([
      supabase.from('vista_programas').select('*').eq('id', programaId).single(),
      supabase.from('estudiantes').select('*').eq('programa_id', programaId).order('agregado_en', { ascending: true })
    ])
    setPrograma(p)
    setEstudiantes(e || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [programaId])

  async function agregar() {
    if (!nombre.trim()) { setError('El nombre es requerido'); return }
    setSaving(true)
    const { error: err } = await supabase.from('estudiantes').insert({
      programa_id: programaId,
      nombre: nombre.trim(),
      agregado_por: userId
    })
    if (err) { setError('Error al guardar'); setSaving(false); return }
    setModal(false); setNombre(''); setError(''); setSaving(false); load()
  }

  async function quitar(id, agregadoPor) {
    if (agregadoPor !== userId) { alert('Solo quien agregó a este estudiante puede quitarlo.'); return }
    if (!confirm('¿Quitar a este estudiante?')) return
    await supabase.from('estudiantes').delete().eq('id', id)
    load()
  }

  if (loading) return <div className={s.empty}>Cargando...</div>

  const fechaInicio = programa?.fecha_inicio
    ? new Date(programa.fecha_inicio + 'T00:00:00').toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  return (
    <div>
      <button className={s.backBtn} onClick={onBack}>← {programa?.ministerio || 'Volver'}</button>
      <div className={s.card}>
        <div className={s.header}>
          <div>
            <div className={s.sectionTitle}>{programa?.programa}</div>
            <div className={s.sectionSub}>Inicio: {fechaInicio}</div>
          </div>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setModal(true)}>+ Añadir estudiante</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
          <span className={`${s.badge} ${s.badgeBlue}`}>{estudiantes.length} estudiante{estudiantes.length !== 1 ? 's' : ''}</span>
          {programa?.ministerio && <span className={`${s.badge} ${s.badgeGray}`}>{programa.ministerio}</span>}
        </div>

        {estudiantes.length === 0
          ? <div className={s.empty}>No hay estudiantes registrados.<br />Agrega el primero.</div>
          : estudiantes.map((e, i) => (
            <div className={s.studentItem} key={e.id}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className={s.studentNum}>{i + 1}</div>
                <span className={s.studentName}>{e.nombre}</span>
              </div>
              <button className={`${s.btn} ${s.btnDanger}`} onClick={() => quitar(e.id, e.agregado_por)}>Quitar</button>
            </div>
          ))
        }
      </div>

      {modal && (
        <div className={s.modalBg} onClick={() => setModal(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalTitle}>Añadir estudiante</div>
            <div className={s.field}>
              <label>Nombre completo *</label>
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: María González"
                onKeyDown={e => e.key === 'Enter' && agregar()}
                autoFocus
              />
            </div>
            {error && <p className={s.error}>{error}</p>}
            <div className={s.modalActions}>
              <button className={s.btn} onClick={() => { setModal(false); setError('') }}>Cancelar</button>
              <button className={`${s.btn} ${s.btnPrimary}`} onClick={agregar} disabled={saving}>
                {saving ? 'Guardando...' : 'Añadir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

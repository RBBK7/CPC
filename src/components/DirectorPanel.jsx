import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ProgramaDetalle from './ProgramaDetalle'
import s from './shared.module.css'

export default function DirectorPanel({ userId }) {
  const [ministerios, setMinisterios] = useState([])
  const [selectedMin, setSelectedMin] = useState(null)
  const [programas, setProgramas] = useState([])
  const [selectedProg, setSelectedProg] = useState(null)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data: asig } = await supabase
      .from('asignaciones')
      .select('ministerio_id, ministerios(id, nombre, descripcion)')
      .eq('director_id', userId)
    const mins = (asig || []).map(a => a.ministerios).filter(Boolean)
    setMinisterios(mins)
    setLoading(false)
  }

  async function loadProgramas(minId) {
    const { data } = await supabase
      .from('vista_programas')
      .select('*')
      .eq('ministerio_id', minId)
      .order('fecha_inicio', { ascending: false })
    setProgramas(data || [])
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (selectedMin) loadProgramas(selectedMin.id) }, [selectedMin])

  async function crearPrograma() {
    if (!form.nombre?.trim()) { setError('El nombre es requerido'); return }
    if (!form.fecha_inicio) { setError('La fecha de inicio es requerida'); return }
    setSaving(true)
    const { error: err } = await supabase.from('programas').insert({
      ministerio_id: selectedMin.id,
      nombre: form.nombre.trim(),
      fecha_inicio: form.fecha_inicio,
      creado_por: userId
    })
    if (err) { setError('Error al guardar. Verifica que estás asignado a este ministerio.'); setSaving(false); return }
    setSaving(false); setModal(false); setForm({}); setError('')
    loadProgramas(selectedMin.id)
  }

  async function eliminarPrograma(id) {
    if (!confirm('¿Eliminar este programa?')) return
    await supabase.from('programas').delete().eq('id', id)
    loadProgramas(selectedMin.id)
  }

  if (loading) return <div className={s.empty}>Cargando...</div>

  if (selectedProg) return (
    <ProgramaDetalle
      programaId={selectedProg}
      userId={userId}
      onBack={() => setSelectedProg(null)}
    />
  )

  if (selectedMin) return (
    <div>
      <button className={s.backBtn} onClick={() => setSelectedMin(null)}>← Mis ministerios</button>
      <div className={s.card}>
        <div className={s.header}>
          <div>
            <div className={s.sectionTitle}>{selectedMin.nombre}</div>
            {selectedMin.descripcion && <div className={s.sectionSub}>{selectedMin.descripcion}</div>}
          </div>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setModal(true)}>+ Nuevo programa</button>
        </div>

        {programas.length === 0
          ? <div className={s.empty}>No hay programas aún.<br />Crea el primero.</div>
          : programas.map(p => {
            const fecha = new Date(p.fecha_inicio + 'T00:00:00').toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })
            return (
              <div className={s.listItem} key={p.id}>
                <div>
                  <div className={s.itemTitle}>{p.programa}</div>
                  <div className={s.itemSub}>
                    Inicio: {fecha} &nbsp;
                    <span className={s.chip}>{p.total_estudiantes} estudiante{p.total_estudiantes !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className={s.actions}>
                  <button className={s.btn} onClick={() => setSelectedProg(p.id)}>Ver estudiantes</button>
                  {p.creado_por === userId && (
                    <button className={`${s.btn} ${s.btnDanger}`} onClick={() => eliminarPrograma(p.id)}>Eliminar</button>
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
            <div className={s.modalTitle}>Nuevo programa</div>
            <div className={s.field}>
              <label>Nombre del programa *</label>
              <input value={form.nombre || ''} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Fundamentos de Fe" />
            </div>
            <div className={s.field}>
              <label>Fecha de inicio *</label>
              <input type="date" value={form.fecha_inicio || ''} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} />
            </div>
            {error && <p className={s.error}>{error}</p>}
            <div className={s.modalActions}>
              <button className={s.btn} onClick={() => { setModal(false); setError('') }}>Cancelar</button>
              <button className={`${s.btn} ${s.btnPrimary}`} onClick={crearPrograma} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className={s.card}>
      <div className={s.header}>
        <span className={s.sectionTitle}>Mis ministerios</span>
        <span className={`${s.badge} ${s.badgeGray}`}>{ministerios.length} asignado{ministerios.length !== 1 ? 's' : ''}</span>
      </div>
      {ministerios.length === 0
        ? <div className={s.empty}>No tienes ministerios asignados aún.<br />El administrador debe asignarte uno.</div>
        : ministerios.map(m => (
          <div className={s.listItem} key={m.id}>
            <div>
              <div className={s.itemTitle}>{m.nombre}</div>
              {m.descripcion && <div className={s.itemSub}>{m.descripcion}</div>}
            </div>
            <button className={s.btn} onClick={() => setSelectedMin(m)}>Ver programas</button>
          </div>
        ))
      }
    </div>
  )
}

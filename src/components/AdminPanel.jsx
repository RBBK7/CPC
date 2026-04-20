import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ProgramaDetalle from './ProgramaDetalle'
import s from './shared.module.css'

export default function AdminPanel({ userId }) {
  const [tab, setTab] = useState('ministerios')
  const [ministerios, setMinisterios] = useState([])
  const [directores, setDirectores] = useState([])
  const [selectedMin, setSelectedMin] = useState(null)
  const [selectedProg, setSelectedProg] = useState(null)
  const [programas, setProgramas] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  async function load() {
    const [{ data: m }, { data: d }] = await Promise.all([
      supabase.from('vista_ministerios').select('*').order('creado_en', { ascending: false }),
      supabase.from('vista_directores').select('*').order('nombre')
    ])
    setMinisterios(m || [])
    setDirectores(d || [])
    setLoading(false)
  }

  async function loadProgramas(minId) {
    const { data } = await supabase.from('vista_programas').select('*').eq('ministerio_id', minId).order('fecha_inicio', { ascending: false })
    setProgramas(data || [])
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (selectedMin) loadProgramas(selectedMin.id) }, [selectedMin])

  function openModal(tipo, extra = {}) { setModal(tipo); setForm(extra); setError('') }
  function closeModal() { setModal(null); setForm({}); setError('') }

  async function crearMinisterio() {
    if (!form.nombre?.trim()) { setError('El nombre es requerido'); return }
    setSaving(true)
    const { error: err } = await supabase.from('ministerios').insert({
      nombre: form.nombre.trim(),
      descripcion: form.descripcion?.trim() || null,
      creado_por: userId
    })
    if (err) { setError('Error al guardar'); setSaving(false); return }
    setSaving(false); closeModal(); load()
  }

  async function eliminarMinisterio(id) {
    if (!confirm('¿Eliminar este ministerio y todos sus programas?')) return
    await supabase.from('ministerios').delete().eq('id', id)
    load()
  }

  async function asignarDirector() {
    if (!form.director_id) { setError('Selecciona un director'); return }
    setSaving(true)
    const { error: err } = await supabase.from('asignaciones').insert({
      ministerio_id: form.ministerio_id,
      director_id: form.director_id
    })
    if (err) { setError('Ya está asignado o error al guardar'); setSaving(false); return }
    setSaving(false); closeModal(); load()
  }

  async function quitarAsignacion(ministerioId, directorId) {
    if (!confirm('¿Quitar esta asignación?')) return
    await supabase.from('asignaciones').delete()
      .eq('ministerio_id', ministerioId)
      .eq('director_id', directorId)
    load()
  }

  async function eliminarPrograma(id) {
    if (!confirm('¿Eliminar este programa?')) return
    await supabase.from('programas').delete().eq('id', id)
    loadProgramas(selectedMin.id)
  }

  if (loading) return <div className={s.empty}>Cargando...</div>

  // Vista detalle programa
  if (selectedProg) return (
    <ProgramaDetalle
      programaId={selectedProg}
      userId={userId}
      onBack={() => setSelectedProg(null)}
    />
  )

  // Vista detalle ministerio
  if (selectedMin) return (
    <div>
      <button className={s.backBtn} onClick={() => setSelectedMin(null)}>← Ministerios</button>

      <div className={s.card} style={{ marginBottom: '1rem' }}>
        <div className={s.header}>
          <div>
            <div className={s.sectionTitle}>{selectedMin.nombre}</div>
            {selectedMin.descripcion && <div className={s.sectionSub}>{selectedMin.descripcion}</div>}
          </div>
          <button className={`${s.btn} ${s.btnPrimary}`}
            onClick={() => openModal('asignar', { ministerio_id: selectedMin.id })}>
            + Asignar director
          </button>
        </div>

        <div className={s.sectionSub} style={{ marginBottom: 8 }}>Directores asignados</div>
        {directores.filter(d => d.ministerios_asignados?.includes(selectedMin.nombre)).length === 0
          ? <div className={s.empty} style={{ padding: '1rem' }}>Sin directores asignados.</div>
          : directores.filter(d => d.ministerios_asignados?.includes(selectedMin.nombre)).map(d => (
            <div className={s.listItem} key={d.id}>
              <div className={s.itemTitle}>{d.nombre}</div>
              <button className={`${s.btn} ${s.btnDanger}`}
                onClick={() => quitarAsignacion(selectedMin.id, d.id)}>Quitar</button>
            </div>
          ))
        }
      </div>

      <div className={s.card}>
        <div className={s.header}>
          <span className={s.sectionTitle}>Programas</span>
          <span className={`${s.badge} ${s.badgeGray}`}>{programas.length} total</span>
        </div>
        {programas.length === 0
          ? <div className={s.empty}>No hay programas. Los directores asignados pueden crearlos.</div>
          : programas.map(p => {
            const fecha = new Date(p.fecha_inicio + 'T00:00:00').toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })
            return (
              <div className={s.listItem} key={p.id}>
                <div>
                  <div className={s.itemTitle}>{p.programa}</div>
                  <div className={s.itemSub}>Inicio: {fecha} &nbsp;
                    <span className={s.chip}>{p.total_estudiantes} estudiante{p.total_estudiantes !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className={s.actions}>
                  <button className={s.btn} onClick={() => setSelectedProg(p.id)}>Ver</button>
                  <button className={`${s.btn} ${s.btnDanger}`} onClick={() => eliminarPrograma(p.id)}>Eliminar</button>
                </div>
              </div>
            )
          })
        }
      </div>

      {modal === 'asignar' && (
        <div className={s.modalBg} onClick={closeModal}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalTitle}>Asignar director</div>
            <div className={s.field}>
              <label>Director</label>
              <select value={form.director_id || ''} onChange={e => setForm({ ...form, director_id: e.target.value })}>
                <option value=''>Selecciona un director...</option>
                {directores.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </div>
            {error && <p className={s.error}>{error}</p>}
            <div className={s.modalActions}>
              <button className={s.btn} onClick={closeModal}>Cancelar</button>
              <button className={`${s.btn} ${s.btnPrimary}`} onClick={asignarDirector} disabled={saving}>
                {saving ? 'Guardando...' : 'Asignar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Vista principal admin
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '0.5px solid #e0dfd8' }}>
        {['ministerios', 'directores'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '6px 16px', borderRadius: 20, border: 'none', background: tab === t ? '#1c1c1a' : 'transparent', color: tab === t ? '#fff' : '#6b6b67', cursor: 'pointer', fontSize: 13 }}>
            {t === 'ministerios' ? 'Ministerios' : 'Directores'}
          </button>
        ))}
      </div>

      {tab === 'ministerios' && (
        <div className={s.card}>
          <div className={s.header}>
            <span className={s.sectionTitle}>Ministerios / Centros</span>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => openModal('ministerio')}>+ Nuevo</button>
          </div>
          {ministerios.length === 0
            ? <div className={s.empty}>No hay ministerios. Crea el primero.</div>
            : ministerios.map(m => (
              <div className={s.listItem} key={m.id}>
                <div>
                  <div className={s.itemTitle}>{m.nombre}</div>
                  <div className={s.itemSub}>
                    {m.descripcion && <>{m.descripcion} · </>}
                    <span className={s.chip}>{m.total_programas} programa{m.total_programas !== 1 ? 's' : ''}</span>
                    &nbsp;<span className={s.chip}>{m.total_directores} director{m.total_directores !== 1 ? 'es' : ''}</span>
                  </div>
                </div>
                <div className={s.actions}>
                  <button className={s.btn} onClick={() => setSelectedMin(m)}>Gestionar</button>
                  <button className={`${s.btn} ${s.btnDanger}`} onClick={() => eliminarMinisterio(m.id)}>Eliminar</button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {tab === 'directores' && (
        <div className={s.card}>
          <div className={s.header}>
            <span className={s.sectionTitle}>Directores registrados</span>
            <span className={`${s.badge} ${s.badgeGray}`}>{directores.length} total</span>
          </div>
          {directores.length === 0
            ? <div className={s.empty}>No hay directores registrados aún.</div>
            : directores.map(d => (
              <div className={s.listItem} key={d.id}>
                <div>
                  <div className={s.itemTitle}>{d.nombre}</div>
                  <div className={s.itemSub}>
                    {d.total_asignaciones === 0
                      ? 'Sin ministerios asignados'
                      : d.ministerios_asignados?.join(', ')
                    }
                  </div>
                </div>
                <span className={`${s.badge} ${s.badgeGreen}`}>{d.total_asignaciones} asignación{d.total_asignaciones !== 1 ? 'es' : ''}</span>
              </div>
            ))
          }
        </div>
      )}

      {modal === 'ministerio' && (
        <div className={s.modalBg} onClick={closeModal}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalTitle}>Nuevo ministerio / centro</div>
            <div className={s.field}>
              <label>Nombre *</label>
              <input value={form.nombre || ''} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Ministerio de Jóvenes" />
            </div>
            <div className={s.field}>
              <label>Descripción (opcional)</label>
              <input value={form.descripcion || ''} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción breve" />
            </div>
            {error && <p className={s.error}>{error}</p>}
            <div className={s.modalActions}>
              <button className={s.btn} onClick={closeModal}>Cancelar</button>
              <button className={`${s.btn} ${s.btnPrimary}`} onClick={crearMinisterio} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

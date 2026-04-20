import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import s from './shared.module.css'

export default function Ministerios({ userId, onSelect }) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [nombre, setNombre] = useState('')
  const [desc, setDesc] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('vista_ministerios')
      .select('*')
      .order('creado_en', { ascending: false })
    setList(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!nombre.trim()) { setError('El nombre es requerido'); return }
    setSaving(true)
    const { error: err } = await supabase.from('ministerios').insert({
      nombre: nombre.trim(),
      descripcion: desc.trim() || null,
      creado_por: userId
    })
    if (err) { setError('Error al guardar'); setSaving(false); return }
    setModal(false); setNombre(''); setDesc(''); setError('')
    setSaving(false); load()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este ministerio y todos sus cursos?')) return
    await supabase.from('ministerios').delete().eq('id', id)
    load()
  }

  if (loading) return <div className={s.empty}>Cargando...</div>

  return (
    <div className={s.card}>
      <div className={s.header}>
        <span className={s.sectionTitle}>Ministerios / Centros</span>
        <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setModal(true)}>+ Nuevo</button>
      </div>

      {list.length === 0
        ? <div className={s.empty}>No hay ministerios registrados.<br />Crea el primero.</div>
        : list.map(m => (
          <div className={s.listItem} key={m.id}>
            <div>
              <div className={s.itemTitle}>{m.nombre}</div>
              <div className={s.itemSub}>
                {m.descripcion && <>{m.descripcion} &nbsp;</>}
                <span className={s.chip}>{m.total_cursos} curso{m.total_cursos !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className={s.actions}>
              <button className={s.btn} onClick={() => onSelect(m.id)}>Ver cursos</button>
              {m.creado_por === userId && (
                <button className={`${s.btn} ${s.btnDanger}`} onClick={() => eliminar(m.id)}>Eliminar</button>
              )}
            </div>
          </div>
        ))
      }

      {modal && (
        <div className={s.modalBg} onClick={() => setModal(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalTitle}>Nuevo ministerio / centro</div>
            <div className={s.field}>
              <label>Nombre *</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Ministerio de Jóvenes" />
            </div>
            <div className={s.field}>
              <label>Descripción (opcional)</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción breve" />
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

// src/features/search/SearchOverlay.tsx
import React, { useEffect, useState, useCallback } from 'react'
import { runSearch, ensureIndex, type SearchRecord } from './searchEngine'

const wrap: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 9999, background: '#080a14', color: '#e8eaf0', overflowY: 'auto', padding: 20, direction: 'rtl' }
const box: React.CSSProperties = { maxWidth: 720, margin: '0 auto' }
const header: React.CSSProperties = { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, position: 'sticky', top: 0, background: '#080a14', paddingBlock: 8 }
const inputStyle: React.CSSProperties = { flex: 1, padding: '14px 18px', borderRadius: 14, border: '1px solid #2a2f45', background: '#11162a', color: '#fff', fontSize: '1.05rem' }
const closeBtn: React.CSSProperties = { background: '#1b2036', color: '#fff', border: 'none', borderRadius: 10, width: 44, height: 44, cursor: 'pointer', fontSize: '1rem' }
const rowStyle: React.CSSProperties = { display: 'flex', gap: 12, alignItems: 'center', padding: '10px 8px', borderBottom: '1px solid #1b2036', textDecoration: 'none', color: '#e8eaf0' }
const imgStyle: React.CSSProperties = { width: 52, height: 52, borderRadius: 10, objectFit: 'cover', background: '#1b2036', flex: '0 0 auto' }
const artistStyle: React.CSSProperties = { opacity: 0.65 }
const badgeStyle: React.CSSProperties = { fontSize: '0.7rem', opacity: 0.7, marginInlineStart: 'auto', whiteSpace: 'nowrap' }

const LABEL: Record<string, string> = { song: 'أغنية NL', library: 'مكتبة', video: 'فيديو', game: 'لعبة' }

function currentQ(): string {
  return new URLSearchParams(window.location.search).get('q') || ''
}
function syncUrl(q: string) {
  const p = new URLSearchParams(window.location.search)
  if (q) p.set('q', q); else p.delete('q')
  const qs = p.toString()
  window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''))
}

export default function SearchOverlay({ onClose }: { onClose?: () => void }) {
  const [q, setQ] = useState<string>(currentQ())
  const [hits, setHits] = useState<SearchRecord[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  const doSearch = useCallback((term: string) => {
    setLoading(true)
    runSearch(term).then((r) => { setHits(r); setLoading(false) })
  }, [])

  useEffect(() => { ensureIndex(); doSearch(q) }, []) // تحميل الفهرس وبحث أولي

  useEffect(() => {
    const id = setTimeout(() => { syncUrl(q); doSearch(q) }, 200) // debounce
    return () => clearTimeout(id)
  }, [q, doSearch])

  return (
    <div style={wrap} role="dialog" aria-label="بحث NL">
      <div style={box}>
        <div style={header}>
          <input autoFocus style={inputStyle} value={q} placeholder="ابحث عن أغنية أو فنان أو فيديو…" onChange={(e) => setQ(e.target.value)} />
          <button style={closeBtn} onClick={onClose} aria-label="إغلاق">✕</button>
        </div>
        {loading ? <p>جارٍ البحث…</p> : null}
        {!loading && q && hits.length === 0 ? <p>لا نتائج لـ«{q}».</p> : null}
        {hits.map((h) => (
          <a key={h.t + ':' + h.id} href={h.link} style={rowStyle}>
            {h.cover ? <img src={h.cover} alt={h.title} style={imgStyle} loading="lazy" /> : <span style={imgStyle} />}
            <span>
              <strong>{h.title}</strong>
              {h.artist ? <span style={artistStyle}> — {h.artist}</span> : null}
            </span>
            <span style={badgeStyle}>{LABEL[h.t] || h.t}</span>
          </a>
        ))}
      </div>
    </div>
  )
}

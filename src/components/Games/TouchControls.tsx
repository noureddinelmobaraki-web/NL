import { useCallback } from 'react';

interface KeyDef { label: string; code: string; key: string; }

const DIRECTIONS: Array<[string, KeyDef]> = [
  ['up',    { label: '▲', code: 'ArrowUp',    key: 'ArrowUp' }],
  ['left',  { label: '◀', code: 'ArrowLeft',  key: 'ArrowLeft' }],
  ['right', { label: '▶', code: 'ArrowRight', key: 'ArrowRight' }],
  ['down',  { label: '▼', code: 'ArrowDown',  key: 'ArrowDown' }],
];

const LETTERS: KeyDef[] = [
  { label: 'W', code: 'KeyW', key: 'w' },
  { label: 'A', code: 'KeyA', key: 'a' },
  { label: 'S', code: 'KeyS', key: 's' },
  { label: 'Z', code: 'KeyZ', key: 'z' },
  { label: '␣', code: 'Space', key: ' ' },
];

function sendKey(playerEl: any, type: 'keydown' | 'keyup', def: KeyDef) {
  if (!playerEl) return;
  try { playerEl.focus?.(); } catch {}
  const ev = new KeyboardEvent(type, {
    key: def.key, code: def.code, bubbles: true, cancelable: true, composed: true,
  });
  playerEl.dispatchEvent(ev);
}

interface TouchControlsProps { playerRef: React.MutableRefObject<any>; }

export function TouchControls({ playerRef }: TouchControlsProps) {
  const handlers = useCallback((def: KeyDef) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); sendKey(playerRef.current, 'keydown', def); },
    onPointerUp:   (e: React.PointerEvent) => { e.preventDefault(); sendKey(playerRef.current, 'keyup', def); },
    onPointerLeave: () => { sendKey(playerRef.current, 'keyup', def); },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  }), [playerRef]);

  return (
    <div className="nl-touch" aria-hidden="true">
      <div className="nl-dpad">
        {DIRECTIONS.map(([pos, def]) => (
          <button key={pos} type="button" className={`nl-touch-btn nl-dpad-${pos}`} {...handlers(def)}>{def.label}</button>
        ))}
      </div>
      <div className="nl-keys">
        {LETTERS.map((def) => (
          <button key={def.code} type="button" className="nl-touch-btn" {...handlers(def)}>{def.label}</button>
        ))}
      </div>
    </div>
  );
}

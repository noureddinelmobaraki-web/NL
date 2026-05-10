import { useEffect, useState, useRef } from 'react';
type Phase = 'visible' | 'fading' | 'hidden';
export const LoadingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [phase, setPhase] = useState<Phase>('visible');
  const [dots, setDots] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(false);
  useEffect(() => {
    let count = 0;
    const iv = setInterval(() => { count = (count + 1) % 4; setDots('.'.repeat(count)); }, 400);
    return () => clearInterval(iv);
  }, []);
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase('fading');
    setTimeout(() => { setPhase('hidden'); onComplete(); }, 600);
  };
  useEffect(() => {
    const t = setTimeout(finish, 5000);
    return () => clearTimeout(t);
  }, []);
  if (phase === 'hidden') return null;
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'black',
      opacity: phase === 'fading' ? 0 : 1, transition:'opacity 600ms ease-out',
      display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
      <video ref={videoRef} src={`${import.meta.env.BASE_URL}videos/opening.mp4`} autoPlay muted playsInline
        preload="auto" onEnded={finish}
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
      <div style={{ position:'relative', zIndex:1, color:'white',
        fontSize:'clamp(3rem, 10vw, 6rem)', fontWeight:'bold', letterSpacing:'0.2em' }}>
        NL{dots}
      </div>
    </div>
  );
};

// src/components/launcher/ConnectorLayer.tsx
// الأشعّة الزجاجية. كل حافة تُرسم بخطين مكدّسين:
//   1) “glow” عريض شفّاف متدرّج (توهّج frutiger-aero)
//   2) “core” رفيع ساطع
// لا يُستعمل أي مرشّح SVG: تحريك pathLength على مسار مُرشّح أجبر الهاتف على
// إعادة رسترة منطقة feGaussianBlur كبيرة في كل إطار (CPU) → تجمّد لحظة
// تفرّع الفروع. الخطّان المكدّسان (شفّاف عريض + ساطع رفيع) يعطيان
// التوهّج الزجاجي دون أي مرشّح gaussian.
//
// motion props تُمرّر كمتغيّرات قوس مفرد (لا كائنات قوس مزدوج مضمّنة).

import { motion, AnimatePresence } from 'framer-motion';
import type { Edge } from './graph.geometry';
import type { Size } from './useStageSize';
import { ease } from '../../motion/tokens';

interface ConnectorLayerProps {
  edges: Edge[];
  size: Size;
  reduced: boolean;
}

const groupInit = { opacity: 0 };
const groupAnim = { opacity: 1 };
const groupExit = { opacity: 0, transition: { duration: 0.18 } };
const rayExit = { opacity: 0 };

export function ConnectorLayer({ edges, size, reduced }: ConnectorLayerProps) {
  const { w, h } = size;
  if (w === 0 || h === 0) return null;

  // على الهاتف (أو reduce-motion) نتخطّى رسم pathLength نهائياً ونكتفي بتلاشٍ
  // للشعاع الجاهز = صفر عمل هندسي لكل إطار.
  const lite = reduced || (w > 0 && w < 768);
  const rayInit = lite ? { opacity: 0 } : { pathLength: 0, opacity: 0 };
  const glowAnim = lite ? { opacity: 0.55 } : { pathLength: 1, opacity: 0.55 };
  const coreAnim = lite ? { opacity: 0.95 } : { pathLength: 1, opacity: 0.95 };
  const rayTrans = lite
    ? { opacity: { duration: 0.2 } }
    : { pathLength: { duration: 0.5, ease: ease.out }, opacity: { duration: 0.2 } };

  return (
    <svg
      className="nl-graph-links"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="nlRayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#bff6d8" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#5fe0a8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#6fd0ff" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      <AnimatePresence>
        {edges.map((edge) => (
          <motion.g key={edge.id} initial={groupInit} animate={groupAnim} exit={groupExit}>
            <motion.path
              d={edge.path}
              className="nl-ray-glow"
              stroke="url(#nlRayGrad)"
              strokeWidth={edge.depth === 1 ? 9 : 7}
              strokeLinecap="round"
              initial={rayInit}
              animate={glowAnim}
              exit={rayExit}
              transition={rayTrans}
            />
            <motion.path
              d={edge.path}
              className="nl-ray-core"
              stroke="#eafff5"
              strokeWidth={edge.depth === 1 ? 2.4 : 1.8}
              strokeLinecap="round"
              initial={rayInit}
              animate={coreAnim}
              exit={rayExit}
              transition={rayTrans}
            />
          </motion.g>
        ))}
      </AnimatePresence>
    </svg>
  );
}

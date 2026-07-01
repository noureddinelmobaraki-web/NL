import { useTranslation } from 'react-i18next';
import { Sliders, X } from 'lucide-react';
import { useMusicStore } from '../store/musicStore';
import { EQ_FREQS, EQ_PRESETS } from '../engine/eqPresets';

export function EqualizerPanel({ onClose }: { onClose?: () => void } = {}) {
  const { t } = useTranslation();
  const {
    eqGains,
    eqPreset,
    eqBypass,
    rate,
    pan,
    crossfadeSec,
    actions
  } = useMusicStore();

  const formatHz = (freq: number) => {
    return freq >= 1000 ? `${freq / 1000}kHz` : `${freq}Hz`;
  };

  return (
    <div className="relative p-3 md:p-4 rounded-xl bg-[rgba(14,22,46,0.85)] border border-white/20 backdrop-blur-[20px] shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_8px_30px_rgba(0,0,0,0.5)] flex flex-col gap-4">
      {onClose && (
        <button type="button" className="nl-glass-close" onClick={onClose} aria-label="إغلاق">
          <X size={16} />
        </button>
      )}
      {/* Header and Preset Picker */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <Sliders className="text-white w-4 h-4" />
          <h3 className="font-sans font-bold text-sm text-white drop-shadow-sm">
            Graphic Equalizer & DSP
          </h3>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Preset Selector */}
          <select
            value={eqPreset}
            onChange={(e) => actions.setEqPreset(e.target.value)}
            disabled={eqBypass}
            className="flex-grow sm:flex-none py-1 px-2 bg-white text-black border border-slate-400 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)] rounded-sm text-xs font-sans outline-none disabled:opacity-50"
          >
            {Object.keys(EQ_PRESETS).map((preset) => (
              <option key={preset} value={preset}>
                {preset}
              </option>
            ))}
            <option value="Custom" disabled>{t('music.custom') || 'Custom'}</option>
          </select>

          {/* Bypass Toggle */}
          <button
            type="button"
            onClick={() => actions.setEqBypass(!eqBypass)}
            className={`px-2 py-1 border border-slate-500 rounded-sm text-[10px] uppercase font-bold shadow-[inset_1px_1px_0_rgba(255,255,255,0.7)] ${
              eqBypass
                ? 'bg-gradient-to-b from-[#f0f0f0] to-[#c0c0c0] text-black'
                : 'bg-gradient-to-b from-[#8ec1ff] to-[#4d93e8] text-white border-[#2166c8]'
            }`}
          >
            {eqBypass ? 'Bypassed' : 'Active'}
          </button>
        </div>
      </div>

      {/* Live Curve + 10-Band Sliders Grid */}
      <div className="relative pt-2">
        {eqBypass && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] rounded flex items-center justify-center z-10">
            <p className="text-yellow-100 text-xs font-bold bg-black/80 px-3 py-1 rounded border border-yellow-500 shadow-md">
              EQ Bypassed
            </p>
          </div>
        )}

        {/* Live curve abstraction placeholder */}
        <div className="w-full h-12 bg-[#000022] border border-white/20 mb-3 relative overflow-hidden rounded-sm shadow-[inset_0_0_8px_rgba(0,0,0,0.8)]">
           <svg width="100%" height="100%" preserveAspectRatio="none" className="absolute inset-0">
             <path 
               d={`M 0,24 ${EQ_FREQS.map((_, i) => `L ${((i+0.5)/10)*100}%,${24 - (eqGains[i]||0)}`).join(' ')} L 100%,24`}
               fill="none" 
               stroke="#00ff00" 
               strokeWidth="1.5" 
               vectorEffect="non-scaling-stroke"
               style={{ filter: 'drop-shadow(0 0 2px #00ff00)' }}
             />
           </svg>
           {/* Grid lines */}
           <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:10px_10px]" />
        </div>

        <div className="flex justify-between items-end bg-transparent h-[120px] px-1 md:px-4">
          {EQ_FREQS.map((freq, i) => {
            const gain = eqGains[i] ?? 0;
            return (
              <div key={freq} className="flex flex-col items-center gap-1 w-full relative group">
                {/* dB Readout (hover) */}
                <span className="absolute -top-6 text-[9px] font-mono bg-[#ffffe1] text-black border border-black px-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                  {gain > 0 ? `+${gain.toFixed(0)}dB` : `${gain.toFixed(0)}dB`}
                </span>

                {/* Vertical Range Slider */}
                <div className="h-24 w-5 flex justify-center items-center relative">
                  <div className="absolute w-[3px] h-full bg-black/60 border-r border-white/20 rounded-full" />
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="1"
                    value={gain}
                    onChange={(e) => actions.setEqGain(i, parseFloat(e.target.value))}
                    disabled={eqBypass}
                    className="absolute w-24 h-5 -rotate-90 appearance-none bg-transparent cursor-pointer z-10"
                    style={{
                      WebkitAppearance: 'none'
                    }}
                  />
                  {/* Fake thumb */}
                  <div 
                    className="absolute w-5 h-2.5 bg-gradient-to-b from-[#f0f0f0] to-[#a0a0a0] border border-[#555] rounded-sm pointer-events-none shadow-[0_1px_3px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.8)]"
                    style={{ bottom: `${((gain + 12) / 24) * 100}%`, transform: 'translateY(50%)' }}
                  >
                    <div className="w-full h-[1px] bg-black/40 absolute top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Frequency Label */}
                <span className="text-[9px] text-[#8ec1ff] font-mono tracking-tighter select-none mt-1">
                  {formatHz(freq)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid of secondary DSP controls: Speed, Pan, Crossfade */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-white/10 pt-3">
        {/* Speed / Rate control */}
        <div className="bg-black/30 border border-white/5 p-2 rounded shadow-inner flex flex-col gap-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-white drop-shadow-md">
            <span>{t('music.speed') || 'Playback Speed'}</span>
            <span className="font-mono text-[#8ec1ff]">{rate.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.05"
            value={rate}
            onChange={(e) => actions.setRate(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
          />
          <div className="flex justify-between text-[9px] text-[#8ec1ff] font-mono">
            <span>0.5x</span>
            <span>1.0x (Normal)</span>
            <span>2.0x</span>
          </div>
        </div>

        {/* Panning Control */}
        <div className="bg-black/30 border border-white/5 p-2 rounded shadow-inner flex flex-col gap-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-white drop-shadow-md">
            <span>{t('music.panning') || 'Stereo Panning'}</span>
            <span className="font-mono text-[#8ec1ff]">
              {pan === 0 ? 'Center' : pan < 0 ? `L ${(Math.abs(pan) * 100).toFixed(0)}%` : `R ${(pan * 100).toFixed(0)}%`}
            </span>
          </div>
          <input
            type="range"
            min="-1.0"
            max="1.0"
            step="0.1"
            value={pan}
            onChange={(e) => actions.setPan(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
          />
          <div className="flex justify-between text-[9px] text-[#8ec1ff] font-mono">
            <span>Left</span>
            <span>Center</span>
            <span>Right</span>
          </div>
        </div>

        {/* Crossfade Sec Control */}
        <div className="bg-black/30 border border-white/5 p-2 rounded shadow-inner flex flex-col gap-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-white drop-shadow-md">
            <span>{t('music.crossfade') || 'DJ Crossfade'}</span>
            <span className="font-mono text-[#8ec1ff]">{crossfadeSec}s</span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={crossfadeSec}
            onChange={(e) => actions.setCrossfadeSec(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
          />
          <div className="flex justify-between text-[9px] text-[#8ec1ff] font-mono">
            <span>0s (Cut)</span>
            <span>3s (Smooth)</span>
            <span>10s (Long)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
export default EqualizerPanel;

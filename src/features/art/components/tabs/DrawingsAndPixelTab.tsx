/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Tab 2: Dedicated "My Drawings" (`رسوماتي`) Page + Addition Options (Freehand Canvas, Pixel Art Grid, Upload/Import, & Color Harmony)
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  Brush,
  Download,
  Grid,
  Image as ImageIcon,
  Palette,
  PlusCircle,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  ZoomIn,
} from 'lucide-react';
import type {
  ArtMuseumPiece,
  ColorHarmonyMode,
} from '../../types/art.types';
import { useArtDrawingsStudio } from '../../hooks/useArtDrawingsStudio';
import { useColorPaletteExtractor } from '../../hooks/useColorPaletteExtractor';

export interface DrawingsAndPixelTabProps {
  onInspectDrawing: (piece: ArtMuseumPiece) => void;
}

export const DrawingsAndPixelTab: React.FC<DrawingsAndPixelTabProps> = ({
  onInspectDrawing,
}) => {
  const studio = useArtDrawingsStudio();
  const palette = useColorPaletteExtractor(studio.activeBrushColor);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [pixelCells, setPixelCells] = useState<string[]>(() =>
    Array(16 * 16).fill('#0f172a'),
  );

  // Sync pixel grid size when changed
  useEffect(() => {
    const total = studio.pixelGridSize * studio.pixelGridSize;
    setPixelCells(Array(total).fill('#0f172a'));
  }, [studio.pixelGridSize]);

  // Initialize freehand canvas background
  useEffect(() => {
    if (studio.subView !== 'add-canvas') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [studio.subView]);

  const handleCanvasPointerDown = (
    e: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleCanvasPointerMove = (
    e: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = studio.activeBrushColor;
    ctx.lineWidth = studio.brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = studio.neonGlow ? 14 : 0;
    ctx.shadowColor = studio.activeBrushColor;

    ctx.lineTo(x, y);
    ctx.stroke();

    if (studio.symmetryMode) {
      const mirrorX = canvas.width - x;
      ctx.beginPath();
      ctx.arc(mirrorX, y, studio.brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = studio.activeBrushColor;
      ctx.fill();
    }
  };

  const handleCanvasPointerUp = () => {
    setIsDrawing(false);
  };

  const clearFreehandCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const saveFreehandToMyDrawings = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    studio.addCreatedDrawing(
      newTitle || 'لوحة رقمية حرة — NL Studio',
      dataUrl,
      'مرسومة مباشرة داخل استوديو الرسم الرقمي الحي',
    );
    setNewTitle('');
  };

  const savePixelArtToMyDrawings = () => {
    const n = studio.pixelGridSize;
    const offscreen = document.createElement('canvas');
    offscreen.width = 512;
    offscreen.height = 512;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;
    const cellPx = 512 / n;
    pixelCells.forEach((hex, idx) => {
      const row = Math.floor(idx / n);
      const col = idx % n;
      ctx.fillStyle = hex;
      ctx.fillRect(col * cellPx, row * cellPx, cellPx, cellPx);
    });
    const dataUrl = offscreen.toDataURL('image/png');
    studio.addCreatedDrawing(
      newTitle || `لوحة Pixel Art (${n}×${n})`,
      dataUrl,
      `مصممة في شبكة البيكسل آرت ${n}×${n}`,
    );
    setNewTitle('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        studio.addCreatedDrawing(
          newTitle || file.name.replace(/\.[^.]+$/, ''),
          reader.result,
          'رسمة مرفوعة إلى معرض رسوماتي الخاصة',
        );
        setNewTitle('');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5">
      {/* Primary Sub-Navigation: 1) My Drawings (رسوماتي) first, followed by Addition Options */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900/80 border border-white/12 p-3.5 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => studio.setSubView('my-drawings')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black cursor-pointer transition-all ${
              studio.subView === 'my-drawings'
                ? 'bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-slate-950 shadow-lg shadow-fuchsia-500/20'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            <ImageIcon size={16} />
            <span>رسوماتي (My Drawings · {studio.totalCount})</span>
          </button>

          <div className="h-5 w-px bg-white/15 mx-1 hidden sm:block" />

          <span className="text-xs font-bold text-slate-400">
            خيارات الإضافة والإبداع:
          </span>

          <button
            type="button"
            onClick={() => studio.setSubView('add-canvas')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              studio.subView === 'add-canvas'
                ? 'bg-cyan-500/25 border border-cyan-400/50 text-cyan-200'
                : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Brush size={14} />
            <span>+ إضافة رسمة حرة (Canvas)</span>
          </button>

          <button
            type="button"
            onClick={() => studio.setSubView('add-pixel')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              studio.subView === 'add-pixel'
                ? 'bg-amber-500/25 border border-amber-400/50 text-amber-200'
                : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Grid size={14} />
            <span>+ إضافة لوحة بيكسل (MeBit Pixel)</span>
          </button>

          <button
            type="button"
            onClick={() => studio.setSubView('add-upload')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              studio.subView === 'add-upload'
                ? 'bg-emerald-500/25 border border-emerald-400/50 text-emerald-200'
                : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Upload size={14} />
            <span>+ رفع رسمة من جهازك</span>
          </button>
        </div>
      </div>

      {/* Sub-View 1: MY DRAWINGS (رسوماتي الخاصة ولوحات MeBit) */}
      {studio.subView === 'my-drawings' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {[
                { id: 'all', label: 'كل رسوماتي' },
                { id: 'my-drawings', label: 'الرسومات اليدوية (NL Sketches)' },
                { id: 'mebit', label: 'سلسلة البيكسل (ME Bit)' },
                { id: 'user-created', label: 'الرسومات المضافة حديثاً' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    studio.setCategoryFilter(
                      tab.id as 'all' | 'my-drawings' | 'mebit' | 'user-created',
                    )
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    studio.categoryFilter === tab.id
                      ? 'bg-fuchsia-500/25 border border-fuchsia-400/50 text-fuchsia-200'
                      : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {studio.drawings.map((item) => (
              <div
                key={item.id}
                onClick={() =>
                  onInspectDrawing({
                    id: item.id,
                    source: 'nl-lens',
                    sourceLabel:
                      item.category === 'mebit'
                        ? 'ME Bit Pixel Art'
                        : item.category === 'user-created'
                          ? 'Added Artwork'
                          : 'NL My Drawings',
                    title: item.title,
                    artist: 'Nordine GB (NL)',
                    dateDisplay: item.createdAt || '2026',
                    mediumDisplay: item.description,
                    imageUrl: item.imageUrl,
                    highResUrl: item.imageUrl,
                    dominantHex: item.accentHex,
                  })
                }
                className="group relative flex flex-col overflow-hidden rounded-2xl bg-slate-900/85 border border-white/10 hover:border-fuchsia-400/50 transition-all cursor-pointer shadow-xl"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-slate-950">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/75 border border-white/15 text-[10px] font-bold text-fuchsia-200">
                    {item.category === 'mebit'
                      ? 'ME Bit Series'
                      : item.category === 'user-created'
                        ? 'مضافة'
                        : 'My Drawing'}
                  </span>
                  <button
                    type="button"
                    className="absolute bottom-2.5 right-2.5 p-2 rounded-full bg-fuchsia-500 text-slate-950 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="معاينة الرسمة"
                  >
                    <ZoomIn size={15} />
                  </button>
                </div>

                <div className="p-3.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {item.description}
                    </p>
                  </div>
                  {item.category === 'user-created' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        studio.removeUserDrawing(item.id);
                      }}
                      className="p-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 cursor-pointer"
                      title="حذف الرسمة"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-View 2: FREEHAND DIGITAL CANVAS STUDIO */}
      {studio.subView === 'add-canvas' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex flex-col gap-3 rounded-2xl bg-slate-900/85 border border-white/12 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="عنوان الرسمة الجديدة..."
                className="px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => studio.setNeonGlow((v) => !v)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border ${
                    studio.neonGlow
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                      : 'bg-white/5 border-white/10 text-slate-300'
                  }`}
                >
                  <Sparkles size={13} className="inline mr-1" />
                  فرشاة نيون مضيئة
                </button>
                <button
                  type="button"
                  onClick={() => studio.setSymmetryMode((v) => !v)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border ${
                    studio.symmetryMode
                      ? 'bg-fuchsia-500/25 border-fuchsia-400 text-fuchsia-200'
                      : 'bg-white/5 border-white/10 text-slate-300'
                  }`}
                >
                  رسم متماثل (Symmetry)
                </button>
                <button
                  type="button"
                  onClick={clearFreehandCanvas}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 cursor-pointer"
                  title="مسح اللوحة"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              width={900}
              height={540}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerLeave={handleCanvasPointerUp}
              className="w-full aspect-[16/10] rounded-2xl border border-cyan-400/30 bg-[#090d16] touch-none cursor-crosshair shadow-inner"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <span>حجم الفرشاة ({studio.brushSize}px):</span>
                <input
                  type="range"
                  min={2}
                  max={28}
                  value={studio.brushSize}
                  onChange={(e) => studio.setBrushSize(Number(e.target.value))}
                  className="accent-cyan-400"
                />
              </label>

              <button
                type="button"
                onClick={saveFreehandToMyDrawings}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg"
              >
                <PlusCircle size={15} />
                <span>حفظ وإضافة إلى رسوماتي (My Drawings)</span>
              </button>
            </div>
          </div>

          {/* Live Color Harmony Sidebar powered by The Color API */}
          <div className="rounded-2xl bg-slate-900/85 border border-white/12 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-cyan-200">
                <Palette size={15} />
                <span>تناغم الألوان الحي (The Color API)</span>
              </span>
              <input
                type="color"
                value={studio.activeBrushColor}
                onChange={(e) => {
                  studio.setActiveBrushColor(e.target.value);
                  palette.setSeedHex(e.target.value);
                }}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                ['analogic', 'complement', 'triad', 'monochrome'] as ColorHarmonyMode[]
              ).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => palette.setHarmonyMode(m)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase cursor-pointer ${
                    palette.harmonyMode === m
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-white/5 text-slate-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {palette.swatches.map((sw) => (
                <button
                  key={sw.hex + sw.name}
                  type="button"
                  onClick={() => studio.setActiveBrushColor(sw.hex)}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-black/40 border border-white/10 hover:border-white/30 text-left cursor-pointer"
                >
                  <span
                    className="w-7 h-7 rounded-lg shrink-0 border border-white/20"
                    style={{ backgroundColor: sw.hex }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {sw.hex}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {sw.name}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sub-View 3: MEBIT PIXEL ART GRID STUDIO */}
      {studio.subView === 'add-pixel' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex flex-col items-center gap-4 rounded-2xl bg-slate-900/85 border border-white/12 p-5">
            <div className="w-full flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => studio.setPixelGridSize(16)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    studio.pixelGridSize === 16
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  16 × 16 Grid
                </button>
                <button
                  type="button"
                  onClick={() => studio.setPixelGridSize(32)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    studio.pixelGridSize === 32
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  32 × 32 Grid
                </button>
              </div>

              <button
                type="button"
                onClick={savePixelArtToMyDrawings}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
              >
                <Download size={14} />
                <span>حفظ لوحة البيكسل في رسوماتي</span>
              </button>
            </div>

            <div
              className="grid w-full max-w-[440px] aspect-square border border-white/20 rounded-xl overflow-hidden bg-slate-950"
              style={{
                gridTemplateColumns: `repeat(${studio.pixelGridSize}, minmax(0, 1fr))`,
              }}
            >
              {pixelCells.map((color, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    setPixelCells((prev) => {
                      const next = [...prev];
                      next[idx] = studio.activeBrushColor;
                      return next;
                    })
                  }
                  className="border-[0.5px] border-white/[0.04] cursor-pointer"
                  style={{ backgroundColor: color }}
                  aria-label={`Pixel ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/85 border border-white/12 p-4 space-y-3">
            <h4 className="text-xs font-bold text-amber-200">
              اختر لون البيكسل (Pixel Swatches):
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {palette.swatches.map((sw) => (
                <button
                  key={sw.hex}
                  type="button"
                  onClick={() => studio.setActiveBrushColor(sw.hex)}
                  className="flex items-center gap-2 p-2 rounded-xl bg-black/40 border border-white/10 cursor-pointer"
                >
                  <span
                    className="w-6 h-6 rounded-md"
                    style={{ backgroundColor: sw.hex }}
                  />
                  <span className="text-xs font-bold text-white">{sw.hex}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sub-View 4: UPLOAD / IMPORT NEW DRAWING TO MY DRAWINGS */}
      {studio.subView === 'add-upload' && (
        <div className="max-w-xl mx-auto rounded-2xl bg-slate-900/85 border border-white/12 p-6 text-center space-y-4">
          <Upload size={36} className="mx-auto text-emerald-400" />
          <h3 className="text-base font-bold text-white">
            إضافة رسمة أو عمل فني جديد إلى معرض رسوماتي
          </h3>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="اسم الرسمة (اختياري)..."
            className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white outline-none"
          />
          <label className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer">
            <PlusCircle size={16} />
            <span>اختر ملف صورة (PNG / WEBP / JPG)</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      )}
    </div>
  );
};

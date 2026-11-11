/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Dedicated Integrated Reader for:
 * 1) Al-Quran Al-Kareem (Uthmani Script + Mishary Alafasy Verse-by-Verse Audio)
 * 2) Arabic & World Poetic Diwan (Formatted Two-Column / Stanza Poetic View + TTS)
 * 3) Rare Arabic Manuscripts (RTL Two-Page Spread + Archive Embed Toggle)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Columns,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { BookItem } from '../../../services/types';
import {
  BUILTIN_ARABIC_POEMS,
  fetchQuranSurahList,
  fetchQuranSurahWithAudio,
  type QuranSurahDetail,
} from '../../../services/poetryAndSacredTexts';
import { useManuscriptViewer } from '../hooks/useManuscriptViewer';
import { useBookSpeechTTS } from '../hooks/useBookSpeechTTS';

export interface ManuscriptSpreadModalProps {
  book: BookItem;
}

export const ManuscriptSpreadModal: React.FC<ManuscriptSpreadModalProps> = ({
  book,
}) => {
  const isQuran = book.ext === 'quran' || book.id.startsWith('sacred:quran');
  const isPoetry = book.ext === 'poetry' || book.id.startsWith('poetry');
  const isManuscript = !isQuran && !isPoetry;

  const manuscript = useManuscriptViewer(book.iaId || book.id, isManuscript);
  const tts = useBookSpeechTTS();

  const [useEmbedViewer, setUseEmbedViewer] = useState(false);

  // Quran state
  const [surahList, setSurahList] = useState<
    Array<{ number: number; name: string; englishName: string; numberOfAyahs: number }>
  >([]);
  const [activeSurahNum, setActiveSurahNum] = useState<number>(1);
  const [surahDetail, setSurahDetail] = useState<QuranSurahDetail | null>(null);
  const [loadingSurah, setLoadingSurah] = useState(false);
  const [playingAyahIdx, setPlayingAyahIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Poetry state
  const [activePoemIdx, setActivePoemIdx] = useState(0);

  useEffect(() => {
    if (!isQuran) return undefined;
    let cancelled = false;
    void fetchQuranSurahList().then((list) => {
      if (!cancelled) setSurahList(list);
    });
    return () => {
      cancelled = true;
    };
  }, [isQuran]);

  useEffect(() => {
    if (!isQuran) return undefined;
    let cancelled = false;
    setLoadingSurah(true);
    setPlayingAyahIdx(null);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    void fetchQuranSurahWithAudio(activeSurahNum).then((detail) => {
      if (!cancelled) {
        setSurahDetail(detail);
        setLoadingSurah(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isQuran, activeSurahNum]);

  const playAyahAt = (idx: number) => {
    if (!surahDetail || !surahDetail.ayahs[idx]) {
      setPlayingAyahIdx(null);
      return;
    }
    setPlayingAyahIdx(idx);
    const ayah = surahDetail.ayahs[idx];
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    audioRef.current.src = ayah.audioUrl;
    audioRef.current.onended = () => {
      if (idx + 1 < surahDetail.ayahs.length) {
        playAyahAt(idx + 1);
      } else {
        setPlayingAyahIdx(null);
      }
    };
    void audioRef.current.play().catch(() => setPlayingAyahIdx(null));
  };

  const stopQuranAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPlayingAyahIdx(null);
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  if (isQuran) {
    return (
      <div
        className="flex flex-col h-full w-full overflow-hidden bg-slate-950/90 text-amber-50 p-4 sm:p-6 gap-4"
        dir="rtl"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-400/20 pb-3">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
              المصحف الشريف المرتل
            </span>
            <select
              value={activeSurahNum}
              onChange={(e) => setActiveSurahNum(Number(e.target.value))}
              className="rounded-xl bg-slate-900 border border-amber-400/30 px-3 py-1.5 text-sm text-amber-100 outline-none"
            >
              {(surahList.length > 0
                ? surahList
                : [{ number: 1, name: 'سورة الفاتحة', englishName: 'Al-Faatiha', numberOfAyahs: 7 }]
              ).map((s) => (
                <option key={s.number} value={s.number}>
                  {s.number}. {s.name} ({s.numberOfAyahs} آية)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {playingAyahIdx !== null ? (
              <button
                type="button"
                onClick={stopQuranAudio}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
              >
                <Pause size={14} />
                <span>إيقاف التلاوة</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => playAyahAt(0)}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/40 text-amber-200 font-bold text-xs cursor-pointer"
              >
                <Play size={14} />
                <span>تلاوة السورة (مشاري العفاسي)</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto rounded-2xl bg-gradient-to-b from-amber-950/25 to-slate-950/90 border border-amber-400/20 p-5 sm:p-8">
          {loadingSurah ? (
            <div className="text-center py-12 text-amber-200/70">
              جاري تحميل آيات السورة والتلاوة الصوتية...
            </div>
          ) : surahDetail ? (
            <div className="max-w-3xl mx-auto space-y-6 text-center">
              <h3 className="text-2xl sm:text-3xl font-bold text-amber-300">
                {surahDetail.name}
              </h3>
              <div className="leading-[2.6] text-xl sm:text-2xl font-serif text-amber-50/95">
                {surahDetail.ayahs.map((ayah, idx) => {
                  const isActive = playingAyahIdx === idx;
                  return (
                    <span
                      key={ayah.number}
                      onClick={() => playAyahAt(idx)}
                      className={`inline cursor-pointer rounded-lg px-1.5 py-0.5 transition-colors ${
                        isActive
                          ? 'bg-amber-400/25 text-amber-200 ring-1 ring-amber-400/50'
                          : 'hover:bg-white/5'
                      }`}
                      title="اضغط للاستماع للآية"
                    >
                      {ayah.text}{' '}
                      <span className="inline-flex items-center justify-center w-7 h-7 mx-1 rounded-full border border-amber-400/40 text-xs text-amber-300">
                        {ayah.numberInSurah}
                      </span>{' '}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (isPoetry) {
    const customLines = book.directReadFormats?.txt
      ? book.directReadFormats.txt.split('\n').filter(Boolean)
      : null;
    const activePoem = customLines
      ? { title: book.title, author: book.author, lines: customLines }
      : BUILTIN_ARABIC_POEMS[activePoemIdx] || BUILTIN_ARABIC_POEMS[0];

    const isArabicPoem = /[\u0600-\u06FF]/.test(activePoem.title);

    return (
      <div
        className="flex flex-col h-full w-full overflow-hidden bg-slate-950/90 text-slate-100 p-4 sm:p-6 gap-4"
        dir={isArabicPoem ? 'rtl' : 'ltr'}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {!customLines &&
              BUILTIN_ARABIC_POEMS.map((poem, idx) => (
                <button
                  key={poem.title}
                  type="button"
                  onClick={() => setActivePoemIdx(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    activePoemIdx === idx
                      ? 'bg-amber-500/25 border border-amber-400/50 text-amber-200'
                      : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {poem.author}
                </button>
              ))}
          </div>

          <button
            type="button"
            onClick={() =>
              tts.isSpeaking
                ? tts.stopSpeech()
                : tts.speakText(
                    `${activePoem.title}. ${activePoem.lines.join(' . ')}`,
                    isArabicPoem ? 'ar' : 'en',
                  )
            }
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-bold cursor-pointer"
          >
            {tts.isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
            <span>{tts.isSpeaking ? 'إيقاف الإلقاء الصوتي' : 'إلقاء صوتي للقصيدة (TTS)'}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto rounded-2xl bg-slate-900/60 border border-white/10 p-6 sm:p-10">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-amber-200">
                {activePoem.title}
              </h3>
              <p className="text-sm text-slate-400 mt-1">{activePoem.author}</p>
            </div>
            <div className="space-y-4 text-lg sm:text-xl leading-relaxed font-serif">
              {activePoem.lines.map((line, i) => (
                <div
                  key={i}
                  className="py-2.5 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Arabic Manuscript RTL Two-Page Spread Viewer
  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden bg-slate-950/95 text-slate-100 p-3 sm:p-4 gap-3"
      dir="rtl"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => manuscript.setTwoPageMode((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold cursor-pointer"
          >
            <Columns size={14} />
            <span>
              {manuscript.twoPageMode ? 'عرض صفحتين متقابلتين (RTL)' : 'صفحة مفردة'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setUseEmbedViewer((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/35 text-amber-200 text-xs font-semibold cursor-pointer"
          >
            <BookOpen size={14} />
            <span>{useEmbedViewer ? 'عارض المخطوطة المزدوج' : 'عارض الأرشيف التفاعلي'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={manuscript.prevSpread}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 cursor-pointer"
            title="الصفحة السابقة"
          >
            <ChevronRight size={16} />
          </button>
          <span className="text-xs text-slate-300">
            صفحة {manuscript.currentSpreadIdx + 1} من {manuscript.metadata?.pageCount || 24}
          </span>
          <button
            type="button"
            onClick={manuscript.nextSpread}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 cursor-pointer"
            title="الصفحة التالية"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      {useEmbedViewer && manuscript.metadata?.embedUrl ? (
        <iframe
          src={manuscript.metadata.embedUrl}
          title={book.title}
          className="flex-1 w-full rounded-xl border border-white/10 bg-black"
          allow="fullscreen"
        />
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-auto p-2 items-center justify-items-center bg-black/50 rounded-2xl border border-amber-500/20">
          {manuscript.rightPage && (
            <img
              src={manuscript.rightPage.imageUrl}
              alt={`صفحة ${manuscript.rightPage.pageNumber}`}
              className="max-h-[72vh] w-auto object-contain rounded-lg shadow-2xl border border-amber-500/20"
              loading="lazy"
            />
          )}
          {manuscript.leftPage && (
            <img
              src={manuscript.leftPage.imageUrl}
              alt={`صفحة ${manuscript.leftPage.pageNumber}`}
              className="max-h-[72vh] w-auto object-contain rounded-lg shadow-2xl border border-amber-500/20"
              loading="lazy"
            />
          )}
        </div>
      )}
    </div>
  );
};

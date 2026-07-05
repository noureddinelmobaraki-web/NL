// src/audio/soundGovernor.ts
// ─────────────────────────────────────────────────────────────────────────────
// السلطة المركزية للصوت (Sound Governor).
//
// المشكلة الجذرية: الموقع كان بلا "نظام يعرف الأصوات". كل مصدر صوت يعمل بمعزل:
//   • NL Music  → يُسجَّل كـ external 'song' داخل audioManager (محرّك مستقل).
//   • My Songs  → يملك عنصر <audio> خاص ويُسجَّل كـ registry 'song' (خريطة مختلفة).
//   • خلفيات الصفحات (tv/games/movies/...) → مصادر registry أخرى.
// لأنها في خرائط/محرّكات منفصلة لم يكن أحدها يوقف الآخر، فتتراكب أغنيتان معًا،
// وتتراكب الأغنية مع صوت خلفية الصفحة.
//
// هذا الملف هو "صاحب الصلاحية والأسبقية": كل منتج صوت (أغنية أو خلفية) يسجّل نفسه
// كقناة، ويُبلّغ متى بدأ/توقّف. الحاكم يفرض القواعد لكل الاحتمالات:
//   1) أغنية واحدة فقط في كل الموقع → تشغيل أي أغنية يوقف كل الأغاني الأخرى فورًا
//      (يحلّ تراكب NL Music + My Songs عبر صفحتين منفصلتين).
//   2) أغنية + خلفية صفحة معًا = "تعارض" → يُعلن conflict ليتفرّع النوتش ويتيح
//      للمستخدم اختيار أيّ صوت يبقى.
//   3) صوت واحد فقط (أغنية فقط أو خلفية فقط) → لا تعارض، لا شيء يحدث.
//
// لا يغيّر هذا الملف نظام الخلفية "المقدّس"؛ فقط يراقب ويحكم فوقه.
// ─────────────────────────────────────────────────────────────────────────────

export type SoundKind = "song" | "background";

export interface SoundChannel {
  /** معرّف فريد للقناة، مثل 'nl-music' أو 'my-songs' أو 'bg:tv'. */
  id: string;
  /** نوع الصوت: أغنية أم خلفية صفحة. */
  kind: SoundKind;
  /** الأسبقية (الأعلى يفوز عند الحاجة للترجيح). */
  priority: number;
  /** اسم يُعرض في النوتش (اسم الأغنية الحالية). */
  label?: () => string;
  /** هل تعمل القناة الآن فعلًا. */
  isPlaying: () => boolean;
  /** إيقاف مؤقّت لطيف (يبقى قابلًا للاستئناف). */
  pause: () => void;
  /** إيقاف كامل (تحرير المصدر). اختياري. */
  stop?: () => void;
  /** ضبط مستوى الصوت 0..1 (للخفض التدريجي). اختياري. */
  setVolume?: (v: number) => void;
  /** قراءة مستوى الصوت الحالي 0..1. اختياري. */
  getVolume?: () => number;
}

export interface SoundConflict {
  active: boolean;
  songId: string | null;
  bgId: string | null;
  songLabel: string;
}

const NO_CONFLICT: SoundConflict = {
  active: false,
  songId: null,
  bgId: null,
  songLabel: "",
};

class SoundGovernor {
  private channels = new Map<string, SoundChannel>();
  private conflict: SoundConflict = NO_CONFLICT;
  private subscribers = new Set<() => void>();
  private fadeRaf: number | null = null;

  // ── التسجيل ────────────────────────────────────────────────────────────────
  /** يسجّل قناة صوت ويعيد دالّة لإلغاء التسجيل. */
  register(channel: SoundChannel): () => void {
    this.channels.set(channel.id, channel);
    return () => {
      this.channels.delete(channel.id);
      // إن كانت هذه القناة طرفًا في تعارض قائم، ألغِ التعارض.
      if (
        this.conflict.songId === channel.id ||
        this.conflict.bgId === channel.id
      ) {
        this.clearConflict();
      }
    };
  }

  // ── الاشتراك (لواجهة النوتش) ─────────────────────────────────────────────────
  subscribe(cb: () => void): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  /** لقطة ثابتة المرجع (لـ useSyncExternalStore). */
  getConflict(): SoundConflict {
    return this.conflict;
  }

  private emit(): void {
    this.subscribers.forEach((cb) => {
      try {
        cb();
      } catch {
        /* خطأ مستمع يجب ألا يكسر الصوت */
      }
    });
  }

  // ── مساعدات داخلية ──────────────────────────────────────────────────────────
  private playingSongs(exceptId?: string): SoundChannel[] {
    const out: SoundChannel[] = [];
    this.channels.forEach((c) => {
      if (c.kind === "song" && c.id !== exceptId) {
        try {
          if (c.isPlaying()) out.push(c);
        } catch {
          /* noop */
        }
      }
    });
    return out;
  }

  private playingBackgrounds(): SoundChannel[] {
    const out: SoundChannel[] = [];
    this.channels.forEach((c) => {
      if (c.kind === "background") {
        try {
          if (c.isPlaying()) out.push(c);
        } catch {
          /* noop */
        }
      }
    });
    return out;
  }

  private setConflict(songId: string, bgId: string, label: string): void {
    const next: SoundConflict = {
      active: true,
      songId,
      bgId,
      songLabel: label || "Song",
    };
    if (
      this.conflict.active === next.active &&
      this.conflict.songId === next.songId &&
      this.conflict.bgId === next.bgId &&
      this.conflict.songLabel === next.songLabel
    )
      return;
    this.conflict = next;
    this.emit();
  }

  private clearConflict(): void {
    if (
      !this.conflict.active &&
      this.conflict.songId === null &&
      this.conflict.bgId === null
    )
      return;
    this.conflict = NO_CONFLICT;
    this.emit();
  }

  // ── الأحداث القادمة من المنتجين ──────────────────────────────────────────────
  /** يُنادى عند بدء تشغيل قناة. */
  notePlaying(id: string): void {
    const ch = this.channels.get(id);
    if (!ch) return;

    if (ch.kind === "song") {
      // القاعدة 1: أغنية واحدة فقط. أوقِف كل أغنية أخرى تعمل.
      for (const other of this.playingSongs(id)) {
        try {
          other.pause();
        } catch {
          /* noop */
        }
      }
      // بعد أن صارت الأغنية هي الوحيدة: هل توجد خلفية صفحة تعمل؟ إذن تعارض.
      const bg = this.playingBackgrounds()[0];
      if (bg) {
        this.setConflict(id, bg.id, ch.label ? ch.label() : "Song");
      } else {
        this.clearConflict();
      }
    } else {
      // بدأت خلفية صفحة: إن كانت هناك أغنية تعمل → تعارض (تراكب).
      const song = this.playingSongs()[0];
      if (song) {
        this.setConflict(song.id, id, song.label ? song.label() : "Song");
      }
    }
  }

  /** يُنادى عند توقّف قناة. */
  noteStopped(id: string): void {
    if (
      this.conflict.active &&
      (this.conflict.songId === id || this.conflict.bgId === id)
    ) {
      this.clearConflict();
    }
  }

  // ── حلّ التعارض ──────────────────────────────────────────────────────────────
  private cancelFade(): void {
    if (this.fadeRaf !== null) {
      try {
        cancelAnimationFrame(this.fadeRaf);
      } catch {
        /* noop */
      }
      this.fadeRaf = null;
    }
  }

  /** إبقاء الأغنية وإيقاف صوت الخلفية (زر "اقاف صوت BG"). */
  silenceBackground(): void {
    this.cancelFade();
    const id = this.conflict.bgId;
    const ch = id ? this.channels.get(id) : null;
    if (ch) {
      try {
        ch.pause();
      } catch {
        /* noop */
      }
    }
    this.clearConflict();
  }

  /** إبقاء الخلفية وإيقاف الأغنية فورًا (نقر فرع الأغنية). */
  silenceSong(): void {
    this.cancelFade();
    const id = this.conflict.songId;
    const ch = id ? this.channels.get(id) : null;
    if (ch) {
      try {
        (ch.stop || ch.pause)();
      } catch {
        /* noop */
      }
    }
    this.clearConflict();
  }

  /**
   * خفض الأغنية تدريجيًا خلال ms ثم إيقافها، مع إبقاء الخلفية.
   * يُسخدم عند عدم اختيار المستخدم خلال مهلة القرار (الخفوت خلال 5 ثوانٍ).
   */
  fadeOutSong(ms: number): void {
    this.cancelFade();
    const id = this.conflict.songId;
    const ch = id ? this.channels.get(id) : null;
    if (!ch) {
      this.clearConflict();
      return;
    }

    const setV = ch.setVolume;
    const saved = ch.getVolume ? ch.getVolume() : 1;

    // إن تعذّر التحكّم بالمستوى، أوقِف مباشرة.
    if (!setV || ms <= 0) {
      try {
        (ch.stop || ch.pause)();
      } catch {
        /* noop */
      }
      this.clearConflict();
      return;
    }

    const now = () =>
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const start = now();
    const step = () => {
      const p = Math.min(1, (now() - start) / ms);
      try {
        setV(Math.max(0, saved * (1 - p)));
      } catch {
        /* noop */
      }
      if (p < 1) {
        this.fadeRaf = requestAnimationFrame(step);
      } else {
        this.fadeRaf = null;
        try {
          (ch.stop || ch.pause)();
        } catch {
          /* noop */
        }
        // استعادة المستوى للتشغيل التالي.
        try {
          setV(saved);
        } catch {
          /* noop */
        }
        this.clearConflict();
      }
    };
    this.fadeRaf = requestAnimationFrame(step);
  }
}

export const soundGovernor = new SoundGovernor();
export default soundGovernor;

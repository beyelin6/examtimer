export type SoundEventType = 'ready' | 'start' | 'warning' | 'end';

export type BuiltInSoundId =
  | 'chime_trio'
  | 'westminster'
  | 'soft_bell'
  | 'ding_dong'
  | 'warning_beeps'
  | 'school_bell'
  | 'gentle_chord'
  | 'marimba_up'
  | 'mute';

export type SoundSelectionId = BuiltInSoundId | 'custom';

export interface StageSoundConfig {
  soundId: SoundSelectionId;
  customFileName?: string;
}

export interface SoundSettings {
  volume: number; // 0 to 1
  isMuted: boolean;
  stages: Record<SoundEventType, StageSoundConfig>;
}

export interface SoundPresetMeta {
  id: BuiltInSoundId;
  label: string;
  description: string;
}

export const BUILT_IN_SOUNDS: SoundPresetMeta[] = [
  { id: 'chime_trio', label: '輕快三連音 (預設預備音)', description: 'Mi - Sol - Do 清亮提醒' },
  { id: 'westminster', label: '西敏寺校園鐘聲', description: '經典學校上下課鐘聲旋律' },
  { id: 'soft_bell', label: '清亮單鈴聲 (預設開始音)', description: '清脆柔和的單響提示音' },
  { id: 'ding_dong', label: '溫柔叮咚聲', description: '親切的雙音門鈴提示' },
  { id: 'warning_beeps', label: '短促三響警示 (預設警告音)', description: '清楚提醒剩餘時間的叮咚三響' },
  { id: 'school_bell', label: '傳統電鈴長響 (預設結束音)', description: '醒目的雙段考試結束長鈴' },
  { id: 'gentle_chord', label: '柔和和弦音', description: '溫暖不刺耳的大三和弦琶音' },
  { id: 'marimba_up', label: '活力木琴音', description: '輕快活潑的上升木琴聲' },
  { id: 'mute', label: '靜音 (此階段不響鈴)', description: '關閉此階段的音效提醒' },
];

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  volume: 0.8,
  isMuted: false,
  stages: {
    ready: { soundId: 'chime_trio' },
    start: { soundId: 'soft_bell' },
    warning: { soundId: 'warning_beeps' },
    end: { soundId: 'school_bell' },
  },
};

export const STAGE_METADATA: Record<
  SoundEventType,
  { title: string; subtitle: string; badge: string; accent: string }
> = {
  ready: {
    title: '考前預備鈴',
    subtitle: '考試開始前 2 分鐘提醒回座',
    badge: '預備',
    accent: 'orange',
  },
  start: {
    title: '考試開始鈴',
    subtitle: '到達開始時間、開始作答',
    badge: '開始',
    accent: 'emerald',
  },
  warning: {
    title: '結束前警告鈴',
    subtitle: '考試結束前 5 分鐘提醒檢查',
    badge: '警告',
    accent: 'amber',
  },
  end: {
    title: '考試結束鈴',
    subtitle: '考試時間結束、停筆收卷',
    badge: '結束',
    accent: 'red',
  },
};

export const SOUND_SETTINGS_STORAGE_KEY = 'exam_sound_settings_v1';

export function loadSoundSettings(): SoundSettings {
  try {
    const raw = localStorage.getItem(SOUND_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SOUND_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : DEFAULT_SOUND_SETTINGS.volume,
      isMuted: Boolean(parsed.isMuted),
      stages: {
        ready: parsed.stages?.ready?.soundId ? parsed.stages.ready : DEFAULT_SOUND_SETTINGS.stages.ready,
        start: parsed.stages?.start?.soundId ? parsed.stages.start : DEFAULT_SOUND_SETTINGS.stages.start,
        warning: parsed.stages?.warning?.soundId ? parsed.stages.warning : DEFAULT_SOUND_SETTINGS.stages.warning,
        end: parsed.stages?.end?.soundId ? parsed.stages.end : DEFAULT_SOUND_SETTINGS.stages.end,
      },
    };
  } catch {
    return DEFAULT_SOUND_SETTINGS;
  }
}

export function saveSoundSettings(settings: SoundSettings): void {
  try {
    localStorage.setItem(SOUND_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('無法儲存響鈴設定:', err);
  }
}

// --- IndexedDB for Custom Uploaded Audio Files ---
const DB_NAME = 'ExamTimerAudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'custom_sounds';

function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('瀏覽器不支援 IndexedDB'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCustomSoundFile(stage: SoundEventType, file: Blob): Promise<void> {
  const db = await openAudioDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(file, stage);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getCustomSoundFile(stage: SoundEventType): Promise<Blob | null> {
  try {
    const db = await openAudioDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(stage);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as Blob) || null);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return null;
  }
}

export async function deleteCustomSoundFile(stage: SoundEventType): Promise<void> {
  try {
    const db = await openAudioDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(stage);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    // ignore cleanup failures
  }
}

// --- Web Audio Engine with Clean Cancellation ---
let sharedAudioCtx: AudioContext | null = null;
let activeTimeouts: number[] = [];
let activeNodes: OscillatorNode[] = [];
let activeAudioElement: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;

function getAudioContext(): AudioContext | null {
  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioContextClass();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function unlockAudioContext(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.01);
  } catch {
    // ignore unlock errors
  }
}

export function stopCurrentSound(): void {
  activeTimeouts.forEach((id) => window.clearTimeout(id));
  activeTimeouts = [];

  activeNodes.forEach((osc) => {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      // already stopped
    }
  });
  activeNodes = [];

  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch {
      // ignore
    }
    activeAudioElement = null;
  }

  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }
}

function scheduleTone(
  frequency: number,
  type: OscillatorType,
  duration: number,
  delayMs: number,
  baseVolume: number,
  masterVolume: number
): void {
  const timeoutId = window.setTimeout(() => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const vol = Math.max(0.001, Math.min(1, baseVolume * masterVolume));

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    activeNodes.push(osc);
    osc.onended = () => {
      activeNodes = activeNodes.filter((n) => n !== osc);
    };

    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }, delayMs);

  activeTimeouts.push(timeoutId);
}

function playBuiltInPreset(
  soundId: BuiltInSoundId,
  masterVolume: number,
  onEnded?: () => void
): void {
  if (soundId === 'mute' || masterVolume <= 0) {
    onEnded?.();
    return;
  }

  let totalDurationMs = 800;

  switch (soundId) {
    case 'chime_trio': {
      scheduleTone(659.25, 'sine', 0.25, 0, 0.55, masterVolume); // E5
      scheduleTone(783.99, 'sine', 0.25, 280, 0.55, masterVolume); // G5
      scheduleTone(1046.5, 'sine', 0.5, 560, 0.65, masterVolume); // C6
      totalDurationMs = 1150;
      break;
    }

    case 'westminster': {
      // Classic school bell: E5 - C5 - D5 - G4 | G4 - D5 - E5 - C5
      const notes: [number, number][] = [
        [659.25, 0],
        [523.25, 520],
        [587.33, 1040],
        [392.0, 1560],
        [392.0, 2350],
        [587.33, 2870],
        [659.25, 3390],
        [523.25, 3910],
      ];
      notes.forEach(([freq, delay], i) => {
        const dur = i === 3 || i === 7 ? 0.85 : 0.55;
        scheduleTone(freq, 'sine', dur, delay, 0.55, masterVolume);
        scheduleTone(freq * 2, 'triangle', dur * 0.65, delay, 0.14, masterVolume);
      });
      totalDurationMs = 4850;
      break;
    }

    case 'soft_bell': {
      scheduleTone(1046.5, 'sine', 0.85, 0, 0.55, masterVolume);
      scheduleTone(2093.0, 'sine', 0.45, 0, 0.16, masterVolume);
      totalDurationMs = 900;
      break;
    }

    case 'ding_dong': {
      scheduleTone(880, 'sine', 0.55, 0, 0.55, masterVolume);
      scheduleTone(1760, 'sine', 0.3, 0, 0.12, masterVolume);
      scheduleTone(698.46, 'sine', 0.8, 450, 0.55, masterVolume);
      scheduleTone(1396.91, 'sine', 0.4, 450, 0.12, masterVolume);
      totalDurationMs = 1300;
      break;
    }

    case 'warning_beeps': {
      scheduleTone(880, 'sine', 0.45, 0, 0.55, masterVolume);
      scheduleTone(880, 'sine', 0.45, 550, 0.55, masterVolume);
      scheduleTone(1046.5, 'sine', 0.75, 1100, 0.65, masterVolume);
      totalDurationMs = 1900;
      break;
    }

    case 'school_bell': {
      scheduleTone(600, 'square', 1.6, 0, 0.22, masterVolume);
      scheduleTone(605, 'triangle', 1.6, 0, 0.18, masterVolume);
      scheduleTone(600, 'square', 1.6, 1850, 0.22, masterVolume);
      scheduleTone(605, 'triangle', 1.6, 1850, 0.18, masterVolume);
      totalDurationMs = 3550;
      break;
    }

    case 'gentle_chord': {
      const chord = [523.25, 659.25, 783.99, 1046.5];
      chord.forEach((freq, idx) => {
        scheduleTone(freq, 'sine', 1.1, idx * 130, 0.38, masterVolume);
      });
      totalDurationMs = 1600;
      break;
    }

    case 'marimba_up': {
      const notes = [523.25, 587.33, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        scheduleTone(freq, 'triangle', 0.22, idx * 120, 0.6, masterVolume);
      });
      totalDurationMs = 850;
      break;
    }
  }

  if (onEnded) {
    const endTimeout = window.setTimeout(onEnded, totalDurationMs);
    activeTimeouts.push(endTimeout);
  }
}

export async function playExamSound(
  stage: SoundEventType,
  settings: SoundSettings,
  options?: { ignoreMute?: boolean; onEnded?: () => void }
): Promise<void> {
  stopCurrentSound();

  if (!options?.ignoreMute && settings.isMuted) {
    options?.onEnded?.();
    return;
  }

  const stageConfig = settings.stages[stage];
  if (!stageConfig || stageConfig.soundId === 'mute') {
    options?.onEnded?.();
    return;
  }

  const effectiveVolume = Math.max(0, Math.min(1, settings.volume));
  if (effectiveVolume <= 0) {
    options?.onEnded?.();
    return;
  }

  if (stageConfig.soundId === 'custom') {
    const blob = await getCustomSoundFile(stage);
    if (blob) {
      const url = URL.createObjectURL(blob);
      activeObjectUrl = url;
      const audio = new Audio(url);
      audio.volume = effectiveVolume;
      activeAudioElement = audio;

      const handleFinish = () => {
        if (activeAudioElement === audio) {
          activeAudioElement = null;
        }
        if (activeObjectUrl === url) {
          URL.revokeObjectURL(url);
          activeObjectUrl = null;
        }
        options?.onEnded?.();
      };

      audio.onended = handleFinish;
      audio.onerror = handleFinish;

      try {
        await audio.play();
        return;
      } catch {
        handleFinish();
      }
    }
    // Fallback to default preset if custom file is missing
    playBuiltInPreset(DEFAULT_SOUND_SETTINGS.stages[stage].soundId as BuiltInSoundId, effectiveVolume, options?.onEnded);
    return;
  }

  playBuiltInPreset(stageConfig.soundId, effectiveVolume, options?.onEnded);
}

export function getSoundDisplayName(config: StageSoundConfig): string {
  if (config.soundId === 'custom') {
    return config.customFileName ? `自訂：${config.customFileName}` : '自訂音檔';
  }
  const found = BUILT_IN_SOUNDS.find((item) => item.id === config.soundId);
  return found ? found.label.replace(/\s*\(.*?\)/g, '') : '預設音效';
}

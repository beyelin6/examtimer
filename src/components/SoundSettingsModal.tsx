import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Volume2,
  VolumeX,
  Upload,
  Play,
  Square,
  RotateCcw,
  X,
  Music,
  Trash2,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  BUILT_IN_SOUNDS,
  DEFAULT_SOUND_SETTINGS,
  STAGE_METADATA,
  SoundEventType,
  SoundSelectionId,
  SoundSettings,
  deleteCustomSoundFile,
  playExamSound,
  saveCustomSoundFile,
  stopCurrentSound,
} from '../utils/soundEngine';

interface SoundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SoundSettings;
  onChange: (next: SoundSettings) => void;
}

const STAGES_ORDER: SoundEventType[] = ['ready', 'start', 'warning', 'end'];
const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const ACCENT_STYLES: Record<
  string,
  { badge: string; border: string; bg: string; playBtn: string }
> = {
  orange: {
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    border: 'border-orange-100',
    bg: 'bg-orange-50/40',
    playBtn: 'bg-orange-500 hover:bg-orange-600 text-white',
  },
  emerald: {
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    border: 'border-emerald-100',
    bg: 'bg-emerald-50/40',
    playBtn: 'bg-emerald-500 hover:bg-emerald-600 text-white',
  },
  amber: {
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    border: 'border-amber-100',
    bg: 'bg-amber-50/40',
    playBtn: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
  red: {
    badge: 'bg-red-100 text-red-700 border-red-200',
    border: 'border-red-100',
    bg: 'bg-red-50/40',
    playBtn: 'bg-red-500 hover:bg-red-600 text-white',
  },
};

export const SoundSettingsModal: React.FC<SoundSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onChange,
}) => {
  const [playingStage, setPlayingStage] = useState<SoundEventType | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRefs = useRef<Partial<Record<SoundEventType, HTMLInputElement | null>>>({});

  useEffect(() => {
    if (!isOpen) {
      stopCurrentSound();
      setPlayingStage(null);
      setFeedback(null);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopCurrentSound();
        setPlayingStage(null);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 3500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  if (!isOpen) return null;

  const handleClose = () => {
    stopCurrentSound();
    setPlayingStage(null);
    onClose();
  };

  const handlePreview = async (stage: SoundEventType, customSettings?: SoundSettings) => {
    if (playingStage === stage && !customSettings) {
      stopCurrentSound();
      setPlayingStage(null);
      return;
    }

    const activeSettings = customSettings ?? settings;
    if (activeSettings.stages[stage].soundId === 'mute') {
      setFeedback({ type: 'error', text: '此階段目前設為靜音，請先選擇音效再試聽。' });
      return;
    }

    setPlayingStage(stage);
    await playExamSound(stage, activeSettings, {
      ignoreMute: true,
      onEnded: () => {
        setPlayingStage((curr) => (curr === stage ? null : curr));
      },
    });
  };

  const handleSelectChange = (stage: SoundEventType, value: SoundSelectionId) => {
    const next: SoundSettings = {
      ...settings,
      stages: {
        ...settings.stages,
        [stage]: {
          ...settings.stages[stage],
          soundId: value,
        },
      },
    };
    onChange(next);
    if (value !== 'mute') {
      void handlePreview(stage, next);
    } else if (playingStage === stage) {
      stopCurrentSound();
      setPlayingStage(null);
    }
  };

  const handleFileUpload = async (
    stage: SoundEventType,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setFeedback({ type: 'error', text: '請選擇音訊檔案（如 MP3、WAV、OGG、M4A）。' });
      return;
    }

    if (file.size > MAX_AUDIO_SIZE_BYTES) {
      setFeedback({ type: 'error', text: '音檔大小請勿超過 10MB。' });
      return;
    }

    try {
      await saveCustomSoundFile(stage, file);
      const next: SoundSettings = {
        ...settings,
        stages: {
          ...settings.stages,
          [stage]: {
            soundId: 'custom',
            customFileName: file.name,
          },
        },
      };
      onChange(next);
      setFeedback({ type: 'success', text: `已為「${STAGE_METADATA[stage].title}」載入自訂音效：${file.name}` });
      void handlePreview(stage, next);
    } catch {
      setFeedback({ type: 'error', text: '儲存自訂音檔失敗，請再試一次。' });
    }
  };

  const handleRemoveCustomFile = async (stage: SoundEventType) => {
    if (playingStage === stage) {
      stopCurrentSound();
      setPlayingStage(null);
    }
    await deleteCustomSoundFile(stage);
    const defaultStageSound = DEFAULT_SOUND_SETTINGS.stages[stage].soundId;
    onChange({
      ...settings,
      stages: {
        ...settings.stages,
        [stage]: {
          soundId: defaultStageSound,
        },
      },
    });
    setFeedback({ type: 'success', text: `已移除「${STAGE_METADATA[stage].title}」的自訂音檔。` });
  };

  const handleResetDefaults = async () => {
    stopCurrentSound();
    setPlayingStage(null);
    await Promise.all(STAGES_ORDER.map((stage) => deleteCustomSoundFile(stage)));
    onChange({
      ...DEFAULT_SOUND_SETTINGS,
      stages: {
        ready: { ...DEFAULT_SOUND_SETTINGS.stages.ready },
        start: { ...DEFAULT_SOUND_SETTINGS.stages.start },
        warning: { ...DEFAULT_SOUND_SETTINGS.stages.warning },
        end: { ...DEFAULT_SOUND_SETTINGS.stages.end },
      },
    });
    setFeedback({ type: 'success', text: '已恢復所有階段的預設響鈴聲音！' });
  };

  const volumePercent = Math.round(settings.volume * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white w-full max-w-3xl max-h-[90vh] rounded-[2rem] shadow-2xl border-4 border-sky-100 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-sky-50 border-b-2 border-sky-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500 text-white rounded-2xl shadow-sm">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-sky-700">響鈴聲音設定</h2>
              <p className="text-sm font-medium text-gray-500">
                可為四個考試階段分別挑選內建鈴聲、調整音量，或上傳自訂音檔
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-2xl transition-colors"
            title="關閉視窗"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Feedback banner */}
          {feedback && (
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold border-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Master Volume & Mute Card */}
          <div className="bg-slate-50 p-5 rounded-2xl border-2 border-slate-100 flex flex-wrap items-center gap-4">
            <button
              onClick={() => onChange({ ...settings, isMuted: !settings.isMuted })}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm ${
                settings.isMuted
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-white text-sky-700 hover:bg-sky-50 border border-sky-200'
              }`}
            >
              {settings.isMuted ? (
                <>
                  <VolumeX className="w-5 h-5" />
                  全部靜音中
                </>
              ) : (
                <>
                  <Volume2 className="w-5 h-5" />
                  響鈴已開啟
                </>
              )}
            </button>

            <div className="flex-1 min-w-[200px] flex items-center gap-3">
              <span className="text-sm font-bold text-gray-600 whitespace-nowrap">總音量</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={volumePercent}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    volume: Number(e.target.value) / 100,
                    isMuted: Number(e.target.value) === 0 ? true : settings.isMuted,
                  })
                }
                className="w-full accent-sky-500 h-2.5 bg-sky-100 rounded-lg cursor-pointer"
              />
              <span
                className="text-sm font-black text-sky-700 w-12 text-right"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {volumePercent}%
              </span>
            </div>
          </div>

          {/* 4 Stage Settings */}
          <div className="space-y-4">
            {STAGES_ORDER.map((stage) => {
              const meta = STAGE_METADATA[stage];
              const accent = ACCENT_STYLES[meta.accent];
              const stageCfg = settings.stages[stage];
              const isPlaying = playingStage === stage;
              const hasCustomFile = Boolean(stageCfg.customFileName);

              return (
                <div
                  key={stage}
                  className={`p-4 md:p-5 rounded-2xl border-2 ${accent.border} ${accent.bg} flex flex-col gap-3`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black border ${accent.badge}`}
                      >
                        {meta.badge}
                      </span>
                      <div>
                        <h3 className="font-black text-gray-800 text-base">{meta.title}</h3>
                        <p className="text-xs font-medium text-gray-500">{meta.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        ref={(el) => {
                          fileInputRefs.current[stage] = el;
                        }}
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(stage, e)}
                      />
                      <button
                        onClick={() => fileInputRefs.current[stage]?.click()}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-colors shadow-xs"
                        title="上傳 MP3 / WAV / OGG / M4A 音檔"
                      >
                        <Upload className="w-4 h-4 text-sky-500" />
                        上傳音檔
                      </button>

                      <button
                        onClick={() => handlePreview(stage)}
                        disabled={stageCfg.soundId === 'mute'}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs ${
                          stageCfg.soundId === 'mute'
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : isPlaying
                              ? 'bg-slate-800 hover:bg-slate-900 text-white'
                              : accent.playBtn
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Square className="w-3.5 h-3.5 fill-current" />
                            停止
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            試聽
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <select
                      value={stageCfg.soundId}
                      onChange={(e) =>
                        handleSelectChange(stage, e.target.value as SoundSelectionId)
                      }
                      className="flex-1 p-2.5 bg-white border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 outline-none transition-all"
                    >
                      {BUILT_IN_SOUNDS.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.label} — {preset.description}
                        </option>
                      ))}
                      {hasCustomFile && (
                        <option value="custom">
                          🎵 自訂音檔：{stageCfg.customFileName}
                        </option>
                      )}
                    </select>

                    {hasCustomFile && (
                      <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-sky-200 text-xs font-bold text-sky-700">
                        <span className="flex items-center gap-1.5 truncate max-w-[180px]">
                          <Music className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{stageCfg.customFileName}</span>
                        </span>
                        <button
                          onClick={() => handleRemoveCustomFile(stage)}
                          className="text-red-400 hover:text-red-600 p-0.5 transition-colors"
                          title="移除自訂音檔"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-gray-50 border-t-2 border-gray-100">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-200/70 rounded-xl transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            恢復預設音效
          </button>

          <button
            onClick={handleClose}
            className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-black text-sm shadow-md shadow-sky-200 transition-colors"
          >
            完成設定
          </button>
        </div>
      </div>
    </div>
  );
};

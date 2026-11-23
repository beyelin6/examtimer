import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';

export const DEFAULT_SUBJECT_PRESETS = ['國語', '數學', '英語', '自然', '社會'];

export const EXTRA_SUBJECT_PRESETS = [
  '國文',
  '英文',
  '作文',
  '生活',
  '本土語',
  '理化',
  '生物',
  '歷史',
  '地理',
  '公民',
  '資訊',
  '健體',
  '綜合',
];

interface SubjectComboboxProps {
  value: string;
  onChange: (value: string) => void;
  customPresets: string[];
  onAddCustomPreset: (subject: string) => void;
  onRemoveCustomPreset: (subject: string) => void;
}

export const SubjectCombobox: React.FC<SubjectComboboxProps> = ({
  value,
  onChange,
  customPresets,
  onAddCustomPreset,
  onRemoveCustomPreset,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trimmed = value.trim();
  const isKnownPreset =
    DEFAULT_SUBJECT_PRESETS.includes(trimmed) ||
    EXTRA_SUBJECT_PRESETS.includes(trimmed) ||
    customPresets.includes(trimmed);

  const handleSelect = (subject: string) => {
    onChange(subject);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="輸入或選擇科目"
          className="w-full p-3 pr-10 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-sky-100 focus:border-sky-400 outline-none transition-all font-bold text-lg text-gray-700 bg-white"
        />
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="absolute right-2 p-1.5 text-gray-400 hover:text-sky-600 rounded-lg transition-colors"
          title="開啟科目選單"
          tabIndex={-1}
        >
          <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border-2 border-sky-200 rounded-2xl shadow-xl p-3 space-y-3 min-w-[230px]">
          <div className="flex items-center justify-between text-xs font-bold text-gray-400 px-1">
            <span>點選快速帶入，或直接輸入自訂名稱</span>
          </div>

          {trimmed && !isKnownPreset && (
            <button
              type="button"
              onClick={() => {
                onAddCustomPreset(trimmed);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-black border border-emerald-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              將「{trimmed}」加入我的常用科目
            </button>
          )}

          <div>
            <div className="text-[11px] font-black text-sky-600 mb-1.5 px-1">基本科目</div>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_SUBJECT_PRESETS.map((subj) => (
                <button
                  key={subj}
                  type="button"
                  onClick={() => handleSelect(subj)}
                  className={`px-2.5 py-1.5 rounded-xl text-sm font-bold transition-colors ${
                    value === subj
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                  }`}
                >
                  {subj}
                </button>
              ))}
            </div>
          </div>

          {customPresets.length > 0 && (
            <div>
              <div className="text-[11px] font-black text-emerald-600 mb-1.5 px-1">我的常用自訂科目</div>
              <div className="flex flex-wrap gap-1.5">
                {customPresets.map((subj) => (
                  <div
                    key={subj}
                    className={`inline-flex items-center rounded-xl text-sm font-bold overflow-hidden border ${
                      value === subj
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(subj)}
                      className="px-2.5 py-1 hover:bg-black/5 transition-colors"
                    >
                      {subj}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveCustomPreset(subj);
                      }}
                      className="pr-2 pl-0.5 py-1 opacity-70 hover:opacity-100 transition-opacity"
                      title={`移除常用科目「${subj}」`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-[11px] font-black text-gray-400 mb-1.5 px-1">其他常見科目</div>
            <div className="flex flex-wrap gap-1.5">
              {EXTRA_SUBJECT_PRESETS.map((subj) => (
                <button
                  key={subj}
                  type="button"
                  onClick={() => handleSelect(subj)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors ${
                    value === subj
                      ? 'bg-sky-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {subj}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

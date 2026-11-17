import React, { useRef } from 'react';
import { Play, StepForward, RotateCcw, CheckCircle2, ArrowRight } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  onRun: () => void;
  onStartTrace: () => void;
  onReset: () => void;
  onCheckChallenge?: () => void;
  activeLine?: number | null;
  errorLine?: number | null;
  title?: string;
  minHeight?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  onRun,
  onStartTrace,
  onReset,
  onCheckChallenge,
  activeLine = null,
  errorLine = null,
  title = 'main.py',
  minHeight = '280px',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = code.split('\n');

  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;

    if (e.key === 'Tab') {
      e.preventDefault();
      const updated = code.slice(0, start) + '    ' + code.slice(end);
      onChange(updated);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 4;
      });
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const lineStart = code.lastIndexOf('\n', start - 1) + 1;
      const currentLine = code.slice(lineStart, start);
      const indentMatch = currentLine.match(/^(\s*)/);
      let indent = indentMatch ? indentMatch[1] : '';
      if (currentLine.trimEnd().endsWith(':')) {
        indent += '    ';
      }
      const updated = code.slice(0, start) + '\n' + indent + code.slice(end);
      onChange(updated);
      requestAnimationFrame(() => {
        const pos = start + 1 + indent.length;
        el.selectionStart = el.selectionEnd = pos;
      });
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900 text-slate-100">
      {/* Editor Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-800/90 border-b border-slate-700/80">
        <div className="flex items-center gap-3 text-xs text-slate-300 font-mono">
          <span>{title}</span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span className="tabular-nums text-slate-400">{lines.length} 行</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            重設
          </button>

          <button
            type="button"
            onClick={onStartTrace}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-200 hover:text-white bg-sky-900/60 hover:bg-sky-800/80 border border-sky-700/60 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <StepForward className="w-3.5 h-3.5" aria-hidden="true" />
            逐步追蹤
          </button>

          <button
            type="button"
            onClick={onRun}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <Play className="w-3.5 h-3.5" aria-hidden="true" />
            執行程式
          </button>

          {onCheckChallenge && (
            <button
              type="button"
              onClick={onCheckChallenge}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              檢查答案
            </button>
          )}
        </div>
      </div>

      {/* Editor Body with Gutter + Highlight Overlay */}
      <div className="relative flex font-mono text-sm leading-6" style={{ minHeight }}>
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          aria-hidden="true"
          className="w-12 shrink-0 py-3 bg-slate-900/95 border-r border-slate-800 text-right select-none overflow-hidden"
        >
          {lines.map((_, idx) => {
            const lineNum = idx + 1;
            const isActive = activeLine === lineNum;
            const isError = errorLine === lineNum;
            return (
              <div
                key={lineNum}
                className={`px-2.5 h-6 flex items-center justify-end gap-1 tabular-nums text-xs ${
                  isError
                    ? 'bg-red-500/20 text-red-300 font-semibold'
                    : isActive
                    ? 'bg-sky-500/25 text-sky-300 font-semibold'
                    : 'text-slate-500'
                }`}
              >
                {isActive && <ArrowRight className="w-3 h-3 text-sky-400 shrink-0" />}
                <span>{lineNum}</span>
              </div>
            );
          })}
        </div>

        {/* Editable Textarea + Line Highlight Layer */}
        <div className="relative flex-1 overflow-hidden">
          {(activeLine !== null || errorLine !== null) && (
            <div aria-hidden="true" className="absolute inset-0 py-3 pointer-events-none">
              {lines.map((_, idx) => {
                const lineNum = idx + 1;
                const isActive = activeLine === lineNum;
                const isError = errorLine === lineNum;
                return (
                  <div
                    key={lineNum}
                    className={`h-6 w-full ${
                      isError
                        ? 'bg-red-500/15'
                        : isActive
                        ? 'bg-sky-500/15'
                        : ''
                    }`}
                  />
                );
              })}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            aria-label="Python 程式碼編輯器"
            className="relative z-10 w-full h-full min-h-[inherit] p-3 bg-transparent text-slate-100 resize-y focus:outline-none leading-6 font-mono text-sm whitespace-pre overflow-x-auto"
            style={{ minHeight }}
          />
        </div>
      </div>
    </div>
  );
};

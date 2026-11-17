import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Square,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import { ExecutionResult, ExecutionStep, VariableSnapshot } from '../engine/pythonRuntime';

interface ExecutionVisualizerProps {
  result: ExecutionResult | null;
  isTracing: boolean;
  traceIndex: number;
  isPlaying: boolean;
  onStepPrev: () => void;
  onStepNext: () => void;
  onTogglePlay: () => void;
  onStopTrace: () => void;
}

export const ExecutionVisualizer: React.FC<ExecutionVisualizerProps> = ({
  result,
  isTracing,
  traceIndex,
  isPlaying,
  onStepPrev,
  onStepNext,
  onTogglePlay,
  onStopTrace,
}) => {
  const activeStep: ExecutionStep | null =
    isTracing && result && result.steps.length > 0
      ? result.steps[Math.min(traceIndex, result.steps.length - 1)]
      : null;

  const displayedStdout = activeStep
    ? activeStep.stdout
    : result?.stdout ?? [];

  const displayedVariables: VariableSnapshot[] = activeStep
    ? activeStep.variables
    : result && result.steps.length > 0
    ? result.steps[result.steps.length - 1].variables
    : [];

  return (
    <div className="space-y-4">
      {/* Trace Playback Deck (only visible during step-by-step tracing) */}
      {isTracing && result && result.steps.length > 0 && (
        <div className="border border-sky-200 bg-sky-50/70 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-sky-900">
              <Cpu className="w-4 h-4 text-sky-700" aria-hidden="true" />
              <span>逐行執行追蹤模式</span>
              <span className="text-sky-400" aria-hidden="true">·</span>
              <span className="tabular-nums font-mono">
                第 {traceIndex + 1} / {result.steps.length} 步
              </span>
              {activeStep && (
                <>
                  <span className="text-sky-400" aria-hidden="true">·</span>
                  <span className="tabular-nums">目前第 {activeStep.line} 行</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onStepPrev}
                disabled={traceIndex <= 0}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                上一步
              </button>
              <button
                type="button"
                onClick={onTogglePlay}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-sky-600 text-white rounded-md hover:bg-sky-700 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                    暫停
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" aria-hidden="true" />
                    自動播放
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onStepNext}
                disabled={traceIndex >= result.steps.length - 1}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
              >
                下一步
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onStopTrace}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-md hover:bg-white/80 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Square className="w-3 h-3" aria-hidden="true" />
                結束
              </button>
            </div>
          </div>

          {activeStep && (
            <div className="bg-white border border-sky-200/80 rounded-lg px-3.5 py-2.5 text-sm text-slate-800">
              <span className="font-mono text-xs text-sky-700 mr-2">Line {activeStep.line}</span>
              <span>{activeStep.insight}</span>
            </div>
          )}
        </div>
      )}

      {/* Console Output */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Terminal className="w-4 h-4 text-slate-500" aria-hidden="true" />
            <span>終端機輸出 (Console)</span>
          </div>
          <div className="text-xs font-medium">
            {!result ? (
              <span className="text-slate-500">等待執行</span>
            ) : result.error ? (
              <span className="inline-flex items-center gap-1 text-red-700">
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                執行發生錯誤
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                執行成功
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-950 text-slate-100 p-4 font-mono text-sm min-h-[108px] max-h-[220px] overflow-y-auto space-y-1">
          {!result && (
            <p className="text-slate-400 text-xs">
              點擊上方「執行程式」或「逐步追蹤」即可查看執行結果。
            </p>
          )}
          {result && displayedStdout.length === 0 && !result.error && (
            <p className="text-slate-400 text-xs">（程式執行完畢，沒有使用 print() 輸出任何文字）</p>
          )}
          {displayedStdout.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-words leading-6">
              {line}
            </div>
          ))}
          {result?.error && (
            <div className="mt-2 pt-2 border-t border-red-900/50 text-red-300 text-xs leading-5">
              <div className="font-semibold">
                {result.error.type}
                {result.error.line ? `（第 ${result.error.line} 行）` : ''}
              </div>
              <div className="mt-0.5 text-red-200">{result.error.message}</div>
            </div>
          )}
        </div>
      </div>

      {/* Live Memory & Variable Inspector */}
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          <span className="text-xs font-semibold text-slate-700">
            記憶體變數狀態 ({isTracing ? '即時快照' : '執行結束快照'})
          </span>
          <span className="text-xs text-slate-500 tabular-nums">
            共 {displayedVariables.length} 個變數
          </span>
        </div>

        <div className="p-4">
          {displayedVariables.length === 0 ? (
            <p className="text-xs text-slate-500">
              目前尚未建立任何全域變數。執行程式後，所有變數與型別將會顯示於此。
            </p>
          ) : (
            <div className="space-y-3">
              {displayedVariables.map((v) => (
                <div
                  key={v.name}
                  className={`rounded-lg border p-3 transition-colors ${
                    v.isNew || v.changed
                      ? 'border-sky-300 bg-sky-50/60'
                      : 'border-slate-200 bg-slate-50/40'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-mono text-sm">
                      <span className="font-semibold text-slate-900">{v.name}</span>
                      <span className="text-xs text-slate-400" aria-hidden="true">·</span>
                      <span className="text-xs text-slate-500">{v.typeName}</span>
                    </div>

                    {(v.isNew || v.changed) && isTracing && (
                      <span className="text-xs font-medium text-sky-700">
                        {v.isNew ? '新增變數' : '數值更新'}
                      </span>
                    )}
                  </div>

                  {/* Visual box layout for Lists/Tuples */}
                  {(v.kind === 'list' || v.kind === 'tuple') && v.items ? (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {v.items.length === 0 ? (
                        <span className="font-mono text-xs text-slate-500">空{v.kind === 'list' ? '串列 []' : '元組 ()'}</span>
                      ) : (
                        v.items.map((item) => (
                          <div
                            key={item.keyOrIndex}
                            className="border border-slate-200 bg-white rounded-md px-2.5 py-1.5 text-center min-w-[44px]"
                          >
                            <div className="font-mono text-[10px] text-slate-400 tabular-nums">
                              [{item.keyOrIndex}]
                            </div>
                            <div className="font-mono text-xs font-medium text-slate-900 mt-0.5">
                              {item.repr}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : v.kind === 'dict' && v.items ? (
                    <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {v.items.length === 0 ? (
                        <span className="font-mono text-xs text-slate-500">空字典 {'{}'}</span>
                      ) : (
                        v.items.map((entry) => (
                          <div
                            key={entry.keyOrIndex}
                            className="flex items-center justify-between gap-2 border border-slate-200 bg-white rounded-md px-2.5 py-1.5 font-mono text-xs"
                          >
                            <span className="text-sky-700 font-medium truncate">{entry.keyOrIndex}</span>
                            <span className="text-slate-400" aria-hidden="true">→</span>
                            <span className="text-slate-900 truncate">{entry.repr}</span>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="mt-1.5 font-mono text-sm text-slate-800 break-all">
                      {v.repr}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

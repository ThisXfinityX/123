import React, { useEffect, useState } from 'react';
import { PLAYGROUND_TEMPLATES } from '../data/curriculum';
import { ExecutionResult, runPythonCode } from '../engine/pythonRuntime';
import { CodeEditor } from './CodeEditor';
import { ExecutionVisualizer } from './ExecutionVisualizer';

interface PlaygroundViewProps {
  initialCode?: string | null;
}

export const PlaygroundView: React.FC<PlaygroundViewProps> = ({ initialCode }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState(PLAYGROUND_TEMPLATES[0].id);
  const [code, setCode] = useState(initialCode || PLAYGROUND_TEMPLATES[0].code);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [isTracing, setIsTracing] = useState(false);
  const [traceIndex, setTraceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
      setIsTracing(false);
      setIsPlaying(false);
      setResult(runPythonCode(initialCode));
    }
  }, [initialCode]);

  useEffect(() => {
    if (!isTracing || !isPlaying || !result) return;
    if (traceIndex >= result.steps.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setTraceIndex((prev) => prev + 1);
    }, 850);
    return () => window.clearTimeout(timer);
  }, [isTracing, isPlaying, traceIndex, result]);

  const handleSelectTemplate = (templateId: string) => {
    const tpl = PLAYGROUND_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setSelectedTemplateId(templateId);
    setCode(tpl.code);
    setResult(null);
    setIsTracing(false);
    setIsPlaying(false);
  };

  const handleRun = () => {
    setIsPlaying(false);
    setIsTracing(false);
    setResult(runPythonCode(code));
  };

  const handleStartTrace = () => {
    setIsPlaying(false);
    const res = runPythonCode(code);
    setResult(res);
    if (res.steps.length > 0) {
      setIsTracing(true);
      setTraceIndex(0);
    } else {
      setIsTracing(false);
    }
  };

  const handleReset = () => {
    const tpl = PLAYGROUND_TEMPLATES.find((t) => t.id === selectedTemplateId) || PLAYGROUND_TEMPLATES[0];
    setCode(tpl.code);
    setResult(null);
    setIsTracing(false);
    setIsPlaying(false);
  };

  const activeLine =
    isTracing && result && result.steps[traceIndex]
      ? result.steps[traceIndex].line
      : null;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
            Python 自由練習場
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            撰寫任何 Python 程式片段，支援即時執行與逐行記憶體追蹤視覺化。
          </p>
        </div>

        {/* Starter Template Selector */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg self-start">
          {PLAYGROUND_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleSelectTemplate(tpl.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedTemplateId === tpl.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tpl.title}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7">
          <CodeEditor
            code={code}
            onChange={setCode}
            onRun={handleRun}
            onStartTrace={handleStartTrace}
            onReset={handleReset}
            activeLine={activeLine}
            errorLine={result?.error?.line ?? null}
            title="sandbox.py"
            minHeight="380px"
          />
        </div>
        <div className="xl:col-span-5">
          <ExecutionVisualizer
            result={result}
            isTracing={isTracing}
            traceIndex={traceIndex}
            isPlaying={isPlaying}
            onStepPrev={() => {
              setIsPlaying(false);
              setTraceIndex((p) => Math.max(0, p - 1));
            }}
            onStepNext={() => {
              setIsPlaying(false);
              setTraceIndex((p) => Math.min((result?.steps.length ?? 1) - 1, p + 1));
            }}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onStopTrace={() => {
              setIsPlaying(false);
              setIsTracing(false);
            }}
          />
        </div>
      </div>
    </div>
  );
};

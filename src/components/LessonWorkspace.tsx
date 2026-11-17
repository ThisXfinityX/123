import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  BookOpen,
  Code2,
  ClipboardCheck,
  AlertCircle,
  PlayCircle,
} from 'lucide-react';
import { LessonChapter, ChallengeCheckResult } from '../data/curriculum';
import { ExecutionResult, runPythonCode } from '../engine/pythonRuntime';
import { CodeEditor } from './CodeEditor';
import { ExecutionVisualizer } from './ExecutionVisualizer';

export type LessonTab = 'concept' | 'challenge' | 'quiz';

interface LessonWorkspaceProps {
  chapters: LessonChapter[];
  activeChapterId: string;
  activeTab: LessonTab;
  completedChallenges: string[];
  completedQuizzes: string[];
  onSelectChapter: (chapterId: string) => void;
  onSelectTab: (tab: LessonTab) => void;
  onCompleteChallenge: (chapterId: string) => void;
  onCompleteQuiz: (chapterId: string) => void;
}

export const LessonWorkspace: React.FC<LessonWorkspaceProps> = ({
  chapters,
  activeChapterId,
  activeTab,
  completedChallenges,
  completedQuizzes,
  onSelectChapter,
  onSelectTab,
  onCompleteChallenge,
  onCompleteQuiz,
}) => {
  const chapter = chapters.find((c) => c.id === activeChapterId) || chapters[0];
  const chapterIdx = chapters.findIndex((c) => c.id === chapter.id);
  const nextChapter = chapterIdx < chapters.length - 1 ? chapters[chapterIdx + 1] : null;

  const [exampleCode, setExampleCode] = useState(chapter.exampleCode);
  const [challengeCode, setChallengeCode] = useState(chapter.challenge.starterCode);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [challengeFeedback, setChallengeFeedback] = useState<ChallengeCheckResult | null>(null);
  const [showHint, setShowHint] = useState(false);

  // Step-by-step trace state
  const [isTracing, setIsTracing] = useState(false);
  const [traceIndex, setTraceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Quiz state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Reset local editor/trace state when switching chapters
  useEffect(() => {
    setExampleCode(chapter.exampleCode);
    setChallengeCode(chapter.challenge.starterCode);
    setResult(null);
    setChallengeFeedback(null);
    setShowHint(false);
    setIsTracing(false);
    setTraceIndex(0);
    setIsPlaying(false);
    setSelectedOption(null);
    setQuizSubmitted(false);
  }, [chapter]);

  // Reset trace/output when switching between concept and challenge tabs
  useEffect(() => {
    setResult(null);
    setChallengeFeedback(null);
    setIsTracing(false);
    setTraceIndex(0);
    setIsPlaying(false);
  }, [activeTab]);

  // Auto-play timer for step-by-step execution
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

  const currentCode = activeTab === 'challenge' ? challengeCode : exampleCode;
  const setCurrentCode = activeTab === 'challenge' ? setChallengeCode : setExampleCode;

  const handleRun = () => {
    setIsPlaying(false);
    setIsTracing(false);
    setChallengeFeedback(null);
    const res = runPythonCode(currentCode);
    setResult(res);
  };

  const handleStartTrace = () => {
    setIsPlaying(false);
    setChallengeFeedback(null);
    const res = runPythonCode(currentCode);
    setResult(res);
    if (res.steps.length > 0) {
      setIsTracing(true);
      setTraceIndex(0);
    } else {
      setIsTracing(false);
    }
  };

  const handleResetCode = () => {
    setIsPlaying(false);
    setIsTracing(false);
    setResult(null);
    setChallengeFeedback(null);
    if (activeTab === 'challenge') {
      setChallengeCode(chapter.challenge.starterCode);
    } else {
      setExampleCode(chapter.exampleCode);
    }
  };

  const handleCheckChallenge = () => {
    setIsPlaying(false);
    setIsTracing(false);
    const res = runPythonCode(challengeCode);
    setResult(res);
    const check = chapter.challenge.verify(res);
    setChallengeFeedback(check);
    if (check.passed) {
      onCompleteChallenge(chapter.id);
    }
  };

  const handleLoadConceptSnippet = (snippet: string) => {
    setIsPlaying(false);
    setIsTracing(false);
    setExampleCode(snippet);
    const res = runPythonCode(snippet);
    setResult(res);
  };

  const handleSubmitQuiz = () => {
    if (selectedOption === null) return;
    setQuizSubmitted(true);
    if (selectedOption === chapter.quiz.correctIndex) {
      onCompleteQuiz(chapter.id);
    }
  };

  const activeLine =
    isTracing && result && result.steps[traceIndex]
      ? result.steps[traceIndex].line
      : null;

  const isChallengeDone = completedChallenges.includes(chapter.id);
  const isQuizDone = completedQuizzes.includes(chapter.id);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 lg:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[272px_minmax(0,1fr)] gap-8 items-start">
        {/* Left Sidebar: Curriculum Navigator */}
        <aside aria-label="課程章節目錄" className="lg:sticky lg:top-20 bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">課程目錄</h2>
            <span className="text-xs text-slate-500 tabular-nums">
              {completedChallenges.length} / {chapters.length} 挑戰完成
            </span>
          </div>

          <ul className="space-y-1">
            {chapters.map((item) => {
              const isSelected = item.id === chapter.id;
              const done = completedChallenges.includes(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelectChapter(item.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                      isSelected
                        ? 'bg-sky-50 text-sky-900 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="text-sm truncate">
                      <span className="font-mono text-xs mr-2 tabular-nums text-slate-400">
                        {item.number}.
                      </span>
                      {item.title}
                    </span>
                    {done && (
                      <CheckCircle2
                        className="w-4 h-4 text-emerald-600 shrink-0"
                        aria-label="已完成"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Main Learning Stage */}
        <main className="min-w-0 space-y-6">
          {/* Chapter Header + Mode Switcher */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
              <span className="font-mono tabular-nums">第 {chapter.number} 章</span>
              <span aria-hidden="true">·</span>
              <span>{chapter.category}</span>
              <span aria-hidden="true">·</span>
              <span>{chapter.duration}</span>
              {isChallengeDone && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-700 font-medium">實作挑戰已通過</span>
                </>
              )}
              {isQuizDone && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-sky-700 font-medium">測驗已通過</span>
                </>
              )}
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="max-w-2xl">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
                  {chapter.number}. {chapter.title}
                </h1>
                <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
                  {chapter.summary}
                </p>
              </div>

              {/* Segmented Tab Controls */}
              <div
                role="tablist"
                aria-label="單元學習模式"
                className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 self-start md:self-auto"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'concept'}
                  onClick={() => onSelectTab('concept')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'concept'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                  概念與範例
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'challenge'}
                  onClick={() => onSelectTab('challenge')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'challenge'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
                  實作挑戰
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'quiz'}
                  onClick={() => onSelectTab('quiz')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'quiz'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  隨堂測驗
                </button>
              </div>
            </div>
          </div>

          {/* Tab 1: Concept & Interactive Sandbox */}
          {activeTab === 'concept' && (
            <div className="space-y-6">
              {/* Two Concept Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {chapter.concepts.map((concept, idx) => (
                  <section
                    key={idx}
                    className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <h2 className="text-base font-semibold text-slate-900">
                        {concept.title}
                      </h2>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {concept.description}
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <pre className="bg-slate-950 text-slate-100 rounded-lg p-3.5 font-mono text-xs leading-6 overflow-x-auto">
                        <code>{concept.code}</code>
                      </pre>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleLoadConceptSnippet(concept.code)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:text-sky-800 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <PlayCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          載入下方實驗室試跑
                        </button>
                      </div>
                    </div>
                  </section>
                ))}
              </div>

              {/* Interactive Python Sandbox (Two-Zone Split) */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                <div className="xl:col-span-7 space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-800">
                      互動範例編輯器（可自由修改程式碼測試）
                    </h2>
                    <button
                      type="button"
                      onClick={() => onSelectTab('challenge')}
                      className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-800 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      前往本章實作挑戰
                      <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <CodeEditor
                    code={exampleCode}
                    onChange={setExampleCode}
                    onRun={handleRun}
                    onStartTrace={handleStartTrace}
                    onReset={handleResetCode}
                    activeLine={activeLine}
                    errorLine={result?.error?.line ?? null}
                    title={`lesson_${chapter.number}.py`}
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
          )}

          {/* Tab 2: Hands-on Challenge */}
          {activeTab === 'challenge' && (
            <div className="space-y-6">
              {/* Challenge Specification */}
              <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      挑戰任務：{chapter.challenge.title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {chapter.challenge.goal}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowHint((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      {showHint ? '隱藏提示' : '查看提示'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setChallengeCode(chapter.challenge.solutionCode);
                        setChallengeFeedback(null);
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      載入參考解答
                    </button>
                  </div>
                </div>

                <ul className="space-y-1.5 text-sm text-slate-700">
                  {chapter.challenge.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-mono text-xs text-slate-400 mt-1 tabular-nums">
                        {idx + 1}.
                      </span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>

                {showHint && (
                  <div className="border border-amber-200 bg-amber-50/70 rounded-lg px-4 py-3 text-sm text-amber-900">
                    <span className="font-semibold mr-2">思考提示：</span>
                    <span>{chapter.challenge.hint}</span>
                  </div>
                )}

                {challengeFeedback && (
                  <div
                    role="status"
                    className={`rounded-lg border px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm ${
                      challengeFeedback.passed
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-red-200 bg-red-50 text-red-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {challengeFeedback.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
                      )}
                      <span className="font-medium">
                        {challengeFeedback.passed ? '通過驗證：' : '尚未通過：'}
                        {challengeFeedback.feedback}
                      </span>
                    </div>

                    {challengeFeedback.passed && nextChapter && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectChapter(nextChapter.id);
                          onSelectTab('concept');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-emerald-700 text-white rounded-md hover:bg-emerald-800 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        下一章：{nextChapter.title}
                        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}
              </section>

              {/* Challenge Editor & Visualizer */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                <div className="xl:col-span-7">
                  <CodeEditor
                    code={challengeCode}
                    onChange={setChallengeCode}
                    onRun={handleRun}
                    onStartTrace={handleStartTrace}
                    onReset={handleResetCode}
                    onCheckChallenge={handleCheckChallenge}
                    activeLine={activeLine}
                    errorLine={result?.error?.line ?? null}
                    title={`challenge_${chapter.number}.py`}
                    minHeight="300px"
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
          )}

          {/* Tab 3: Quick Knowledge Check Quiz */}
          {activeTab === 'quiz' && (
            <section className="bg-white border border-slate-200 rounded-xl p-6 max-w-3xl space-y-5">
              <div>
                <div className="text-xs text-slate-500 mb-1">
                  第 {chapter.number} 章觀念檢核
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {chapter.quiz.question}
                </h2>
              </div>

              {chapter.quiz.codeSnippet && (
                <pre className="bg-slate-950 text-slate-100 rounded-lg p-4 font-mono text-sm leading-6 overflow-x-auto">
                  <code>{chapter.quiz.codeSnippet}</code>
                </pre>
              )}

              <div className="space-y-2.5" role="radiogroup" aria-label="測驗選項">
                {chapter.quiz.options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === chapter.quiz.correctIndex;
                  let borderClass = 'border-slate-200 bg-white hover:bg-slate-50';
                  if (quizSubmitted) {
                    if (isCorrect) borderClass = 'border-emerald-300 bg-emerald-50/70';
                    else if (isSelected) borderClass = 'border-red-300 bg-red-50/70';
                  } else if (isSelected) {
                    borderClass = 'border-sky-500 bg-sky-50/60';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => {
                        setSelectedOption(idx);
                        if (quizSubmitted) setQuizSubmitted(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors flex items-center justify-between gap-3 cursor-pointer ${borderClass}`}
                    >
                      <span className="text-sm text-slate-900">
                        <span className="font-mono text-xs text-slate-400 mr-2.5">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        {opt}
                      </span>
                      {quizSubmitted && isCorrect && (
                        <span className="text-xs font-medium text-emerald-700 shrink-0">
                          正確答案
                        </span>
                      )}
                      {quizSubmitted && isSelected && !isCorrect && (
                        <span className="text-xs font-medium text-red-700 shrink-0">
                          你的選擇
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleSubmitQuiz}
                  disabled={selectedOption === null}
                  className="px-4 py-2 text-sm font-medium bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0"
                >
                  送出答案
                </button>
                {nextChapter && quizSubmitted && selectedOption === chapter.quiz.correctIndex && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectChapter(nextChapter.id);
                      onSelectTab('concept');
                    }}
                    className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    前往下一章：{nextChapter.title}
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              {quizSubmitted && (
                <div
                  className={`rounded-lg border p-4 text-sm leading-relaxed ${
                    selectedOption === chapter.quiz.correctIndex
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : 'border-amber-200 bg-amber-50 text-amber-900'
                  }`}
                >
                  <div className="font-semibold mb-1">
                    {selectedOption === chapter.quiz.correctIndex ? '答對了！' : '再想一下：'}
                  </div>
                  <p>{chapter.quiz.explanation}</p>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { CheckCircle2, Circle, ChevronRight, RotateCcw } from 'lucide-react';
import { LessonChapter } from '../data/curriculum';
import { LessonTab } from './LessonWorkspace';

interface ProgressOverviewProps {
  chapters: LessonChapter[];
  completedChallenges: string[];
  completedQuizzes: string[];
  onOpenChapter: (chapterId: string, tab: LessonTab) => void;
  onResetProgress: () => void;
}

export const ProgressOverview: React.FC<ProgressOverviewProps> = ({
  chapters,
  completedChallenges,
  completedQuizzes,
  onOpenChapter,
  onResetProgress,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const totalTasks = chapters.length * 2;
  const doneTasks = completedChallenges.length + completedQuizzes.length;
  const percent = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
            學習進度總覽
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            追蹤每個章節的實作挑戰與隨堂測驗完成狀態，紀錄會自動儲存在您的瀏覽器中。
          </p>
        </div>

        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            重設學習紀錄
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <span className="text-xs font-medium text-red-900">確定清除所有完成紀錄？</span>
            <button
              type="button"
              onClick={() => {
                onResetProgress();
                setConfirmReset(false);
              }}
              className="px-2.5 py-1 text-xs font-medium bg-red-700 text-white rounded hover:bg-red-800 cursor-pointer whitespace-nowrap"
            >
              確定重設
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap"
            >
              取消
            </button>
          </div>
        )}
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">整體完成度</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{percent}%</div>
          <div className="mt-3 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-600 transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">實作程式挑戰</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
            {completedChallenges.length} / {chapters.length}
          </div>
          <p className="mt-2 text-xs text-slate-500">通過單元自動驗證測試</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">隨堂觀念測驗</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
            {completedQuizzes.length} / {chapters.length}
          </div>
          <p className="mt-2 text-xs text-slate-500">答對核心語法選擇題</p>
        </div>
      </div>

      {/* Chapter Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3.5 px-5">章節</th>
                <th className="py-3.5 px-4">分類</th>
                <th className="py-3.5 px-4">實作挑戰</th>
                <th className="py-3.5 px-4">隨堂測驗</th>
                <th className="py-3.5 px-5 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {chapters.map((ch) => {
                const cDone = completedChallenges.includes(ch.id);
                const qDone = completedQuizzes.includes(ch.id);
                return (
                  <tr key={ch.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5 font-medium text-slate-900">
                      <span className="font-mono text-xs text-slate-400 mr-2 tabular-nums">
                        {ch.number}.
                      </span>
                      {ch.title}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs">{ch.category}</td>
                    <td className="py-3.5 px-4">
                      {cDone ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                          已完成
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <Circle className="w-4 h-4 text-slate-300" aria-hidden="true" />
                          未完成
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {qDone ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700">
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                          已通過
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <Circle className="w-4 h-4 text-slate-300" aria-hidden="true" />
                          未作答
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenChapter(ch.id, cDone ? 'concept' : 'challenge')}
                        className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-900 cursor-pointer whitespace-nowrap"
                      >
                        {cDone ? '複習章節' : '前往挑戰'}
                        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

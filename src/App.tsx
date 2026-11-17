import { useEffect, useState } from 'react';
import { CURRICULUM } from './data/curriculum';
import { TopBar, AppView } from './components/TopBar';
import { LessonWorkspace, LessonTab } from './components/LessonWorkspace';
import { CheatSheetView } from './components/CheatSheetView';
import { PlaygroundView } from './components/PlaygroundView';
import { ProgressOverview } from './components/ProgressOverview';

const STORAGE_KEYS = {
  challenges: 'pycraft_completed_challenges',
  quizzes: 'pycraft_completed_quizzes',
  lastChapter: 'pycraft_last_chapter',
};

function readStoredList(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('lessons');
  const [activeChapterId, setActiveChapterId] = useState<string>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEYS.lastChapter);
      if (saved && CURRICULUM.some((c) => c.id === saved)) return saved;
    } catch {
      // ignore storage errors
    }
    return CURRICULUM[0].id;
  });
  const [activeLessonTab, setActiveLessonTab] = useState<LessonTab>('concept');
  const [completedChallenges, setCompletedChallenges] = useState<string[]>(() =>
    readStoredList(STORAGE_KEYS.challenges)
  );
  const [completedQuizzes, setCompletedQuizzes] = useState<string[]>(() =>
    readStoredList(STORAGE_KEYS.quizzes)
  );
  const [playgroundInitialCode, setPlaygroundInitialCode] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.lastChapter, activeChapterId);
    } catch {
      // ignore
    }
  }, [activeChapterId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.challenges, JSON.stringify(completedChallenges));
    } catch {
      // ignore
    }
  }, [completedChallenges]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.quizzes, JSON.stringify(completedQuizzes));
    } catch {
      // ignore
    }
  }, [completedQuizzes]);

  const handleCompleteChallenge = (chapterId: string) => {
    setCompletedChallenges((prev) => (prev.includes(chapterId) ? prev : [...prev, chapterId]));
  };

  const handleCompleteQuiz = (chapterId: string) => {
    setCompletedQuizzes((prev) => (prev.includes(chapterId) ? prev : [...prev, chapterId]));
  };

  const handleJumpToChallenge = () => {
    setActiveView('lessons');
    setActiveLessonTab('challenge');
  };

  const handleTryInPlayground = (code: string) => {
    setPlaygroundInitialCode(code);
    setActiveView('playground');
  };

  const handleResetProgress = () => {
    setCompletedChallenges([]);
    setCompletedQuizzes([]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopBar
        activeView={activeView}
        onSelectView={setActiveView}
        onJumpToChallenge={handleJumpToChallenge}
      />

      <div className="flex-1">
        {activeView === 'lessons' && (
          <LessonWorkspace
            chapters={CURRICULUM}
            activeChapterId={activeChapterId}
            activeTab={activeLessonTab}
            completedChallenges={completedChallenges}
            completedQuizzes={completedQuizzes}
            onSelectChapter={(id) => {
              setActiveChapterId(id);
            }}
            onSelectTab={setActiveLessonTab}
            onCompleteChallenge={handleCompleteChallenge}
            onCompleteQuiz={handleCompleteQuiz}
          />
        )}

        {activeView === 'cheatsheet' && (
          <CheatSheetView onTryInPlayground={handleTryInPlayground} />
        )}

        {activeView === 'progress' && (
          <ProgressOverview
            chapters={CURRICULUM}
            completedChallenges={completedChallenges}
            completedQuizzes={completedQuizzes}
            onOpenChapter={(chapterId, tab) => {
              setActiveChapterId(chapterId);
              setActiveLessonTab(tab);
              setActiveView('lessons');
            }}
            onResetProgress={handleResetProgress}
          />
        )}

        {activeView === 'playground' && (
          <PlaygroundView initialCode={playgroundInitialCode} />
        )}
      </div>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>Python 互動教室 · 零基礎互動式程式設計教學</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveView('lessons')}
              className="hover:text-slate-900 cursor-pointer"
            >
              課程單元
            </button>
            <button
              type="button"
              onClick={() => setActiveView('cheatsheet')}
              className="hover:text-slate-900 cursor-pointer"
            >
              語法速查
            </button>
            <button
              type="button"
              onClick={() => setActiveView('playground')}
              className="hover:text-slate-900 cursor-pointer"
            >
              自由練習場
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

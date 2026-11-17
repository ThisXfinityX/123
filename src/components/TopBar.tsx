import React from 'react';

export type AppView = 'lessons' | 'cheatsheet' | 'progress' | 'playground';

interface TopBarProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  onJumpToChallenge: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  onSelectView,
  onJumpToChallenge,
}) => {
  const navItemClass = (isActive: boolean) =>
    `relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 rounded ${
      isActive
        ? 'text-sky-700'
        : 'text-slate-600 hover:text-slate-900'
    }`;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element wordmark */}
        <button
          type="button"
          onClick={() => onSelectView('lessons')}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 rounded"
        >
          Python 互動教室
        </button>

        {/* Zone 2: 4 concise single-line navigation links */}
        <nav aria-label="主要導覽" className="hidden md:flex items-center gap-6">
          <button
            type="button"
            onClick={() => onSelectView('lessons')}
            className={navItemClass(activeView === 'lessons')}
          >
            課程單元
            {activeView === 'lessons' && (
              <span className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-sky-600" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={onJumpToChallenge}
            className={navItemClass(false)}
          >
            實作挑戰
          </button>
          <button
            type="button"
            onClick={() => onSelectView('cheatsheet')}
            className={navItemClass(activeView === 'cheatsheet')}
          >
            語法速查
            {activeView === 'cheatsheet' && (
              <span className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-sky-600" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onSelectView('progress')}
            className={navItemClass(activeView === 'progress')}
          >
            學習總覽
            {activeView === 'progress' && (
              <span className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-sky-600" aria-hidden="true" />
            )}
          </button>
        </nav>

        {/* Zone 3: 1 primary CTA */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onSelectView('playground')}
            className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 ${
              activeView === 'playground'
                ? 'bg-sky-700 text-white'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            自由練習場
          </button>
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <nav
        aria-label="行動版導覽"
        className="md:hidden flex items-center gap-4 px-4 pb-2.5 overflow-x-auto border-t border-slate-100 pt-2"
      >
        <button
          type="button"
          onClick={() => onSelectView('lessons')}
          className={`text-xs font-medium whitespace-nowrap shrink-0 ${
            activeView === 'lessons' ? 'text-sky-700' : 'text-slate-600'
          }`}
        >
          課程單元
        </button>
        <button
          type="button"
          onClick={onJumpToChallenge}
          className="text-xs font-medium text-slate-600 whitespace-nowrap shrink-0"
        >
          實作挑戰
        </button>
        <button
          type="button"
          onClick={() => onSelectView('cheatsheet')}
          className={`text-xs font-medium whitespace-nowrap shrink-0 ${
            activeView === 'cheatsheet' ? 'text-sky-700' : 'text-slate-600'
          }`}
        >
          語法速查
        </button>
        <button
          type="button"
          onClick={() => onSelectView('progress')}
          className={`text-xs font-medium whitespace-nowrap shrink-0 ${
            activeView === 'progress' ? 'text-sky-700' : 'text-slate-600'
          }`}
        >
          學習總覽
        </button>
      </nav>
    </header>
  );
};

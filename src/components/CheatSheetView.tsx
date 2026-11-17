import React, { useMemo, useState } from 'react';
import { Search, Play } from 'lucide-react';
import { CheatSheetItem, SYNTAX_CHEATSHEET } from '../data/curriculum';

interface CheatSheetViewProps {
  onTryInPlayground: (code: string) => void;
}

type FilterCategory = 'all' | CheatSheetItem['category'];

const FILTER_TABS: { id: FilterCategory; label: string }[] = [
  { id: 'all', label: '全部語法' },
  { id: 'basics', label: '基礎與型別' },
  { id: 'control', label: '條件與迴圈' },
  { id: 'collections', label: '串列與字典' },
  { id: 'functions', label: '函式與內建工具' },
];

export const CheatSheetView: React.FC<CheatSheetViewProps> = ({ onTryInPlayground }) => {
  const [category, setCategory] = useState<FilterCategory>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SYNTAX_CHEATSHEET.filter((item) => {
      const catOk = category === 'all' || item.category === category;
      if (!catOk) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.syntax.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.exampleCode.toLowerCase().includes(q)
      );
    });
  }, [category, query]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="space-y-2 max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
          Python 常用語法速查表
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          忘記切片、字典方法或格式化語法時，可在此快速檢索並一鍵載入練習場實際執行。
        </p>
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategory(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                category === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋語法關鍵字（如 range, dict）"
            aria-label="搜尋 Python 語法"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <p className="text-sm font-medium text-slate-800">找不到符合「{query}」的語法項目</p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setCategory('all');
            }}
            className="text-xs font-medium text-sky-700 hover:text-sky-800 cursor-pointer"
          >
            清除搜尋條件
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{item.categoryLabel}</span>
                  <span aria-hidden="true">·</span>
                  <code className="font-mono text-sky-700">{item.syntax}</code>
                </div>
                <h2 className="text-base font-semibold text-slate-900">{item.title}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
              </div>

              <div className="space-y-2.5">
                <pre className="bg-slate-950 text-slate-100 rounded-lg p-3.5 font-mono text-xs leading-6 overflow-x-auto">
                  <code>{item.exampleCode}</code>
                </pre>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onTryInPlayground(item.exampleCode)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-700 hover:text-sky-900 hover:bg-sky-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" aria-hidden="true" />
                    在練習場試跑
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

'use client';

import { useState } from 'react';
import { WorkspaceShell } from '@/components/workspace-shell';

const initialItems = [
  '早起后先打开任务列表',
  '学习时会优先查看复习记录',
  '常用深色模式进行夜间阅读',
  '遇到复杂任务会先拆分步骤'
];

export default function BehaviorMemoryPage() {
  const [items, setItems] = useState(initialItems);
  const [draft, setDraft] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const record = () => {
    const text = draft.trim();
    if (!text) return;
    if (editingIndex === null) {
      setItems((prev) => [text, ...prev]);
    } else {
      setItems((prev) => prev.map((item, index) => (index === editingIndex ? text : item)));
    }
    setDraft('');
    setEditingIndex(null);
  };

  return (
    <WorkspaceShell active="/memory">
      <section className="panel text-zinc-100">
        <p className="text-sm text-zinc-500">记忆中心 / 行为记忆</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-50">行为记忆</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">这里记录你经常做的事和操作习惯，让系统逐渐理解你的行为模式。</p>
      </section>

      <section className="panel text-zinc-100">
        <div className="flex gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="记录一个行为习惯" className="flex-1 rounded-full border border-zinc-800 bg-zinc-800/30 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-blue-500/40" />
          <button onClick={record} className="rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white">{editingIndex === null ? '记录' : '保存'}</button>
          <button onClick={() => { setDraft(''); setEditingIndex(null); }} className="rounded-full border border-zinc-800 bg-zinc-800/60 px-4 py-3 text-sm text-zinc-300">清空</button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="rounded-lg border border-zinc-800 bg-zinc-800/60 p-5 text-zinc-100 shadow-[0_24px_80px_rgba(123,110,101,0.08)]">
            <p className="text-sm leading-7">{item}</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setDraft(item); setEditingIndex(index); }} className="rounded-full border border-zinc-800 bg-zinc-800/60 px-3 py-1 text-xs text-zinc-300">编辑</button>
              <button onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))} className="rounded-full border border-zinc-800 bg-zinc-800/60 px-3 py-1 text-xs text-zinc-300">清空</button>
            </div>
          </div>
        ))}
      </section>
    </WorkspaceShell>
  );
}

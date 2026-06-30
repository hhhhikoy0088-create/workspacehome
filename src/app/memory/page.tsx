'use client';

import Link from 'next/link';
import { WorkspaceShell } from '@/components/workspace-shell';

const cards = [
  {
    title: '行为记忆',
    href: '/memory/behavior',
    desc: '记录你做过的事、常用操作和重复习惯。'
  },
  {
    title: '偏好记忆',
    href: '/memory/preferences',
    desc: '记录你喜欢的风格、内容与设置。'
  },
  {
    title: '知识记忆',
    href: '/memory/knowledge',
    desc: '记录你学习过的知识、笔记与关键内容。'
  }
];

export default function MemoryPage() {
  return (
    <WorkspaceShell active="/memory">
      <section className="panel text-zinc-100">
        <p className="text-sm text-zinc-500">记忆中心</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-50">三类记忆管理</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">记忆会按照名称对应功能来保存和管理，帮助系统更准确地理解你的使用习惯、知识积累和偏好。</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.title} href={card.href} className="rounded-xl border border-zinc-800 bg-zinc-800/60 p-5 text-zinc-100 shadow-[0_24px_80px_rgba(123,110,101,0.08)] transition hover:border-zinc-700 hover:bg-zinc-800">
            <div className="text-sm font-semibold text-zinc-50">{card.title}</div>
            <p className="mt-2 text-sm leading-7 text-zinc-400">{card.desc}</p>
          </Link>
        ))}
      </section>
    </WorkspaceShell>
  );
}

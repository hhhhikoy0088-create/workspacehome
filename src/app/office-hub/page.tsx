'use client';

import Link from 'next/link';
import { WorkspaceShell } from '@/components/workspace-shell';

const tools = [
  { title: 'AI PPT助手', icon: '▶', href: '/ppt', desc: '自动生成汇报、路演、答辩PPT' },
  { title: '会议纪要', icon: '◉', href: '/meeting', desc: '语音转写、提炼行动项与任务同步' },
  { title: '数据分析', icon: '⊕', href: '/analytics', desc: '上传表格后自动分析与可视化' }
];

export default function OfficeHubPage() {
  return (
    <WorkspaceShell active="/office-hub">
      <>
          <div className="panel max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">办公效率中心</h1>
            <p className="mt-3 text-base leading-7 text-zinc-400">覆盖简历优化、PPT 生成、会议纪要、数据分析等高频场景。</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Link href="/resume-optimizer" className="panel block text-left transition hover:border-zinc-700">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/60 font-mono text-lg text-blue-400">
                  ✨
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-50">简历优化</h2>
                  <p className="mt-1.5 text-sm leading-6 text-zinc-500">提升ATS匹配度并优化表达</p>
                </div>
              </div>
            </Link>

            {tools.map((tool) => (
              <Link key={tool.title} href={tool.href} className="panel block transition hover:border-zinc-700">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/60 font-mono text-blue-400">
                    {tool.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-50">{tool.title}</h2>
                    <p className="mt-1.5 text-sm leading-6 text-zinc-500">{tool.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
      </>
    </WorkspaceShell>
  );
}

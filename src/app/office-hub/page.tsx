'use client';

import Link from 'next/link';
import { WorkspaceShell } from '@/components/workspace-shell';
import { motion } from 'framer-motion';

const modules = [
  {
    title: '简历优化',
    href: '/resume-optimizer',
    desc: '解析目标岗位 JD，智能提炼经历亮点，生成 ATS 友好版本。',
    tags: ['ATS 匹配', '关键词优化', '多版本导出'],
    color: 'cyan',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    title: 'AI PPT助手',
    href: '/ppt',
    desc: '一句话生成大纲，自动配图、排版与动画，支持在线演示。',
    tags: ['一键生成', '智能排版', '在线演示'],
    color: 'indigo',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 8v8M8 12h8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    title: '会议纪要',
    href: '/meeting',
    desc: '语音转写、发言人识别、提炼行动项并同步到任务看板。',
    tags: ['语音转写', '行动项', '任务同步'],
    color: 'violet',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    title: '数据分析',
    href: '/analytics',
    desc: '上传 Excel 自动清洗、统计、可视化，并输出 AI 洞察报告。',
    tags: ['Excel 解析', '自动图表', 'AI 报告'],
    color: 'emerald',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M3 3v18h18M18 17V9M13 17V5M8 17v-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
];

const colorMap: Record<string, { text: string; border: string; bg: string; glow: string }> = {
  cyan: { text: 'text-cyan-300', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', glow: 'shadow-cyan-500/20' },
  indigo: { text: 'text-indigo-300', border: 'border-indigo-500/30', bg: 'bg-indigo-500/10', glow: 'shadow-indigo-500/20' },
  violet: { text: 'text-violet-300', border: 'border-violet-500/30', bg: 'bg-violet-500/10', glow: 'shadow-violet-500/20' },
  emerald: { text: 'text-emerald-300', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', glow: 'shadow-emerald-500/20' }
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const item = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' as const } }
};

export default function OfficeHubPage() {
  return (
    <WorkspaceShell active="/office-hub">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-950 via-zinc-950 to-slate-950 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] md:p-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 shrink-0"
        >
          <p className="text-sm font-medium tracking-[0.3em] text-cyan-300/80">OFFICE EFFICIENCY HUB</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">办公效率中心</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
            覆盖简历优化、PPT 生成、会议纪要、数据分析等高频场景，一站式完成工作提效。
          </p>
        </motion.div>

        {/* Main body */}
        <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[320px_1fr]">
          {/* Left panel */}
          <motion.aside
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-col overflow-y-auto rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          >
            <h2 className="text-lg font-semibold text-zinc-50">操作面板</h2>
            <p className="mt-1 text-sm text-zinc-500">选择一个模块开始，AI 会接管繁琐的重复工作。</p>

            <div className="mt-5 flex-1 space-y-3">
              {modules.map((m, idx) => (
                <Link
                  key={m.title}
                  href={m.href}
                  className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-3 transition hover:border-zinc-700 hover:bg-zinc-900/80"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-sm text-zinc-400 group-hover:text-zinc-200">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-200 group-hover:text-white">{m.title}</p>
                    <p className="truncate text-xs text-zinc-500">{m.tags[0]}</p>
                  </div>
                  <span className="ml-auto text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-zinc-300">→</span>
                </Link>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
              <p className="text-sm font-medium text-cyan-200">小贴士</p>
              <p className="mt-2 text-xs leading-5 text-zinc-400">
                所有工具生成的结果都会自动存入你的知识库，方便后续检索与复用。
              </p>
            </div>
          </motion.aside>

          {/* Right grid */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid min-h-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {modules.map((m) => {
              const c = colorMap[m.color];
              return (
                <motion.div key={m.title} variants={item} className="h-full min-h-0">
                    <Link
                    href={m.href}
                    className={`group flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:border-zinc-700 hover:bg-zinc-800/60 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)] ${c.glow}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${c.border} ${c.bg} ${c.text}`}>
                        {m.icon}
                      </div>
                      <span className="rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1 text-xs text-zinc-500">AI 驱动</span>
                    </div>

                    <div className="mt-4">
                      <h2 className="text-xl font-semibold text-zinc-50">{m.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">{m.desc}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {m.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-zinc-800 bg-zinc-950/60 px-2.5 py-1 text-xs text-zinc-400">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5 flex items-center gap-2 text-sm font-medium text-zinc-200 transition group-hover:text-white">
                      <span>进入工具</span>
                      <span className="transition group-hover:translate-x-1">→</span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </WorkspaceShell>
  );
}

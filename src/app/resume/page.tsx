import Link from 'next/link';
import { WorkspaceShell } from '@/components/workspace-shell';

const blocks = [
  { title: 'ATS 评分', desc: '自动检测关键词匹配度', span: 'md:col-span-1' },
  { title: '岗位匹配', desc: '匹配目标岗位要求', span: 'md:col-span-1' },
  { title: '优化建议', desc: '给出可执行修改点', span: 'md:col-span-1' },
  { title: '面试问题预测', desc: '预判常见追问', span: 'md:col-span-1' },
  { title: '重写简历', desc: '生成更强表达版本', span: 'md:col-span-1' },
  { title: '自我介绍生成', desc: '输出面试开场稿', span: 'md:col-span-1' }
];

export default function ResumePage() {
  return (
    <WorkspaceShell active="/office-hub">
      <div className="mb-4 flex items-center justify-start">
        <Link href="/office-hub" className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-800/60 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800">
          <span className="text-base">←</span>
          返回办公效率中心
        </Link>
      </div>

      <div className="panel text-zinc-100">
        <p className="text-sm text-zinc-500">简历工坊</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-50">简历优化与面试准备</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">上传简历后可生成多个岗位版本，并给出优化建议。</p>
      </div>

      <section className="grid gap-x-5 gap-y-7 md:grid-cols-2 xl:grid-cols-3">
        {blocks.map((item) => (
          <button
            key={item.title}
            className={`flex min-h-[148px] flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 text-left text-zinc-100 shadow-panel backdrop-blur-2xl transition hover:border-zinc-700 hover:bg-zinc-800/40 ${item.span}`}
          >
            <div>
              <div className="text-base font-semibold text-zinc-50">{item.title}</div>
              <div className="mt-2 text-sm leading-6 text-zinc-400">{item.desc}</div>
            </div>

          </button>
        ))}
      </section>
    </WorkspaceShell>
  );
}

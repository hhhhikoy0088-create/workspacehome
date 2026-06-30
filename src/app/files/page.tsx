import Link from 'next/link';
import { WorkspaceShell } from '@/components/workspace-shell';

const blocks = [
  { title: '自动分类', desc: '按文档类型与主题分类' },
  { title: '智能命名', desc: '统一文件命名规则' },
  { title: '重复检测', desc: '识别重复和相似文件' },
  { title: '自动打标签', desc: '生成可搜索标签' },
  { title: '文件预览', desc: '快速查看内容概要' },
  { title: '目录整理', desc: '建立清晰目录结构' }
];

export default function FilesPage() {
  return (
    <WorkspaceShell active="/files">
      <div className="mb-4 flex items-center justify-start">
        <Link href="/office-hub" className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-800/60 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800">
          <span className="text-base">←</span>
          返回办公效率中心
        </Link>
      </div>

      <div className="panel text-zinc-100">
        <p className="text-sm text-zinc-500">文件整理</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-50">把混乱资料变成可管理资产</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">拖拽上传后，系统会自动分类、重命名、提取标签并建立目录。</p>
      </div>

      <section className="grid gap-x-5 gap-y-7 md:grid-cols-2 xl:grid-cols-3">
        {blocks.map((item) => (
          <button key={item.title} className="flex min-h-[148px] flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 text-left text-zinc-100 shadow-panel backdrop-blur-2xl transition hover:border-zinc-700 hover:bg-zinc-800/40">
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

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { WorkspaceShell } from '@/components/workspace-shell';
import request from '@/api/request';

const USER_ID = 'demo-user';

export default function PptProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await request.get(`/ppt-projects?userId=${USER_ID}`);
        setProjects(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message || '加载项目失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <WorkspaceShell active="/office-hub">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/ppt" className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-800/60 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800">
          <span className="text-base">←</span>
          返回 PPT 助手
        </Link>
        <Link href="/office-hub" className="text-sm text-blue-400 transition hover:text-blue-300">返回办公效率中心 →</Link>
      </div>

      <section className="panel text-zinc-100">
        <p className="text-sm text-zinc-500">PPT 项目库</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-50">历史项目与复用记录</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">这里会展示你生成过的 PPT 项目，支持查看历史大纲、模板、页数，并继续复用。</p>
      </section>

      <section className="mt-4 panel">
        {loading ? <div className="text-sm text-zinc-400">正在加载项目...</div> : null}
        {error ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div> : null}
        {!loading && !error && projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-800/30 p-6 text-sm text-zinc-400">还没有 PPT 项目，去生成一个试试吧。</div>
        ) : null}
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {projects.map((project) => {
            const outline = typeof project.outline === 'string' ? (() => { try { return JSON.parse(project.outline); } catch { return null; } })() : project.outline;
            return (
              <div key={project.id} className="rounded-lg border border-zinc-800 bg-zinc-800/60 p-5 text-zinc-100 transition hover:border-zinc-700">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-50">{project.title}</h2>
                    <p className="mt-1 text-sm text-zinc-400">{project.ppt_type || '未指定类型'} · {project.template_name || '未指定模板'}</p>
                  </div>
                  <div className="rounded-full bg-zinc-800/30 px-3 py-1 text-xs text-zinc-400">{project.slide_count || 0} 页</div>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-zinc-300">
                  <div>项目 ID：{project.id}</div>
                  <div>创建时间：{project.created_at}</div>
                  <div>更新时间：{project.updated_at}</div>
                  <div>来源文件：{outline?.sourceFileId || '未记录'}</div>
                </div>

                {outline?.slides?.length ? (
                  <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-800/30 p-4">
                    <div className="text-sm font-semibold text-zinc-50">大纲预览</div>
                    <div className="mt-2 space-y-2 text-sm text-zinc-400">
                      {outline.slides.slice(0, 3).map((slide: any) => (
                        <div key={slide.index} className="rounded-xl bg-white px-3 py-2">
                          <div className="font-medium text-zinc-50">{slide.index}. {slide.title}</div>
                          <div className="mt-1">{Array.isArray(slide.bullets) ? slide.bullets.join(' / ') : ''}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/ppt" className="rounded-full border border-zinc-800 bg-zinc-800/30 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800">继续编辑</Link>
                  <button className="rounded-full border border-zinc-800 bg-zinc-800/30 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800">复制项目</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </WorkspaceShell>
  );
}

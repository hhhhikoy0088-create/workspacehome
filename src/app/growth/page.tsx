'use client';

import { useEffect, useMemo, useState } from 'react';
import { WorkspaceShell } from '@/components/workspace-shell';
import request from '@/api/request';
import { useAuthStore } from '@/components/auth-provider';

const chartBars = [18, 30, 42, 24, 50, 62, 48];

function unwrapApiData<T>(value: T | { success?: boolean; data?: T } | null | undefined): T | null {
  if (!value) return null;
  if (typeof value === 'object' && 'data' in value && value.data) return value.data;
  return value as T;
}

export default function GrowthPage() {
  const { user, isLogin } = useAuthStore();
  const [stats, setStats] = useState({
    learning: { studyHours: 0, todayTasks: 0, completionRate: 0, streak: 0, pendingTasks: 0 },
    knowledge: { baseCount: 0, documentCount: 0, chunkCount: 0 },
    resume: { optimizeCount: 0, avgAtsScore: 0 },
    analytics: { analysisCount: 0, lastAnalysisTime: '' }
  });
  const [profile, setProfile] = useState<any>(null);
  const [insights, setInsights] = useState<string[]>(['正在生成成长洞察...']);

  const cards = useMemo(() => ([
    { value: `${Math.max(0, Math.round(stats.learning.studyHours))}h`, label: '累计学习时长', color: 'text-indigo-600', bar: 'bg-indigo-400/70' },
    { value: String(stats.learning.pendingTasks), label: '待处理任务', color: 'text-slate-700', bar: 'bg-slate-400/70' },
    { value: String(stats.learning.todayTasks), label: '今日任务', color: 'text-slate-700', bar: 'bg-slate-400/70' },
    { value: `${stats.learning.completionRate}%`, label: '学习完成率', color: 'text-emerald-600', bar: 'bg-emerald-400/70' },
    { value: String(stats.learning.streak), label: '连续学习天数', color: 'text-violet-600', bar: 'bg-violet-400/70' },
    { value: String(stats.knowledge.documentCount), label: '知识库文档', color: 'text-blue-600', bar: 'bg-blue-400/70' }
  ]), [stats]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isLogin || !user?.id) return;
      const uid = user.id;
      const [statsResult, profileResult] = await Promise.allSettled([
        request.get(`/dashboard?userId=${uid}`),
        request.get(`/profile/${uid}/context`)
      ]);

      if (cancelled) return;

      const statsData = unwrapApiData(statsResult.status === 'fulfilled' ? statsResult.value : null);
      const profileData = unwrapApiData(profileResult.status === 'fulfilled' ? profileResult.value : null);

      if (!statsData || !profileData) {
        throw new Error('Growth page data is missing');
      }

      setStats(statsData);
      setProfile(profileData.user);
      const goalName = profileData.user?.goal || '考研';
      setInsights([
        `你的当前目标是 ${goalName}，建议保持每天固定复盘。`,
        `当前累计学习时长约 ${Math.max(0, Math.round((statsData.learning.studyHours || 0)))} 小时，继续保持。`,
        `当前待处理任务 ${statsData.learning.pendingTasks || 0} 项，今日任务 ${statsData.learning.todayTasks || 0} 项。`,
        `学习完成率约 ${statsData.learning.completionRate || 0}% ，可以通过做题和错题回顾继续提升。`,
        `知识库当前有 ${statsData.knowledge.baseCount || 0} 个知识库、${statsData.knowledge.documentCount || 0} 个文档。`
      ]);
    };
    load().catch(() => {
      setInsights(['暂无可用数据，请先使用学习、任务、知识库与文件功能。']);
    });
    window.addEventListener('workspace-data-updated', load);
    return () => {
      cancelled = true;
      window.removeEventListener('workspace-data-updated', load);
    };
  }, [isLogin, user?.id]);

  return (
    <WorkspaceShell active="/growth">
      <div className="panel">
        <div className="border-b border-slate-200/70 pb-4">
          <p className="gradient-text text-lg font-bold">成长仪表盘</p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((item) => (
            <div key={item.label} className="card-hover rounded-2xl border border-slate-200/70 bg-white/80 p-5">
              <div className={`text-4xl font-bold ${item.color}`}>{item.value}</div>
              <div className="mt-2 text-sm text-slate-400">{item.label}</div>
              <div className="mt-8 flex h-12 items-end gap-1">
                {chartBars.map((h, i) => <div key={i} className={`w-full rounded-t-md ${item.bar}`} style={{ height: `${h}%` }} />)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-6">
          <div className="section-title">成长洞察</div>
          <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white/80 p-5 text-slate-500">
            <p className="leading-8">你的成长数据会根据学习、任务、文件与知识库实时变化：</p>
            <ul className="mt-4 space-y-3 text-sm leading-7">
              {insights.map((item, index) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  <span className={index === 0 ? 'text-slate-700' : 'text-slate-500'}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}

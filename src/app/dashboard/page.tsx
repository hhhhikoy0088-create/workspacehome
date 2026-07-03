'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { WorkspaceShell } from '@/components/workspace-shell';
import request from '@/api/request';
import { useAuthStore } from '@/components/auth-provider';
import type { DashboardSummary } from '@/types/core';

const quickActions = [
  { label: '生成PPT', href: '/ppt' },
  { label: '优化简历', href: '/resume' },
  { label: '知识库', href: '/knowledge' },
  { label: '会议纪要', href: '/meeting' },
  { label: '数据分析', href: '/analytics' },
  { label: '学习中心', href: '/learning-coach' }
];

const modules = [
  { title: '长期记忆', href: '/memory', desc: '记录用户画像、行为偏好、学习目标与关键任务，让小龙虾越用越懂你。' },
  { title: 'AI 知识库', href: '/knowledge', desc: '支持 PDF、Word、PPT、网页等资料上传，完成问答、总结和重点提炼。' },
  { title: '学习教练', href: '/learning-coach', desc: '自动生成学习地图、掌握度分析、错题复盘和个性化学习计划。' },
  { title: '办公效率中心', href: '/office-hub', desc: '覆盖简历优化、PPT 生成、会议纪要、数据分析等高频场景。' }
];

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const }
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLogin } = useAuthStore();
  const [message, setMessage] = useState('');
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('你好');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isLogin || !user?.id) {
        setData(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const result = await request.get(`/dashboard?userId=${user.id}`);

      if (cancelled) return;

      const dashboardData = result && typeof result === 'object' && 'data' in result ? result.data : result;
      setData(dashboardData as DashboardSummary);
      setLoading(false);
    };

    load().catch(() => {
      setData(null);
      setLoading(false);
    });
    const refresh = () => { load().catch(() => {}); };
    window.addEventListener('workspace-data-updated', refresh);
    window.addEventListener('workspace-profile-updated', refresh);
    window.addEventListener('workspace-goal-updated', refresh);
    window.addEventListener('auth:changed', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('workspace-data-updated', refresh);
      window.removeEventListener('workspace-profile-updated', refresh);
      window.removeEventListener('workspace-goal-updated', refresh);
      window.removeEventListener('auth:changed', refresh);
    };
  }, [isLogin, user?.id]);

  useEffect(() => {
    const hours = new Date().getHours();
    if (hours < 12) setGreeting('早上好');
    else if (hours < 18) setGreeting('下午好');
    else setGreeting('晚上好');
  }, []);

  useEffect(() => {
    if (!isLogin || !user?.id) return;
    window.dispatchEvent(new Event('workspace-profile-updated'));
    window.dispatchEvent(new Event('workspace-data-updated'));
  }, [isLogin, user?.id]);

  const handleSend = () => {
    const q = encodeURIComponent(message.trim() || '帮我规划今天的学习 / 整理资料 / 生成汇报');
    router.push(`/chat?q=${q}`);
  };

  if (loading) {
    return (
      <WorkspaceShell active="/dashboard">
        <section className="panel">
          <p className="text-sm text-slate-400">Dashboard 数据加载中...</p>
        </section>
      </WorkspaceShell>
    );
  }

  if (!isLogin || !user?.id) {
    return (
      <WorkspaceShell active="/dashboard">
        <section className="panel">
          <p className="text-sm text-slate-500">请先登录后查看 Dashboard。</p>
          <Link href="/auth/login" className="btn-primary mt-4 inline-flex">登录 / 注册</Link>
        </section>
      </WorkspaceShell>
    );
  }

  const dashboardData = (data && typeof data === 'object' && 'data' in data ? (data as any).data : data) as DashboardSummary | null;

  const invalidReasons = [];
  if (!dashboardData) invalidReasons.push('dashboard state is null');
  if (!dashboardData?.profile) invalidReasons.push('profile is missing');
  if (!dashboardData?.learning) invalidReasons.push('learning is missing');
  if (!dashboardData?.knowledge) invalidReasons.push('knowledge is missing');
  if (!dashboardData?.resume) invalidReasons.push('resume is missing');
  if (!dashboardData?.analytics) invalidReasons.push('analytics is missing');
  if (dashboardData?.learning && typeof dashboardData.learning.studyHours !== 'number') invalidReasons.push('learning.studyHours is not number');
  if (dashboardData?.learning && typeof dashboardData.learning.todayTasks !== 'number') invalidReasons.push('learning.todayTasks is not number');
  if (dashboardData?.learning && typeof dashboardData.learning.completionRate !== 'number') invalidReasons.push('learning.completionRate is not number');
  if (dashboardData?.knowledge && typeof dashboardData.knowledge.documentCount !== 'number') invalidReasons.push('knowledge.documentCount is not number');
  if (dashboardData?.knowledge && typeof dashboardData.knowledge.chunkCount !== 'number') invalidReasons.push('knowledge.chunkCount is not number');
  if (dashboardData?.resume && typeof dashboardData.resume.optimizeCount !== 'number') invalidReasons.push('resume.optimizeCount is not number');
  if (dashboardData?.analytics && typeof dashboardData.analytics.analysisCount !== 'number') invalidReasons.push('analytics.analysisCount is not number');

  if (invalidReasons.length > 0) {
    return (
      <WorkspaceShell active="/dashboard">
        <section className="panel space-y-3">
          <p className="text-sm text-red-500">Dashboard 数据结构异常，请检查 /api/dashboard 返回。</p>
          <pre className="overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
{JSON.stringify({ reasons: invalidReasons, result: data, profile: data?.profile, learning: data?.learning, knowledge: data?.knowledge, resume: data?.resume, analytics: data?.analytics }, null, 2)}
          </pre>
        </section>
      </WorkspaceShell>
    );
  }

  const dashboard = dashboardData as DashboardSummary;
  const learningStudyHours = dashboard.learning.studyHours;
  const taskCount = dashboard.learning.pendingTasks;
  const todayTasks = dashboard.learning.todayTasks;
  const completionRate = dashboard.learning.completionRate;
  const streakDays = dashboard.learning.streak;
  const profile = dashboard.profile;
  const knowledge = dashboard.knowledge;

  return (
    <WorkspaceShell active="/dashboard">
      <motion.header className="panel" {...fadeUp}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-sm text-slate-400">{greeting}</p>
            <h1 className="gradient-text mt-2 text-3xl font-bold tracking-tight md:text-4xl">Workspace Dashboard</h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="panel-muted min-w-[140px]">
              <div className="stat-value text-indigo-600">{`${learningStudyHours.toFixed(1)}h`}</div>
              <div className="stat-label">本周学习时长</div>
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {[
                [String(taskCount), '任务待处理'],
                [String(todayTasks), '今日任务'],
                [`${completionRate}%`, '完成率'],
                [`${streakDays} 天`, '连续学习']
              ].map(([value, label], index) => (
                <div key={`${label}-${index}`} className="panel-muted px-3 py-3 text-center">
                  <div className="font-mono text-lg font-semibold text-slate-800">{value}</div>
                  <div className="stat-label">{label}</div>
                </div>
              ))}
            </div>
            <Link href="/auth/login" className="btn-primary shrink-0">
              登录 / 注册
            </Link>
          </div>
        </div>
      </motion.header>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <motion.div className="panel flex flex-col" {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.06 }}>
          <div>
            <h2 className="section-title">今天想做什么？</h2>
            <p className="mt-1 text-sm text-slate-400">发送内容和小w对话，或者点击快捷指令</p>
          </div>

          {profile.goal && profile.goalTargetDate ? (
            <div className="mt-3 rounded-xl border border-indigo-200/60 bg-indigo-50/60 px-4 py-2.5 text-sm text-slate-600">
              距离 <span className="font-medium text-indigo-600">{profile.goal}</span> 还有{' '}
              <span className="font-medium text-indigo-600">{profile.goalTargetDate}</span>
            </div>
          ) : null}

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="例如：帮我根据今天的课表安排学习计划，顺便把导数薄弱点整理出来"
            className="input-field mt-3 min-h-[160px] flex-1 resize-none"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {['生成学习计划', '总结这份资料', '检查待办', '提醒我明天'].map((item, index) => (
              <button key={`${item}-${index}`} type="button" className="btn-ghost">
                {item}
              </button>
            ))}
            <button type="button" onClick={handleSend} className="btn-primary ml-auto">
              发送并开始聊天
            </button>
          </div>
        </motion.div>

        <motion.div className="panel flex flex-col" {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
          <h2 className="section-title">今日提醒</h2>
          <ul className="mt-3 grid grid-cols-1 gap-2">
            {[
              ['任务', `${dashboard.learning.pendingTasks} 个任务进行中`],
              ['待办', `${dashboard.learning.todayTasks} 项今日任务`],
              ['复习', profile.currentPhase],
              ['知识库', `${knowledge.baseCount} 个知识库`],
              ['联动', 'RAG 提问会自动生成学习任务']
            ].map(([label, text], index) => (
              <li key={`${label}-${index}`} className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-2">
                <span className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-indigo-500">{label}</span>
                <span className="text-sm text-slate-500">{text}</span>
              </li>
            ))}
          </ul>

          <Link href="/memory" className="mt-3 block flex-1 rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4 transition hover:border-indigo-200/80 hover:bg-indigo-50/40">
            <h3 className="text-sm font-semibold text-slate-700">用户画像与学习目标</h3>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
              {[
                ['姓名', profile.name],
                ['身份', profile.identity],
                ['专业', profile.profession],
                ['目标', profile.goal],
                ['截止日期', profile.goalTargetDate],
                ['阶段', profile.currentPhase]
              ].map(([label, value], index) => (
                <div key={`${label}-${index}`} className="flex flex-col gap-0.5 text-sm">
                  <span className="text-xs text-slate-400">{label}</span>
                  <span className="truncate text-slate-600">{value}</span>
                </div>
              ))}
            </div>
          </Link>
        </motion.div>
      </section>

      <motion.section className="panel" {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.14 }}>
        <h2 className="section-title">快捷入口</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {quickActions.map((item, index) => (
            <Link key={`${item.label}-${index}`} href={item.href} className="btn-ghost card-hover justify-center py-3 text-center">
              {item.label}
            </Link>
          ))}
        </div>
      </motion.section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {modules.map((module, i) => (
          <motion.div key={`${module.title}-${i}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 + i * 0.04, duration: 0.4 }}>
            <Link href={module.href} className="panel card-hover block h-full">
              <h3 className="font-semibold text-slate-800">{module.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{module.desc}</p>
            </Link>
          </motion.div>
        ))}
      </section>
    </WorkspaceShell>
  );
}

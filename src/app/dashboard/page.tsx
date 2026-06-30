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
    console.log('[dashboard] auth state =', { user, isLogin });
    if (typeof window !== 'undefined') {
      console.log('[dashboard] localStorage =', {
        authUser: window.localStorage.getItem('authUser'),
        userId: window.localStorage.getItem('userId'),
        token: window.localStorage.getItem('token')
      });
    }
  }, [user, isLogin]);

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
      console.log('Dashboard API Result:', result);
      console.log('Profile:', dashboardData?.profile);
      console.log('Learning:', dashboardData?.learning);
      console.log('Knowledge:', dashboardData?.knowledge);
      console.log('Resume:', dashboardData?.resume);
      console.log('Analytics:', dashboardData?.analytics);
      console.log('[dashboard] original API JSON returned by request =', result);
      setData(dashboardData as DashboardSummary);
      console.log('Dashboard State:', dashboardData);
      console.log('[dashboard] state payload =', dashboardData);
      setLoading(false);
    };

    load().catch((error) => {
      console.error('[dashboard] load failed =', error);
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
          <p className="text-sm text-zinc-400">Dashboard 数据加载中...</p>
        </section>
      </WorkspaceShell>
    );
  }

  if (!isLogin || !user?.id) {
    return (
      <WorkspaceShell active="/dashboard">
        <section className="panel">
          <p className="text-sm text-zinc-400">请先登录后查看 Dashboard。</p>
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
    console.log('Error Trigger Reason:', {
      reasons: invalidReasons,
      result: dashboardData,
      profile: dashboardData?.profile,
      learning: dashboardData?.learning,
      knowledge: dashboardData?.knowledge,
      resume: dashboardData?.resume,
      analytics: dashboardData?.analytics
    });
    return (
      <WorkspaceShell active="/dashboard">
        <section className="panel space-y-3">
          <p className="text-sm text-red-300">Dashboard 数据结构异常，请检查 /api/dashboard 返回。</p>
          <pre className="overflow-auto rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 text-xs text-zinc-300">
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
  console.log('[dashboard] React props =', { profile, learning: dashboard.learning, knowledge, resume: dashboard.resume, analytics: dashboard.analytics });

  return (
    <WorkspaceShell active="/dashboard">
      <motion.header className="panel" {...fadeUp}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-sm text-zinc-400">{greeting}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">Workspace Dashboard</h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="panel-muted min-w-[140px]">
              <div className="stat-value">{`${learningStudyHours.toFixed(1)}h`}</div>
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
                  <div className="font-mono text-lg font-semibold text-zinc-100">{value}</div>
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

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <motion.div className="panel" {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.06 }}>
          <h2 className="text-xl font-semibold text-zinc-50">今天想做什么？</h2>
          <p className="mt-1 text-sm text-zinc-500">直接跟小龙虾对话，或选择快捷指令</p>

          {profile.goal && profile.goalTargetDate ? (
            <div className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-zinc-300">
              距离 <span className="font-medium text-blue-400">{profile.goal}</span> 还有{' '}
              <span className="font-medium text-blue-400">{profile.goalTargetDate}</span>
            </div>
          ) : null}

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="例如：帮我根据今天的课表安排学习计划，顺便把导数薄弱点整理出来"
            className="input-field mt-4 min-h-[110px] resize-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
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
          <h2 className="text-lg font-semibold text-zinc-50">今日提醒</h2>
          <ul className="mt-4 flex-1 space-y-2">
            {[
              ['任务', `${dashboard.learning.pendingTasks} 个任务进行中`],
              ['待办', `${dashboard.learning.todayTasks} 项今日任务`],
              ['复习', profile.currentPhase],
              ['知识库', `${knowledge.baseCount} 个知识库`],
              ['联动', 'RAG 提问会自动生成学习任务']
            ].map(([label, text], index) => (
              <li key={`${label}-${index}`} className="flex items-start gap-3 rounded-lg border border-zinc-800/80 bg-zinc-800/30 px-3 py-2.5">
                <span className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-blue-400">{label}</span>
                <span className="text-sm text-zinc-400">{text}</span>
              </li>
            ))}
          </ul>

          <Link href="/memory" className="mt-4 block border-t border-zinc-800 pt-4 transition hover:opacity-90">
            <h3 className="text-sm font-semibold text-zinc-200">用户画像与学习目标</h3>
            <div className="mt-3 space-y-2">
              {[
                ['姓名', profile.name],
                ['身份', profile.identity],
                ['专业', profile.profession],
                ['目标', profile.goal],
                ['截止日期', profile.goalTargetDate],
                ['阶段', profile.currentPhase]
              ].map(([label, value], index) => (
                <div key={`${label}-${index}`} className="flex justify-between gap-4 text-sm">
                  <span className="text-zinc-500">{label}</span>
                  <span className="text-right text-zinc-300">{value}</span>
                </div>
              ))}
            </div>
          </Link>
        </motion.div>
      </section>

      <motion.section className="panel" {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.14 }}>
        <h2 className="text-lg font-semibold text-zinc-50">快捷入口</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {quickActions.map((item, index) => (
            <Link key={`${item.label}-${index}`} href={item.href} className="btn-ghost justify-center py-3 text-center">
              {item.label}
            </Link>
          ))}
        </div>
      </motion.section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {modules.map((module, i) => (
          <motion.div key={`${module.title}-${i}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 + i * 0.04, duration: 0.4 }}>
            <Link href={module.href} className="panel block h-full transition hover:border-zinc-700 hover:bg-zinc-900">
              <h3 className="font-semibold text-zinc-100">{module.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{module.desc}</p>
            </Link>
          </motion.div>
        ))}
      </section>
    </WorkspaceShell>
  );
}

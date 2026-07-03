'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { WorkspaceShell } from '@/components/workspace-shell';
import request from '@/api/request';
import { useAuthStore } from '@/components/auth-provider';
import type { DashboardSummary } from '@/types/dashboard';
import Link from 'next/link';

type ProfileUser = {
  userId: string;
  id?: string;
  name: string;
  nickname?: string;
  identity?: string | null;
  profession?: string | null;
  goal?: string | null;
  goalTargetDate?: string | null;
  goal_target_date?: string | null;
  avatar?: string | null;
};

type ProfileEditableSource = {
  name?: string;
  nickname?: string;
  identity?: string | null;
  profession?: string | null;
  goal?: string | null;
  goalTargetDate?: string | null;
  goal_target_date?: string | null;
};

type ProfileContext = {
  user: ProfileUser;
  aiIdentity?: { name?: string; role?: string; level?: string; domain?: string; status?: string };
  stateEngine?: { state?: 'uninitialized' | 'initializing' | 'active' | 'growth'; studyMode?: string; focus?: string; intensity?: string };
  goalEngine?: { primaryGoal?: string; deadline?: string; progress?: number; phase?: string; daysLeft?: number };
  memory?: { learningMemory?: { recentTopics?: string[]; recentDocs?: string[] }; actionMemory?: { recentActions?: string[] }; cognitiveProfile?: { learningStyle?: string; preference?: string[]; pace?: string } };
  workspaceSync?: { knowledge?: { baseCount?: number; documentCount?: number; chunkCount?: number }; learning?: { planCount?: number; taskCount?: number }; resume?: { optimizationCount?: number }; analytics?: { analysisCount?: number }; ppt?: { generationCount?: number }; meeting?: { noteCount?: number } };
  goalContext?: { advice?: string; subjects?: string[]; metrics?: { days?: number; mastery?: string; studyTime?: string } };
};

type KnowledgeSummary = {
  bases?: Array<{ id: string; name: string; documentCount?: number; chunkCount?: number }>;
  documents?: Array<{ id: string; displayName?: string; originalName?: string; createdAt?: string; fileType?: string }>;
  stats?: { baseCount: number; documentCount: number; chunkCount: number };
};

type LearningCoachContext = {
  plan?: { id?: string; title?: string; status?: string; knowledgePoints?: unknown[]; exercises?: string[] } | null;
  tasks?: Array<{ id: string; title: string; status: string; fileName?: string; knowledgePointTitle?: string }>;
  progress?: { learningProgress?: number; todayTasks?: number; completionRate?: number; streakDays?: number };
};

type PptProject = { id: string; title: string; updated_at?: string; created_at?: string };
type MeetingNote = { id: string; title: string; summary?: string; updated_at?: string; created_at?: string };

type EditableProfile = {
  name: string;
  nickname: string;
  identity: string;
  profession: string;
  goal: string;
  goal_target_date: string;
};

type LoadState = 'loading' | 'guest' | 'authenticated';
type ModalState = { open: boolean; title: string };

const fadeIn = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } }
};

function emptyEditableProfile(user?: ProfileEditableSource): EditableProfile {
  return {
    name: user?.name || '',
    nickname: user?.nickname || user?.name || '',
    identity: user?.identity || '',
    profession: user?.profession || '',
    goal: user?.goal || '',
    goal_target_date: user?.goalTargetDate || user?.goal_target_date || ''
  };
}

function formatDate(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function levelFromStats(streakDays: number) {
  return Math.max(1, Math.min(10, Math.floor(streakDays / 3) + 1));
}

function progressBar(rate: number) {
  const safe = Math.max(0, Math.min(100, rate || 0));
  return `${safe}%`;
}

const emptyDashboard: DashboardSummary = {
  userId: '',
  profile: { userId: '', name: '', identity: '', profession: '', goal: '', goalDate: '', goalTargetDate: '', currentPhase: '', createdAt: '', updatedAt: '' },
  learning: { studyHours: 0, todayTasks: 0, completionRate: 0, streak: 0, pendingTasks: 0 },
  knowledge: { baseCount: 0, documentCount: 0, chunkCount: 0 },
  resume: { optimizeCount: 0, avgAtsScore: 0 },
  analytics: { analysisCount: 0, lastAnalysisTime: '' }
};

function CircularProgress({ value, label, sub }: { value: number; label: string; sub?: string }) {
  const safe = Math.max(0, Math.min(100, value || 0));
  const circumference = 2 * Math.PI * 38;
  const offset = circumference - (safe / 100) * circumference;
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r="38" stroke="rgba(255,255,255,0.12)" strokeWidth="8" fill="none" />
          <circle
            cx="44"
            cy="44"
            r="38"
            stroke="url(#purpleGradient)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
          <defs>
            <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#d8b4fe" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{safe}</span>
          <span className="text-[10px] text-purple-200">Total</span>
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-slate-800">{label}</p>
      {sub ? <p className="text-xs text-slate-400">{sub}</p> : null}
    </div>
  );
}

function LineChart({ data }: { data: number[] }) {
  const max = Math.max(10, ...data);
  const width = 280;
  const height = 100;
  const padding = 8;
  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - (v / max) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(139,92,246,0.25)" />
          <stop offset="100%" stopColor="rgba(139,92,246,0)" />
        </linearGradient>
      </defs>
      <polygon
        points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
        fill="url(#lineFill)"
      />
      <polyline
        points={points}
        fill="none"
        stroke="#8b5cf6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((v, i) => {
        const x = padding + (i / (data.length - 1)) * (width - padding * 2);
        const y = height - padding - (v / max) * (height - padding * 2);
        return <circle key={i} cx={x} cy={y} r="3" fill="#fff" stroke="#8b5cf6" strokeWidth="2" />;
      })}
    </svg>
  );
}

export default function ProfilePage() {
  const { user, isLogin } = useAuthStore();
  const [profile, setProfile] = useState<ProfileContext | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary>(emptyDashboard);
  const [knowledge, setKnowledge] = useState<KnowledgeSummary | null>(null);
  const [learningCoach, setLearningCoach] = useState<LearningCoachContext | null>(null);
  const [pptProjects, setPptProjects] = useState<PptProject[]>([]);
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([]);
  const [draft, setDraft] = useState<EditableProfile>(emptyEditableProfile());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [errors, setErrors] = useState<Array<{ id: string; message: string }>>([]);
  const [modal, setModal] = useState<ModalState>({ open: false, title: '编辑资料' });

  const currentUserId = user?.id || '';
  const isAuthenticated = Boolean(currentUserId);
  const pageState: LoadState = loading ? 'loading' : isAuthenticated ? 'authenticated' : 'guest';
  const avatar = isAuthenticated ? user?.avatar || '' : '';
  const displayName = isAuthenticated ? user?.nickname?.trim() || user?.name?.trim() || '' : '';
  const streakDays = isAuthenticated ? dashboard?.learning?.streak ?? 0 : 0;
  const level = levelFromStats(streakDays);
  const completionRate = isAuthenticated ? dashboard?.learning?.completionRate ?? 0 : 0;
  const currentPhase = isAuthenticated ? dashboard?.profile?.currentPhase || '' : '';
  const dashboardUser = useMemo(() => {
    if (!dashboard?.profile) return null;
    return {
      id: dashboard.profile.userId || currentUserId,
      name: dashboard.profile.name || '',
      nickname: dashboard.profile.nickname || dashboard.profile.name || '',
      avatar: dashboard.profile.avatar || '',
      identity: dashboard.profile.identity || '',
      profession: dashboard.profile.profession || '',
      goal: dashboard.profile.goal || '',
      goalTargetDate: dashboard.profile.goalTargetDate || dashboard.profile.goalDate || ''
    };
  }, [dashboard?.profile, currentUserId]);
  const displayUser = profile?.user || dashboardUser || user || null;

  const aiPersona = useMemo(() => {
    if (!isAuthenticated) return '';
    const goal = dashboard?.profile?.goal || displayUser?.goal || '';
    const identity = dashboard?.profile?.identity || user?.identity || '';
    const profession = dashboard?.profile?.profession || user?.profession || '';
    const knowledgeTag = (dashboard?.knowledge?.baseCount || 0) > 0 ? '知识库和学习教练' : '工作台';
    return `你目前主要专注 ${goal}，身份是 ${identity}，场景聚焦于 ${profession}。最近常使用 ${knowledgeTag} 进行学习与整理，整体成长状态稳定。`;
  }, [dashboard?.knowledge?.baseCount, dashboard?.profile?.goal, dashboard?.profile?.identity, dashboard?.profile?.profession, displayUser?.goal, displayUser?.identity, displayUser?.profession, isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    setErrors([]);
    const [profileRes, dashboardRes, knowledgeRes, learningRes] = await Promise.allSettled([
      request.get('/profile'),
      request.get('/dashboard?userId=' + currentUserId),
      request.get('/knowledge?userId=' + encodeURIComponent(currentUserId)),
      request.get('/learning-coach/context?userId=' + encodeURIComponent(currentUserId))
    ]);

    const nextProfile = profileRes.status === 'fulfilled' && profileRes.value ? profileRes.value : null;
    const nextDashboard = dashboardRes.status === 'fulfilled' && dashboardRes.value ? dashboardRes.value : emptyDashboard;
    const authenticated = Boolean(currentUserId && nextProfile?.user?.id);

    setProfile(authenticated ? nextProfile : null);
    setDashboard(authenticated ? nextDashboard : emptyDashboard);
    setKnowledge(knowledgeRes.status === 'fulfilled' && knowledgeRes.value ? knowledgeRes.value : null);
    setLearningCoach(learningRes.status === 'fulfilled' && learningRes.value ? learningRes.value : null);
    setPptProjects([]);
    setMeetingNotes([]);
    setDraft(emptyEditableProfile(authenticated ? { name: nextProfile?.user?.name || user?.name, nickname: nextProfile?.user?.nickname || user?.nickname, identity: nextProfile?.user?.identity || user?.identity, profession: nextProfile?.user?.profession || user?.profession, goal: nextProfile?.user?.goal || user?.goal, goalTargetDate: nextProfile?.user?.goalTargetDate || user?.goalTargetDate } : undefined));

    const nextErrors: Array<{ id: string; message: string }> = [];
    if (authenticated && profileRes.status !== 'fulfilled') nextErrors.push({ id: 'profile', message: 'Profile 数据加载失败' });
    if (authenticated && dashboardRes.status !== 'fulfilled') nextErrors.push({ id: 'dashboard', message: 'Dashboard 聚合数据加载失败' });
    setErrors(nextErrors);
    setLoading(false);
  };

  useEffect(() => {
    loadData().catch(() => {});
    const refresh = () => loadData().catch(() => {});
    window.addEventListener('PROFILE_UPDATED', refresh);
    window.addEventListener('USER_UPDATED', refresh);
    window.addEventListener('workspace-profile-updated', refresh);
    window.addEventListener('workspace-goal-updated', refresh);
    window.addEventListener('auth:changed', refresh);
    return () => {
      window.removeEventListener('PROFILE_UPDATED', refresh);
      window.removeEventListener('USER_UPDATED', refresh);
      window.removeEventListener('workspace-profile-updated', refresh);
      window.removeEventListener('workspace-goal-updated', refresh);
      window.removeEventListener('auth:changed', refresh);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const openEditModal = () => {
    if (!isAuthenticated) return;
    setDraft(emptyEditableProfile(displayUser ? { name: displayUser.name, nickname: displayUser.nickname, identity: displayUser.identity, profession: displayUser.profession, goal: displayUser.goal, goalTargetDate: displayUser.goalTargetDate } : undefined));
    setModal({ open: true, title: '编辑资料' });
  };

  const closeEditModal = () => {
    if (saving) return;
    setModal((prev) => ({ ...prev, open: false }));
    setDraft(emptyEditableProfile(displayUser ? { name: displayUser.name, nickname: displayUser.nickname, identity: displayUser.identity, profession: displayUser.profession, goal: displayUser.goal, goalTargetDate: displayUser.goalTargetDate } : undefined));
  };

  const handleSave = async () => {
    if (!isAuthenticated || !user?.id) {
      setToast({ type: 'error', message: '请先登录后再保存' });
      return;
    }

    const trimmedName = draft.name.trim();
    if (!trimmedName) {
      setToast({ type: 'error', message: '姓名不能为空' });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: trimmedName,
        nickname: draft.nickname.trim() || trimmedName,
        identity: draft.identity.trim(),
        profession: draft.profession.trim(),
        goal: draft.goal.trim(),
        goal_target_date: draft.goal_target_date || null
      };
      const result = await request.patch('/profile', payload);
      setProfile(result);
      setDraft(emptyEditableProfile(result.user || displayUser || undefined));
      setModal({ open: false, title: '编辑资料' });
      setToast({ type: 'success', message: '保存成功' });
      window.dispatchEvent(new Event('PROFILE_UPDATED'));
      window.dispatchEvent(new Event('USER_UPDATED'));
      window.dispatchEvent(new Event('auth:changed'));
      window.dispatchEvent(new Event('workspace-profile-updated'));
      window.dispatchEvent(new Event('workspace-goal-updated'));
      window.dispatchEvent(new Event('workspace-data-updated'));
    } catch {
      setToast({ type: 'error', message: '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  const progressPills = [
    { label: '学习完成率', value: completionRate, display: `${completionRate}%`, color: 'from-violet-500 to-purple-500' },
    { label: '连续学习', value: Math.min(100, (streakDays / 30) * 100), display: `${streakDays}天`, color: 'from-purple-500 to-fuchsia-500' },
    { label: '知识库进度', value: Math.min(100, ((knowledge?.stats?.documentCount || 0) / 20) * 100), display: `${knowledge?.stats?.documentCount || 0}篇`, color: 'from-indigo-500 to-violet-500' },
    { label: '今日任务', value: Math.min(100, ((dashboard?.learning?.todayTasks || 0) / 5) * 100), display: `${dashboard?.learning?.todayTasks || 0}个`, color: 'from-fuchsia-500 to-pink-500' }
  ];

  const largeStats = [
    { value: knowledge?.stats?.baseCount ?? 0, label: '知识库' },
    { value: knowledge?.stats?.documentCount ?? 0, label: '文档' },
    { value: knowledge?.stats?.chunkCount ?? 0, label: '知识块' }
  ];

  const recentTasks = (learningCoach?.tasks || []).slice(0, 5);
  const recentDocs = (knowledge?.documents || []).slice(0, 4);
  const chartData = useMemo(() => {
    return [12, 28, 18, 35, 24, completionRate || 18, 42, 30];
  }, [completionRate]);

  const scheduleItems = recentTasks.length
    ? recentTasks.map((t, i) => ({
        time: `${9 + i * 2}:00`,
        title: t.title,
        sub: t.knowledgePointTitle || t.status,
        active: i === 0
      }))
    : [
        { time: '09:00', title: '每日同步', sub: '回顾昨日学习', active: true },
        { time: '11:00', title: '知识点整理', sub: '导数与极限', active: false },
        { time: '14:00', title: '练习题', sub: '完成 5 道题目', active: false },
        { time: '16:00', title: '复习会议', sub: '错题回顾', active: false },
        { time: '20:00', title: '总结笔记', sub: '写入知识库', active: false }
      ];

  return (
    <WorkspaceShell active="/profile">
      <div className="relative -m-4 min-h-[calc(100dvh-2rem)] overflow-hidden rounded-[2rem] bg-gradient-to-br from-purple-50/90 via-white to-violet-50/80 p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(139,92,246,0.08),transparent_40%)]" />

        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`relative z-10 rounded-xl border px-4 py-3 text-sm ${toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-600'}`}
          >
            {toast.message}
          </motion.div>
        ) : null}

        {loading ? (
          <div className="relative z-10 grid gap-5 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`profile-skeleton-${index}`} className="h-48 animate-pulse rounded-3xl border border-slate-200/70 bg-slate-100/60" />
            ))}
          </div>
        ) : null}

        <motion.div className="relative z-10 space-y-5" variants={staggerContainer} initial="hidden" animate="show">
          {/* Header */}
          <motion.div variants={staggerItem} className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-purple-400">AI Personal Center</p>
              <h1 className="mt-1 text-4xl font-light text-slate-800">
                Hello <span className="font-semibold text-slate-900">{displayName || '同学'}</span>
              </h1>
              <p className="mt-2 text-sm text-slate-400">欢迎回来，这是你的个人学习与工作数据概览</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-600 shadow-sm transition hover:border-purple-300 hover:text-purple-600">
                返回 Dashboard
              </Link>
              {isAuthenticated ? (
                <button type="button" onClick={openEditModal} className="rounded-full bg-gradient-to-r from-violet-500 to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(139,92,246,0.35)] transition hover:from-violet-600 hover:to-purple-600 active:scale-[0.98]">
                  编辑资料
                </button>
              ) : null}
            </div>
          </motion.div>

          {/* Progress pills + large stats */}
          <motion.div variants={staggerItem} className="grid gap-5 xl:grid-cols-[1.6fr_0.4fr]">
            <div className="profile-card">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {progressPills.map((pill, index) => (
                  <div key={index} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-purple-200 hover:bg-purple-50/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">{pill.label}</span>
                      <span className="text-lg font-bold text-slate-800">{pill.display}</span>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div className={`h-full rounded-full bg-gradient-to-r ${pill.color} shadow-[0_2px_8px_rgba(139,92,246,0.25)]`} style={{ width: `${pill.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="profile-card flex items-center justify-between gap-2">
              {largeStats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-semibold text-slate-800">{stat.value}</div>
                  <div className="mt-1 text-xs text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Main three columns */}
          <motion.div variants={staggerItem} className="grid gap-5 xl:grid-cols-[300px_1fr_340px]">
            {/* Schedule */}
            <div className="profile-card">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-800">Schedule</h3>
                <Link href="/learning-coach" className="text-xs text-purple-500 transition hover:text-purple-600">查看全部</Link>
              </div>
              <div className="relative space-y-4 pl-3">
                <div className="absolute bottom-0 left-[21px] top-2 w-px bg-slate-200" />
                {scheduleItems.map((item, index) => (
                  <div key={index} className="relative flex items-start gap-3">
                    <div className={`relative z-10 mt-1.5 h-3 w-3 rounded-full border-2 ${item.active ? 'border-purple-500 bg-purple-500' : 'border-slate-300 bg-white'}`} />
                    <div className={`flex-1 rounded-2xl border p-3 transition ${item.active ? 'border-purple-200 bg-purple-50/60' : 'border-slate-100 bg-slate-50/60'}`}>
                      <div className={`text-xs font-medium ${item.active ? 'text-purple-600' : 'text-slate-400'}`}>{item.time}</div>
                      <div className="mt-1 text-sm font-medium text-slate-700">{item.title}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{item.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Knowledge / Activity Table */}
            <div className="profile-card">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-800">Recent Knowledge</h3>
                <Link href="/knowledge" className="text-xs text-purple-500 transition hover:text-purple-600">查看全部</Link>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 text-xs text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">名称</th>
                      <th className="px-4 py-3 font-medium">类型</th>
                      <th className="px-4 py-3 font-medium">日期</th>
                      <th className="px-4 py-3 font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentDocs.length ? recentDocs.map((doc, index) => (
                      <tr key={doc.id || index} className="transition hover:bg-purple-50/40">
                        <td className="px-4 py-3 text-slate-700">{doc.displayName || doc.originalName || '-'}</td>
                        <td className="px-4 py-3 text-slate-500">{doc.fileType || '文档'}</td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(doc.createdAt)}</td>
                        <td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-600">已处理</span></td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">暂无知识库文档，快去上传第一份资料吧</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dark Goal Card */}
            <div className="profile-dark-card flex flex-col">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-base font-semibold">Learning Goal</h3>
                <Link href="/growth" className="rounded-full bg-white/10 p-1.5 transition hover:bg-white/20">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17L17 7M17 7H7M17 7V17" /></svg>
                </Link>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center py-4">
                <CircularProgress value={completionRate} label="目标完成度" sub={dashboard?.profile?.goal || '暂无目标'} />
              </div>
              <div className="space-y-3 rounded-2xl bg-white/5 p-4 text-sm">
                <div className="flex justify-between text-purple-100">
                  <span>当前目标</span>
                  <span className="font-medium">{dashboard?.profile?.goal || '-'}</span>
                </div>
                <div className="flex justify-between text-purple-100">
                  <span>截止日期</span>
                  <span className="font-medium">{formatDate(dashboard?.profile?.goalTargetDate || displayUser?.goalTargetDate || '')}</span>
                </div>
                <div className="flex justify-between text-purple-100">
                  <span>当前阶段</span>
                  <span className="font-medium">{currentPhase || '探索期'}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Bottom row */}
          <motion.div variants={staggerItem} className="grid gap-5 xl:grid-cols-[1fr_340px]">
            {/* Line chart */}
            <div className="profile-card">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-800">Learning Statistics</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" />学习进度</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300" />其他</span>
                </div>
              </div>
              <LineChart data={chartData} />
            </div>

            {/* Composition */}
            <div className="profile-card">
              <h3 className="mb-4 text-base font-semibold text-slate-800">Workspace Composition</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'PPT', value: pptProjects.length, color: 'bg-violet-500' },
                  { label: '会议', value: meetingNotes.length, color: 'bg-purple-500' },
                  { label: '简历优化', value: dashboard?.resume?.optimizeCount ?? 0, color: 'bg-indigo-500' },
                  { label: '数据分析', value: dashboard?.analytics?.analysisCount ?? 0, color: 'bg-fuchsia-500' }
                ].map((item, index) => (
                  <div key={index} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-center transition hover:border-purple-200 hover:bg-purple-50/40">
                    <div className="mx-auto mb-2 h-2 w-10 overflow-hidden rounded-full bg-slate-200">
                      <div className={`h-full ${item.color}`} style={{ width: `${Math.min(100, Math.max(8, (item.value || 0) * 10))}%` }} />
                    </div>
                    <div className="text-xl font-semibold text-slate-800">{item.value}</div>
                    <div className="text-xs text-slate-400">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* AI Memory row */}
          <motion.div variants={staggerItem} className="grid gap-5 lg:grid-cols-3">
            {[
              {
                title: '学习记忆',
                items: [
                  `最近学习：${recentTasks[0]?.title || '暂无'}`,
                  `知识点：${learningCoach?.tasks?.[0]?.knowledgePointTitle || '暂无'}`,
                  `最近文档：${recentDocs[0]?.displayName || recentDocs[0]?.originalName || '暂无'}`,
                  `复习内容：${learningCoach?.tasks?.[1]?.title || '暂无'}`
                ]
              },
              {
                title: '工作记忆',
                items: [
                  `PPT：${pptProjects[0]?.title || '暂无'}`,
                  `数据分析：${dashboard?.analytics?.analysisCount || 0} 次`,
                  `会议纪要：${meetingNotes[0]?.title || '暂无'}`,
                  `简历优化：${dashboard?.resume?.optimizeCount || 0} 次`
                ]
              },
              {
                title: 'AI 偏好',
                items: ['默认模型：DeepSeek', '默认语言：中文', '回答风格：简洁、结构化', '主题：浅色模式']
              }
            ].map((card, index) => (
              <div key={index} className="profile-card transition hover:border-purple-200 hover:shadow-[0_8px_40px_rgba(139,92,246,0.1)]">
                <h3 className="text-base font-semibold text-slate-800">{card.title}</h3>
                <div className="mt-4 space-y-2 text-sm text-slate-500">
                  {card.items.map((item, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">{item}</div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>

          {errors.length ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              <div className="font-medium">部分模块尚未成功加载</div>
              <ul className="mt-2 space-y-1 text-amber-600/80">
                {errors.map((item, index) => (
                  <li key={`${item.id}-${index}`}>· {item.message}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </motion.div>
      </div>

      {modal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">AI Personal Operating System</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-800">{modal.title}</h2>
              </div>
              <button type="button" onClick={closeEditModal} disabled={saving} className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-60">
                关闭
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                ['姓名', 'name'],
                ['昵称', 'nickname'],
                ['身份', 'identity'],
                ['专业', 'profession'],
                ['学习目标', 'goal'],
                ['目标日期', 'goal_target_date']
              ].map(([label, key], index) => (
                <label key={`${String(key)}-${index}`} className="block rounded-xl border border-slate-200/70 bg-slate-50/60 p-4 transition hover:border-purple-300 sm:col-span-1">
                  <span className="text-sm text-slate-500">{label}</span>
                  <input
                    value={draft[key as keyof EditableProfile] as string}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                    type={key === 'goal_target_date' ? 'date' : 'text'}
                    className="input-field mt-3"
                    placeholder={label}
                  />
                </label>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-200/70 pt-4">
              <button type="button" onClick={closeEditModal} disabled={saving} className="btn-ghost">
                取消
              </button>
              <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? '保存中...' : '保存修改'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </WorkspaceShell>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { WorkspaceShell } from '@/components/workspace-shell';
import request from '@/api/request';
import { useAuthStore } from '@/components/auth-provider';
import type { DashboardSummary } from '@/types/dashboard';

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

  const loadingSkeleton = (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={`profile-skeleton-${index}`} className="h-40 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50" />
      ))}
    </div>
  );

  const loadData = async () => {
    setLoading(true);
    setErrors([]);
    const [profileRes, dashboardRes] = await Promise.allSettled([
      request.get('/profile'),
      request.get('/dashboard?userId=' + currentUserId)
    ]);

    const nextProfile = profileRes.status === 'fulfilled' && profileRes.value ? profileRes.value : null;
    const nextDashboard = dashboardRes.status === 'fulfilled' && dashboardRes.value ? dashboardRes.value : emptyDashboard;
    const authenticated = Boolean(currentUserId && nextProfile?.user?.id);

    setProfile(authenticated ? nextProfile : null);
    setDashboard(authenticated ? nextDashboard : emptyDashboard);
    setKnowledge(null);
    setLearningCoach(null);
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
      setToast({ type: 'success', message: '✓ 保存成功' });
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

  const statItems = [
    { label: '知识库数量', value: knowledge?.stats?.baseCount ?? 0 },
    { label: '文档数量', value: knowledge?.stats?.documentCount ?? 0 },
    { label: 'Chunk 数量', value: knowledge?.stats?.chunkCount ?? 0 },
    { label: '学习计划数量', value: learningCoach?.plan ? 1 : 0 },
    { label: '今日学习任务', value: dashboard?.learning?.todayTasks ?? 0 },
    { label: 'PPT 生成次数', value: pptProjects.length },
    { label: '数据分析次数', value: dashboard?.analytics?.analysisCount ?? 0 },
    { label: '简历优化次数', value: dashboard?.resume?.optimizeCount ?? 0 },
    { label: '会议纪要次数', value: meetingNotes.length }
  ];

  const recentKnowledgeDocs = isAuthenticated ? (knowledge?.documents || []).slice(0, 4) : [];
  const recentLearningTasks = isAuthenticated ? (learningCoach?.tasks || []).slice(0, 4) : [];
  const recentPpt = isAuthenticated ? pptProjects.slice(0, 4) : [];
  const recentMeetings = isAuthenticated ? meetingNotes.slice(0, 4) : [];

  const emptyHint = '请先登录以查看个人信息';

  return (
    <WorkspaceShell active="/profile">
      <div className="space-y-4">
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`rounded-2xl border px-4 py-3 text-sm backdrop-blur-xl ${toast.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/20 bg-rose-500/10 text-rose-200'}`}
          >
            {toast.message}
          </motion.div>
        ) : null}

        {loading ? loadingSkeleton : null}

        <motion.section className="panel overflow-hidden" {...fadeIn}>
          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/40 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-2xl">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-3xl font-semibold text-blue-300 shadow-lg shadow-blue-500/10">
                    {avatar || ''}
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">AI Profile</p>
                    <h1 className="text-3xl font-semibold text-zinc-50">{displayName || ''}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      {isAuthenticated ? <span className="rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1">{displayUser?.identity || ''}</span> : null}
                      {isAuthenticated ? <span className="rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1">{displayUser?.profession || ''}</span> : null}
                      {isAuthenticated ? <span className="rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1">连续学习 {streakDays} 天</span> : null}
                      {isAuthenticated ? <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-blue-300">Lv.{level} Explorer</span> : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {isAuthenticated ? (
                    <button type="button" onClick={openEditModal} className="rounded-full border border-blue-500/20 bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
                      编辑资料
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1.05fr]">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">成长状态</p>
                  <div className="mt-3 text-4xl font-semibold text-zinc-50">Lv.{level}</div>
                  <p className="mt-2 text-sm leading-7 text-zinc-400">连续学习 {streakDays} 天，学习完成率 {completionRate}%。</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400" style={{ width: progressBar(completionRate) }} />
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">{completionRate}%</p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">AI 用户画像</p>
                  {isAuthenticated ? <p className="mt-3 text-sm leading-8 text-zinc-200">{aiPersona}</p> : null}
                  {isAuthenticated ? (
                    <div className="mt-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm leading-7 text-zinc-200">
                      {currentPhase || ''}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6 backdrop-blur-2xl">
              <p className="text-sm font-semibold text-zinc-50">Learning Goal</p>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm text-zinc-400">
                    <span>当前目标</span>
                    <span>{completionRate}%</span>
                  </div>
                  <div className="mt-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-zinc-200">
                    {isAuthenticated ? dashboard?.profile?.goal || displayUser?.goal || '' : ''}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                    <p className="text-xs text-zinc-500">截止日期</p>
                    <p className="mt-2 text-lg font-medium text-zinc-50">{isAuthenticated ? formatDate(dashboard?.profile?.goalTargetDate || displayUser?.goalTargetDate || '') : ''}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                    <p className="text-xs text-zinc-500">当前学习阶段</p>
                    <p className="mt-2 text-lg font-medium text-zinc-50">{isAuthenticated ? currentPhase || '' : ''}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                  <div className="flex items-center justify-between text-sm text-zinc-400">
                    <span>完成率</span>
                    <span>{completionRate}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400" style={{ width: progressBar(completionRate) }} />
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-300">
                  <p className="text-xs text-zinc-500">预计完成时间</p>
                  <p className="mt-2 text-lg font-medium text-zinc-50">{isAuthenticated ? formatDate(dashboard?.profile?.goalTargetDate || displayUser?.goalTargetDate || '') : ''}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section className="panel" {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.04 }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-50">Workspace Statistics</p>
              <p className="mt-1 text-xs text-zinc-500">所有统计来自真实接口聚合</p>
            </div>
            <div className="text-xs text-zinc-500">Dashboard / Knowledge / Learning / Resume / Analytics</div>
          </div>

          {loading ? (
            <div className="mt-5">
              <div className="grid gap-4 lg:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={`stats-skeleton-${index}`} className="h-24 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50" />
                ))}
              </div>
            </div>
          ) : errors.length && !profile ? (
            <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
              <div className="font-medium">资料加载失败</div>
              <p className="mt-2 text-amber-50/80">请稍后重试。</p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {statItems.map((item, index) => (
                <div key={`${item.label}-${index}`} className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition duration-300 hover:border-zinc-700 hover:bg-zinc-900/80 hover:shadow-lg hover:shadow-black/20">
                  <div className="text-sm text-zinc-500">{item.label}</div>
                  <div className="mt-3 text-3xl font-semibold text-zinc-50">{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        <motion.section className="panel" {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.08 }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-50">Personal Information</p>
              <p className="mt-1 text-xs text-zinc-500">默认只读，点击编辑后才可修改并真正写入数据库</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs ${pageState === 'authenticated' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : pageState === 'guest' ? 'border-zinc-700 bg-zinc-900/50 text-zinc-400' : 'border-blue-500/20 bg-blue-500/10 text-blue-200'}`}>
              {pageState === 'loading' ? '加载中' : pageState === 'guest' ? '未登录' : '已登录'}
            </span>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1.1fr]">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-2xl font-semibold text-blue-300">{avatar || ''}</div>
                <div className="min-w-0">
                  <p className="text-sm text-zinc-500">账户状态</p>
                  <p className="truncate text-xl font-semibold text-zinc-50">{displayName || ''}</p>
                  <p className="mt-1 text-sm text-zinc-400">{displayUser?.identity || ''}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-zinc-300">
                {[
                  ['姓名', displayUser?.name || ''],
                  ['昵称', displayUser?.nickname || displayUser?.name || ''],
                  ['身份', displayUser?.identity || ''],
                  ['专业', displayUser?.profession || ''],
                  ['学习目标', displayUser?.goal || ''],
                  ['目标日期', displayUser?.goalTargetDate || '']
                ].map(([label, value], index) => (
                  <div key={`${label}-${index}`} className="flex items-start justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
                    <span className="text-zinc-500">{label}</span>
                    <span className="max-w-[65%] text-right text-zinc-200">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-6 text-zinc-400">
                <p className="text-lg font-medium text-zinc-50">只读模式</p>
                <p className="mt-2 text-sm leading-7">点击“编辑资料”后会打开居中 Modal，支持校验、保存 loading、成功提示与全系统同步。</p>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section className="panel" {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.12 }}>
          <div>
            <p className="text-sm font-semibold text-zinc-50">AI Memory</p>
            <p className="mt-1 text-xs text-zinc-500">真正的 AI 长期记忆中心，连接学习、工作和偏好</p>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5 transition hover:border-zinc-700">
              <p className="text-sm font-medium text-zinc-50">学习记忆</p>
              <div className="mt-4 space-y-3 text-sm text-zinc-400">
                {[
                  `最近学习课程：${recentLearningTasks[0]?.title || ''}`,
                  `最近学习知识点：${learningCoach?.tasks?.[0]?.knowledgePointTitle || ''}`,
                  `最近上传文档：${recentKnowledgeDocs[0]?.displayName || recentKnowledgeDocs[0]?.originalName || ''}`,
                  `最近复习内容：${learningCoach?.tasks?.[1]?.title || ''}`
                ].map((item, index) => (
                  <div key={`learning-memory-${index}`}>{item}</div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5 transition hover:border-zinc-700">
              <p className="text-sm font-medium text-zinc-50">工作记忆</p>
              <div className="mt-4 space-y-3 text-sm text-zinc-400">
                {[
                  `PPT：${recentPpt[0]?.title || ''}`,
                  `Excel 分析：${dashboard?.analytics?.analysisCount ? `${dashboard.analytics.analysisCount} 次数据分析` : ''}`,
                  `会议纪要：${recentMeetings[0]?.title || ''}`,
                  `简历优化：${dashboard?.resume?.optimizeCount ? `${dashboard.resume.optimizeCount} 次简历优化` : ''}`
                ].map((item, index) => (
                  <div key={`work-memory-${index}`}>{item}</div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5 transition hover:border-zinc-700">
              <p className="text-sm font-medium text-zinc-50">AI 偏好</p>
              <div className="mt-4 space-y-3 text-sm text-zinc-400">
                <div>默认模型：DeepSeek</div>
                <div>默认语言：中文</div>
                <div>回答风格：简洁、结构化</div>
                <div>主题：深色模式</div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section className="panel" {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.16 }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-50">Learning Community</p>
              <p className="mt-1 text-xs text-zinc-500">目前以产品化占位呈现，后续接入真实社区数据</p>
            </div>
            <span className="rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-400">Coming Soon</span>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {[
              ['最近学习动态', '暂无动态，完成一次学习计划后自动同步。'],
              ['排行榜', '敬请期待真实排行数据。'],
              ['共同学习', '和同学一起建立学习节奏。'],
              ['学习小组', '后续支持分组协作。']
            ].map(([title, desc], index) => (
              <div key={`${title}-${index}`} className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5 transition hover:border-zinc-700">
                <p className="text-sm font-medium text-zinc-50">{title}</p>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {errors.length ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            <div className="font-medium">部分模块尚未成功加载</div>
            <ul className="mt-2 space-y-1 text-amber-50/80">
              {errors.map((item, index) => (
                <li key={`${item.id}-${index}`}>· {item.message}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {modal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">AI Personal Operating System</p>
                <h2 className="mt-2 text-xl font-semibold text-zinc-50">{modal.title}</h2>
              </div>
              <button type="button" onClick={closeEditModal} disabled={saving} className="rounded-full border border-zinc-800 bg-zinc-900/70 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-700 disabled:opacity-60">
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
                <label key={`${String(key)}-${index}`} className="block rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700 sm:col-span-1">
                  <span className="text-sm text-zinc-400">{label}</span>
                  <input
                    value={draft[key as keyof EditableProfile] as string}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                    type={key === 'goal_target_date' ? 'date' : 'text'}
                    className="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-blue-500/50"
                    placeholder={label}
                  />
                </label>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3 border-t border-zinc-800 pt-4">
              <button type="button" onClick={closeEditModal} disabled={saving} className="rounded-full border border-zinc-800 bg-zinc-900/70 px-5 py-3 text-sm text-zinc-200 transition hover:border-zinc-700 disabled:cursor-not-allowed disabled:opacity-60">
                取消
              </button>
              <button type="button" onClick={handleSave} disabled={saving} className="rounded-full border border-emerald-500/20 bg-emerald-500 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? '保存中...' : '保存修改'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </WorkspaceShell>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkspaceShell } from '@/components/workspace-shell';
import request from '@/api/request';
import { useAuthStore } from '@/components/auth-provider';

type TreeNode = {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  chunkIds: string[];
  sourceFiles: string[];
  mastery: number;
  priority: number;
  status: 'pending' | 'active' | 'paused' | 'completed';
  children: TreeNode[];
};

type KnowledgePoint = {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  mastery: number;
  priority: number;
  sourceFiles: string[];
  tree: TreeNode[];
};

type LearningPlan = {
  id: string;
  title: string;
  status: 'active' | 'paused' | 'completed' | 'rescheduled';
  knowledgePoints: KnowledgePoint[];
  learningRoute: string[];
  dailyPlan: string[];
  reviewPlan: string[];
  exercises: string[];
};

type LearningTask = {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'paused' | 'completed';
  order: number;
  dueDate: string;
  sourceChunkId?: string;
  fileName?: string;
  knowledgePointId?: string;
  knowledgePointTitle?: string;
};

type Progress = {
  learningProgress: number;
  todayTasks: number;
  completionRate: number;
  streakDays: number;
  todayNewKnowledgePoints?: number;
  todayNewTasks?: number;
};

type KnowledgeBaseItem = { id: string; name: string; documentCount?: number; chunkCount?: number; ingestionStatus?: string };

type PathRecommendation = { order: number; pointId: string; title: string; difficulty: string; mastery: number; sourceChunkIds: string[]; recommendedReason: string };

const statusMeta: Record<string, { label: string; color: string; glow: string }> = {
  completed: { label: '已完成', color: 'border-emerald-200 bg-emerald-50 text-emerald-700', glow: 'shadow-emerald-200' },
  active: { label: '进行中', color: 'border-indigo-200 bg-indigo-50 text-indigo-700', glow: 'shadow-indigo-200' },
  paused: { label: '已暂停', color: 'border-amber-200 bg-amber-50 text-amber-700', glow: 'shadow-amber-200' },
  pending: { label: '待开始', color: 'border-slate-200 bg-slate-50 text-slate-500', glow: 'shadow-slate-200' }
};

const difficultyMeta: Record<string, { label: string; color: string }> = {
  hard: { label: '困难', color: 'border-rose-200 bg-rose-50 text-rose-600' },
  medium: { label: '中等', color: 'border-amber-200 bg-amber-50 text-amber-700' },
  easy: { label: '简单', color: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
};

const statusDot = (status: string) => {
  if (status === 'completed') return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
  if (status === 'active') return 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]';
  if (status === 'paused') return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
  return 'bg-slate-300';
};

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const all: TreeNode[] = [];
  const walk = (node: TreeNode) => {
    all.push(node);
    node.children.forEach(walk);
  };
  nodes.forEach(walk);
  return all;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } } };

export default function LearningCoachPage() {
  const { user } = useAuthStore();
  const userId = user?.id || '';
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseItem[]>([]);
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState('');
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [tasks, setTasks] = useState<LearningTask[]>([]);
  const [progress, setProgress] = useState<Progress>({ learningProgress: 0, todayTasks: 0, completionRate: 0, streakDays: 0 });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState({ identity: '', profession: '', goal: '', targetDate: '', school: '', name: '' });
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [planTemplate, setPlanTemplate] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [selectedNodeChunks, setSelectedNodeChunks] = useState<string[]>([]);
  const [selectedNodeExercises, setSelectedNodeExercises] = useState<any[]>([]);
  const [pathRecommendation, setPathRecommendation] = useState<PathRecommendation[]>([]);
  const [chunkPreview, setChunkPreview] = useState<any[]>([]);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const loadKnowledgeBases = async () => {
    try {
      if (!userId) return;
      const data = await request.get(`/knowledge?userId=${encodeURIComponent(userId)}`);
      const bases = Array.isArray(data?.bases) ? data.bases : [];
      setKnowledgeBases(bases);
      if (!selectedKnowledgeBaseId && bases[0]?.id) setSelectedKnowledgeBaseId(bases[0].id);
    } catch {
      setKnowledgeBases([]);
    }
  };

  const syncProfile = async () => {
    try {
      if (!userId) return;
      const result = await request.get(`/profile/${userId}/context`);
      setProfile({
        name: result.user?.nickname || result.user?.name || '',
        identity: result.user?.identity || '',
        profession: result.user?.profession || '',
        school: result.user?.school || '',
        goal: result.user?.goal || '',
        targetDate: result.user?.goal_target_date || ''
      });
    } catch {
      setProfile({ identity: '', profession: '', goal: '', targetDate: '', school: '', name: '' });
    }
  };

  const loadCoach = async () => {
    try {
      setSyncing(true);
      if (!userId) return;
      const context = await request.get(`/learning-coach/context?userId=${encodeURIComponent(userId)}`);
      if (context?.plan) {
        setPlan(context.plan);
        setTasks(Array.isArray(context.tasks) ? context.tasks : []);
        setProgress(context.progress || { learningProgress: 0, todayTasks: 0, completionRate: 0, streakDays: 0 });
        const flat = flattenTree(context.plan.knowledgePoints.flatMap((item: KnowledgePoint) => item.tree || []));
        const first = flat[0] || null;
        setSelectedNode(first);
        setSelectedNodeId(first?.id || '');
        setSelectedNodeChunks(first?.chunkIds || []);
        setSelectedNodeExercises(context.plan.exercises || []);
        setPlanTemplate(JSON.stringify(context.plan, null, 2));
      }
    } catch {
      setPlan(null);
      setTasks([]);
      setProgress({ learningProgress: 0, todayTasks: 0, completionRate: 0, streakDays: 0 });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    loadKnowledgeBases().catch(() => setKnowledgeBases([]));
    syncProfile();
    loadCoach();

    const refresh = () => {
      loadKnowledgeBases().catch(() => setKnowledgeBases([]));
      syncProfile();
      loadCoach();
    };

    window.addEventListener('workspace-data-updated', refresh as EventListener);
    window.addEventListener('workspace-profile-updated', refresh as EventListener);
    window.addEventListener('workspace-goal-updated', refresh as EventListener);
    return () => {
      window.removeEventListener('workspace-data-updated', refresh as EventListener);
      window.removeEventListener('workspace-profile-updated', refresh as EventListener);
      window.removeEventListener('workspace-goal-updated', refresh as EventListener);
    };
  }, [userId]);

  const generatePlan = async () => {
    if (!selectedKnowledgeBaseId) {
      setError('请先选择一个知识库');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const data = await request.post('/learning/coach', {
        userId,
        knowledgeBaseId: selectedKnowledgeBaseId,
        query: `${profile.name || ''} ${profile.identity || ''} ${profile.profession || ''} ${profile.school || ''} ${profile.goal || ''}`.trim()
      });
      setPlan(data.plan);
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      setProgress(data.progress || { learningProgress: 0, todayTasks: 0, completionRate: 0, streakDays: 0 });
      setSelectedTaskId(data.tasks?.[0]?.id || '');
      setPlanTemplate(JSON.stringify(data.plan, null, 2));
      setPathRecommendation(Array.isArray(data.pathRecommendation) ? data.pathRecommendation : []);
      const flat = flattenTree(data.plan?.knowledgePoints?.flatMap((item: KnowledgePoint) => item.tree || []) || []);
      const first = flat[0] || null;
      setSelectedNode(first);
      setSelectedNodeId(first?.id || '');
      setSelectedNodeChunks(first?.chunkIds || []);
      setSelectedNodeExercises(data.plan?.exercises || []);
      window.dispatchEvent(new Event('workspace-data-updated'));
    } catch (err: any) {
      setError(err?.message || '生成学习计划失败');
    } finally {
      setLoading(false);
    }
  };

  const updatePlanStatus = async (status: 'active' | 'paused' | 'completed' | 'rescheduled') => {
    if (!plan) return;
    await request.patch(`/learning/plans/${plan.id}/status`, { status });
    await loadCoach();
    window.dispatchEvent(new Event('workspace-data-updated'));
  };

  const updateTask = async (task: LearningTask, status: LearningTask['status']) => {
    await request.patch(`/learning/tasks/${task.id}/status`, { status });
    await loadCoach();
    window.dispatchEvent(new Event('workspace-data-updated'));
  };

  const reschedulePlan = async () => {
    if (!plan) return;
    const nextTitle = window.prompt('重新安排计划标题', `${plan.title}（调整后）`);
    if (!nextTitle) return;
    await request.post(`/learning/plans/${plan.id}/reschedule`, {
      title: nextTitle,
      learningRoute: plan.learningRoute,
      dailyPlan: plan.dailyPlan,
      reviewPlan: plan.reviewPlan,
      exercises: plan.exercises
    });
    await loadCoach();
    window.dispatchEvent(new Event('workspace-data-updated'));
  };

  const selectNode = async (node: TreeNode) => {
    setSelectedNode(node);
    setSelectedNodeId(node.id);
    setSelectedNodeChunks(node.chunkIds);
    setSelectedNodeExercises(plan?.exercises || []);
    nodeRefs.current[node.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    try {
      const result = await request.get(`/learning/nodes/${node.id}/chunks?userId=${encodeURIComponent(userId)}`);
      setChunkPreview(Array.isArray(result?.chunks) ? result.chunks : []);
    } catch {
      setChunkPreview([]);
    }
  };

  const renderNode = (node: TreeNode, depth = 0) => {
    const isSelected = selectedNodeId === node.id;
    const status = statusMeta[node.status] || statusMeta.pending;
    const diff = difficultyMeta[node.difficulty] || difficultyMeta.easy;
    return (
      <motion.div key={node.id} variants={item} className="relative">
        <div
          ref={(el) => {
            nodeRefs.current[node.id] = el;
          }}
          onClick={() => void selectNode(node)}
          className={`group cursor-pointer rounded-2xl border p-4 transition-all duration-300 ${
            isSelected
              ? 'border-indigo-300/80 bg-white/85 shadow-[0_8px_32px_rgba(99,102,241,0.14)]'
              : 'border-slate-200/60 bg-white/60 backdrop-blur-xl hover:border-indigo-200/80 hover:bg-white/80 hover:shadow-[0_8px_30px_rgba(99,102,241,0.12)]'
          }`}
          style={{ marginLeft: depth * 20 }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <div className={`h-2.5 w-2.5 rounded-full ${statusDot(node.status)}`} />
                <h4 className="truncate text-sm font-semibold text-slate-800">{node.title}</h4>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className={`badge ${status.color}`}>{node.status}</span>
                <span className={`badge ${diff.color}`}>{node.difficulty}</span>
                <span className="badge badge-muted">{node.chunkIds.length} chunks</span>
              </div>
            </div>
            <div className="shrink-0 text-right text-[11px] leading-4 text-slate-400">
              <div>掌握度 <span className="font-medium text-slate-600">{node.mastery}%</span></div>
              <div className="mt-0.5">优先级 <span className="font-medium text-slate-600">{node.priority}</span></div>
            </div>
          </div>
        </div>
        {node.children.length ? (
          <div className="relative mt-3 border-l border-slate-200/70 pl-4">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        ) : null}
      </motion.div>
    );
  };

  const selectedBase = useMemo(() => knowledgeBases.find((item) => item.id === selectedKnowledgeBaseId) || null, [knowledgeBases, selectedKnowledgeBaseId]);
  const selectedTask = tasks.find((item) => item.id === selectedTaskId) || tasks[0] || null;

  const stats = [
    { label: '学习进度', value: `${progress.learningProgress}%`, color: 'from-indigo-500 to-violet-500' },
    { label: '今日任务', value: String(progress.todayTasks), color: 'from-sky-500 to-indigo-500' },
    { label: '完成率', value: `${progress.completionRate}%`, color: 'from-emerald-400 to-teal-500' },
    { label: '连续学习天数', value: String(progress.streakDays), color: 'from-violet-500 to-fuchsia-500' }
  ];

  return (
    <WorkspaceShell active="/learning-coach">
      <div className="space-y-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="gradient-text text-2xl font-bold leading-tight md:text-3xl">Learning Path Visualization</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">将知识点结构呈现为树状图，支持节点查看 chunk 与练习题，并自动推荐学习顺序。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={generatePlan}
              disabled={loading || !knowledgeBases.length}
              className="btn-primary"
            >
              {loading ? '生成中...' : '从知识库生成路径'}
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => updatePlanStatus('active')} disabled={!plan} className="btn-ghost">开始</motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => updatePlanStatus('paused')} disabled={!plan} className="btn-ghost">暂停</motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => updatePlanStatus('completed')} disabled={!plan} className="btn-ghost">完成</motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={reschedulePlan} disabled={!plan} className="btn-ghost">重新安排</motion.button>
          </div>
        </header>

        {syncing ? (
          <div className="glass-panel flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
            同步学习数据中...
          </div>
        ) : null}

        <AnimatePresence>
          {error ? (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.section variants={container} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, color }) => (
            <motion.div key={label} variants={item} className="glass-panel relative overflow-hidden p-5">
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${color}`} />
              <div className="text-sm text-slate-500">{label}</div>
              <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</div>
            </motion.div>
          ))}
        </motion.section>

        <section className="grid gap-6 xl:grid-cols-[300px_1fr_360px]">
          <aside className="space-y-4">
            <div className="glass-panel">
              <div className="section-title">知识库选择</div>
              <div className="mt-4 space-y-2">
                {knowledgeBases.map((item) => (
                  <motion.button
                    key={item.id}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setSelectedKnowledgeBaseId(item.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      selectedKnowledgeBaseId === item.id
                        ? 'border-indigo-300 bg-indigo-50/70 shadow-[0_4px_16px_rgba(99,102,241,0.1)]'
                        : 'border-slate-200/60 bg-white/60 hover:border-indigo-200 hover:bg-white/80'
                    }`}
                  >
                    <div className="font-medium text-slate-800">{item.name}</div>
                    <div className="mt-1 text-xs text-slate-400">文档 {item.documentCount || 0} · Chunk {item.chunkCount || 0}</div>
                  </motion.button>
                ))}
                {!knowledgeBases.length ? <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/40 p-4 text-sm text-slate-400">请先上传知识库文件。</div> : null}
              </div>
              <div className="mt-4 rounded-xl border border-slate-200/60 bg-white/60 px-3 py-2.5 text-sm text-slate-500">当前知识库：{selectedBase?.name || '--'}</div>
            </div>
          </aside>

          <div className="glass-panel min-w-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="section-title">学习路径图</div>
                <div className="text-xs text-slate-400">Notion / Obsidian 风格树状图</div>
              </div>
              <div className="text-xs text-slate-400">点击节点查看 chunk 和练习题</div>
            </div>
            <motion.div variants={container} initial="hidden" animate="show" className="mt-5 space-y-3">
              {plan?.knowledgePoints?.length ? plan.knowledgePoints.flatMap((item) => item.tree || []).map((node) => renderNode(node, 0)) : <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/40 p-6 text-center text-sm text-slate-400">等待从知识库自动生成。</div>}
            </motion.div>
          </div>

          <aside className="space-y-6">
            <div className="glass-panel">
              <div className="section-title">节点详情</div>
              <div className="mt-4 rounded-2xl border border-slate-200/60 bg-white/60 p-4 text-sm text-slate-600">
                {selectedNode ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${statusDot(selectedNode.status)}`} />
                      <div className="font-semibold text-slate-800">{selectedNode.title}</div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`badge ${statusMeta[selectedNode.status]?.color || statusMeta.pending.color}`}>{selectedNode.status}</span>
                      <span className={`badge ${difficultyMeta[selectedNode.difficulty]?.color || difficultyMeta.easy.color}`}>{selectedNode.difficulty}</span>
                      <span className="badge badge-muted">{selectedNode.chunkIds.length} chunks</span>
                    </div>
                    <div className="mt-3 text-xs text-slate-400">来源：{selectedNode.sourceFiles.join('、') || '--'}</div>
                  </>
                ) : (
                  <div className="text-slate-400">点击路径图中的节点查看详情</div>
                )}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-4">
                  <div className="text-xs font-medium text-slate-400">关联 chunk</div>
                  <div className="mt-2 space-y-1.5 text-xs text-slate-600">
                    {selectedNodeChunks.length ? selectedNodeChunks.map((chunkId) => <div key={chunkId} className="rounded-lg border border-slate-200/70 bg-slate-50/60 px-2.5 py-1.5">{chunkId}</div>) : <div className="text-slate-400">暂无</div>}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-4">
                  <div className="text-xs font-medium text-slate-400">练习题</div>
                  <div className="mt-2 space-y-1.5 text-xs text-slate-600">
                    {selectedNodeExercises.length ? selectedNodeExercises.slice(0, 3).map((item, idx) => <div key={item.id || idx} className="rounded-lg border border-slate-200/70 bg-slate-50/60 px-2.5 py-1.5">{item.question || JSON.stringify(item).slice(0, 60)}</div>) : <div className="text-slate-400">暂无</div>}
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel">
              <div className="section-title">路径推荐</div>
              <div className="mt-4 space-y-2.5 text-sm text-slate-600">
                {pathRecommendation.length ? pathRecommendation.map((item) => (
                  <motion.div
                    key={item.pointId}
                    whileHover={{ y: -2 }}
                    className="cursor-pointer rounded-2xl border border-slate-200/60 bg-white/60 p-4 transition hover:border-indigo-200 hover:bg-white/80 hover:shadow-[0_8px_24px_rgba(99,102,241,0.1)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-slate-800 truncate">{item.order}. {item.title}</div>
                      <span className={`badge ${difficultyMeta[item.difficulty]?.color || difficultyMeta.easy.color}`}>{item.difficulty}</span>
                    </div>
                    <div className="mt-2 text-xs leading-relaxed text-slate-400">{item.recommendedReason} · mastery {item.mastery}%</div>
                  </motion.div>
                )) : <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/40 p-4 text-sm text-slate-400">生成计划后自动推荐。</div>}
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="glass-panel">
            <div className="flex items-center justify-between gap-3">
              <div className="section-title">今日任务</div>
              <div className="text-xs text-slate-400">来自数据库同步</div>
            </div>
            <div className="mt-4 space-y-3">
              {tasks.map((task) => (
                <motion.div
                  key={task.id}
                  whileHover={{ y: -2 }}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200/60 bg-white/60 p-4 transition hover:border-indigo-200 hover:bg-white/80 hover:shadow-[0_8px_24px_rgba(99,102,241,0.08)] lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800">{task.order}. {task.title}</div>
                    <div className="mt-1 text-xs text-slate-400">来源：{task.fileName || '--'} · {task.knowledgePointTitle || '--'}</div>
                    <div className="mt-1 text-xs text-slate-400">截止：{task.dueDate}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`badge ${statusMeta[task.status]?.color || statusMeta.pending.color}`}>{task.status}</span>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => updateTask(task, 'active')} className="rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-600">开始</motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => updateTask(task, 'paused')} className="rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-600">暂停</motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => updateTask(task, 'completed')} className="rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-600">完成</motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => updateTask(task, 'pending')} className="rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-600">重新安排</motion.button>
                  </div>
                </motion.div>
              ))}
              {!tasks.length ? <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/40 p-4 text-sm text-slate-400">暂无学习任务，请先生成计划。</div> : null}
            </div>
          </div>

          <div className="glass-panel">
            <div className="section-title">路径图原始结构</div>
            <pre className="mt-4 max-h-[340px] overflow-auto rounded-2xl border border-slate-200/60 bg-white/60 p-4 text-xs leading-5 text-slate-500">{JSON.stringify(plan?.knowledgePoints?.flatMap((item) => item.tree || []), null, 2) || '暂无'}</pre>
            <div className="mt-4 text-xs text-slate-400">Chunk 预览：{chunkPreview.length}</div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}

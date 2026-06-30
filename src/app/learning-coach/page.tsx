'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

function statusColor(status: string) {
  if (status === 'completed') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
  if (status === 'active') return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
  if (status === 'paused') return 'bg-amber-500/15 text-amber-400 border-amber-500/20';
  return 'bg-zinc-700/20 text-zinc-400 border-zinc-700/30';
}

function difficultyColor(difficulty: string) {
  if (difficulty === 'hard') return 'text-rose-300 border-rose-500/20 bg-rose-500/10';
  if (difficulty === 'medium') return 'text-amber-300 border-amber-500/20 bg-amber-500/10';
  return 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10';
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const all: TreeNode[] = [];
  const walk = (node: TreeNode) => {
    all.push(node);
    node.children.forEach(walk);
  };
  nodes.forEach(walk);
  return all;
}

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
  const [selectedNodeExercises, setSelectedNodeExercises] = useState<string[]>([]);
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
      const result = await request.get(`/learning/nodes/${node.id}/chunks`);
      setChunkPreview(Array.isArray(result?.chunks) ? result.chunks : []);
    } catch {
      setChunkPreview([]);
    }
  };

  const renderNode = (node: TreeNode, depth = 0) => {
    const isSelected = selectedNodeId === node.id;
    return (
      <div key={node.id} className="relative">
        <div
          ref={(el) => {
            nodeRefs.current[node.id] = el;
          }}
          onClick={() => void selectNode(node)}
          className={`group relative mb-3 cursor-pointer rounded-2xl border px-4 py-3 transition-all duration-300 ${isSelected ? 'ring-2 ring-indigo-400/40 bg-indigo-500/10 border-indigo-400/50 shadow-[0_0_0_1px_rgba(129,140,248,0.35)]' : 'border-zinc-800 bg-zinc-950/60'}`}
          style={{ marginLeft: depth * 22 }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${node.status === 'completed' ? 'bg-emerald-400' : node.status === 'active' ? 'bg-blue-400' : node.status === 'paused' ? 'bg-amber-400' : 'bg-zinc-500'}`} />
                <h4 className="truncate text-sm font-medium text-zinc-100">{node.title}</h4>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span className={`rounded-full border px-2 py-1 ${statusColor(node.status)}`}>{node.status}</span>
                <span className={`rounded-full border px-2 py-1 ${difficultyColor(node.difficulty)}`}>{node.difficulty}</span>
                <span className="rounded-full border border-zinc-800 px-2 py-1 text-zinc-400">chunks {node.chunkIds.length}</span>
              </div>
            </div>
            <div className="text-right text-[11px] text-zinc-500">
              <div>掌握度 {node.mastery}%</div>
              <div>优先级 {node.priority}</div>
            </div>
          </div>
          {node.children.length ? <div className="mt-3 border-l border-zinc-800 pl-3">{node.children.map((child) => renderNode(child, depth + 1))}</div> : null}
        </div>
      </div>
    );
  };

  const selectedBase = useMemo(() => knowledgeBases.find((item) => item.id === selectedKnowledgeBaseId) || null, [knowledgeBases, selectedKnowledgeBaseId]);
  const selectedTask = tasks.find((item) => item.id === selectedTaskId) || tasks[0] || null;

  return (
    <WorkspaceShell active="/learning-coach">
      <div className="space-y-6 rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 text-zinc-100 shadow-panel backdrop-blur-2xl">
        <div className="flex flex-col gap-4 border-b border-zinc-800 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-50">Learning Path Visualization</h1>
            <p className="mt-2 text-sm text-zinc-400">将知识点结构呈现为树状图，支持节点查看 chunk 与练习题，并自动推荐学习顺序。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={generatePlan} disabled={loading || !knowledgeBases.length} className="rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {loading ? '生成中...' : '从知识库生成路径'}
            </button>
            <button onClick={() => updatePlanStatus('active')} disabled={!plan} className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 disabled:opacity-50">开始</button>
            <button onClick={() => updatePlanStatus('paused')} disabled={!plan} className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 disabled:opacity-50">暂停</button>
            <button onClick={() => updatePlanStatus('completed')} disabled={!plan} className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 disabled:opacity-50">完成</button>
            <button onClick={reschedulePlan} disabled={!plan} className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 disabled:opacity-50">重新安排</button>
          </div>
        </div>

        {error ? <div className="rounded-lg border border-rose-900/60 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['学习进度', `${progress.learningProgress}%`],
            ['今日任务', String(progress.todayTasks)],
            ['完成率', `${progress.completionRate}%`],
            ['连续学习天数', String(progress.streakDays)]
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              <div className="text-sm text-zinc-500">{label}</div>
              <div className="mt-2 text-2xl font-semibold text-zinc-50">{value}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[320px_1fr]">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="text-sm font-semibold text-zinc-50">知识库选择</div>
            <div className="mt-3 space-y-2">
              {knowledgeBases.map((item) => (
                <button key={item.id} onClick={() => setSelectedKnowledgeBaseId(item.id)} className={`w-full rounded-lg border px-3 py-3 text-left transition ${selectedKnowledgeBaseId === item.id ? 'border-blue-500/50 bg-blue-500/10' : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900'}`}>
                  <div className="font-medium text-zinc-50">{item.name}</div>
                  <div className="mt-1 text-xs text-zinc-500">文档 {item.documentCount || 0} · Chunk {item.chunkCount || 0}</div>
                </button>
              ))}
              {!knowledgeBases.length ? <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/30 p-4 text-sm text-zinc-500">请先上传知识库文件。</div> : null}
            </div>
            <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/70 p-3 text-sm text-zinc-400">当前知识库：{selectedBase?.name || '--'}</div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-zinc-50">学习路径图</div>
                  <div className="text-xs text-zinc-500">Notion / Obsidian 风格树状图</div>
                </div>
                <div className="text-xs text-zinc-500">点击节点查看 chunk 和练习题</div>
              </div>
              <div className="mt-4 space-y-2">
                {plan?.knowledgePoints?.length ? plan.knowledgePoints.flatMap((item) => item.tree || []).map((node) => renderNode(node, 0)) : <div className="text-sm text-zinc-500">等待从知识库自动生成。</div>}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                <div className="text-sm font-semibold text-zinc-50">路径推荐</div>
                <div className="mt-3 space-y-2 text-sm text-zinc-300">
                  {pathRecommendation.length ? pathRecommendation.map((item) => (
                    <div key={item.pointId} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-zinc-50">{item.order}. {item.title}</div>
                        <span className={`rounded-full border px-2 py-1 text-xs ${difficultyColor(item.difficulty)}`}>{item.difficulty}</span>
                      </div>
                      <div className="mt-2 text-xs text-zinc-500">{item.recommendedReason} · mastery {item.mastery}%</div>
                    </div>
                  )) : <div className="text-sm text-zinc-500">生成计划后自动推荐。</div>}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                <div className="text-sm font-semibold text-zinc-50">节点详情</div>
                <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-sm text-zinc-300">
                  {selectedNode ? (
                    <>
                      <div className="font-medium text-zinc-50">{selectedNode.title}</div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className={`rounded-full border px-2 py-1 ${statusColor(selectedNode.status)}`}>{selectedNode.status}</span>
                        <span className={`rounded-full border px-2 py-1 ${difficultyColor(selectedNode.difficulty)}`}>{selectedNode.difficulty}</span>
                        <span className="rounded-full border border-zinc-800 px-2 py-1 text-zinc-400">chunks {selectedNode.chunkIds.length}</span>
                      </div>
                      <div className="mt-2 text-xs text-zinc-500">来源：{selectedNode.sourceFiles.join('、') || '--'}</div>
                    </>
                  ) : (
                    <div className="text-zinc-500">点击路径图中的节点查看详情</div>
                  )}
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                    <div className="text-xs text-zinc-500">关联 chunk</div>
                    <div className="mt-2 space-y-1 text-xs text-zinc-300">
                      {selectedNodeChunks.length ? selectedNodeChunks.map((chunkId) => <div key={chunkId} className="rounded-md border border-zinc-800 bg-zinc-950/70 px-2 py-1">{chunkId}</div>) : <div className="text-zinc-500">暂无</div>}
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                    <div className="text-xs text-zinc-500">练习题</div>
                    <div className="mt-2 space-y-1 text-xs text-zinc-300">
                      {selectedNodeExercises.length ? selectedNodeExercises.slice(0, 3).map((item) => <div key={item} className="rounded-md border border-zinc-800 bg-zinc-950/70 px-2 py-1">{item}</div>) : <div className="text-zinc-500">暂无</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-zinc-50">今日任务</div>
              <div className="text-xs text-zinc-500">来自数据库同步</div>
            </div>
            <div className="mt-3 space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="font-medium text-zinc-50">{task.order}. {task.title}</div>
                    <div className="mt-1 text-xs text-zinc-500">来源：{task.fileName || '--'} · {task.knowledgePointTitle || '--'}</div>
                    <div className="mt-1 text-xs text-zinc-500">截止：{task.dueDate}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-1 text-xs ${statusColor(task.status)}`}>{task.status}</span>
                    <button onClick={() => updateTask(task, 'active')} className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-200">开始</button>
                    <button onClick={() => updateTask(task, 'paused')} className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-200">暂停</button>
                    <button onClick={() => updateTask(task, 'completed')} className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-200">完成</button>
                    <button onClick={() => updateTask(task, 'pending')} className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-200">重新安排</button>
                  </div>
                </div>
              ))}
              {!tasks.length ? <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/30 p-4 text-sm text-zinc-500">暂无学习任务，请先生成计划。</div> : null}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="text-sm font-semibold text-zinc-50">路径图原始结构</div>
            <pre className="mt-3 max-h-[340px] overflow-auto rounded-lg border border-zinc-800 bg-black/30 p-3 text-xs leading-5 text-zinc-400">{JSON.stringify(plan?.knowledgePoints?.flatMap((item) => item.tree || []), null, 2) || '暂无'}</pre>
            <div className="mt-4 text-xs text-zinc-500">Chunk 预览：{chunkPreview.length}</div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { WorkspaceShell } from '@/components/workspace-shell';
import { useLearningTracker } from '@/hooks/useLearningTracker';
import request from '@/api/request';
import { useAuthStore } from '@/components/auth-provider';

type LearningRecord = {
  id: string;
  subject: string;
  topic: string;
  mastery: number;
  note?: string;
  created_at?: string;
  createdAt?: string;
};

const skillTemplates = [
  { name: '目标理解', keywords: ['目标', '规划', '拆解'] },
  { name: '资料吸收', keywords: ['知识库', '阅读', '总结'] },
  { name: '刻意练习', keywords: ['练习', '错题', '掌握'] },
  { name: '复盘输出', keywords: ['复盘', '输出', '讲解'] }
];

function parseStudyMinutes(note?: string) {
  try {
    const parsed = JSON.parse(note || '{}');
    return Number(parsed.study_minutes || 0);
  } catch {
    return 0;
  }
}

function buildLearningPath(records: LearningRecord[]) {
  const topicCount = records.reduce<Record<string, number>>((acc, item) => {
    const key = item.topic || 'general';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const focusTopic = Object.entries(topicCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '基础学习';
  return [
    { title: '明确目标', desc: `围绕 ${focusTopic} 建立本周学习目标`, status: records.length ? 'completed' : 'active' },
    { title: '资料输入', desc: '整理核心资料并沉淀知识点', status: records.length >= 2 ? 'completed' : 'active' },
    { title: '练习强化', desc: '用题目、案例或项目进行刻意练习', status: records.length >= 5 ? 'completed' : 'pending' },
    { title: '复盘输出', desc: '形成总结、讲解或演示材料', status: records.length >= 8 ? 'completed' : 'pending' }
  ];
}

function buildSkillTree(records: LearningRecord[]) {
  const totalMinutes = records.reduce((sum, item) => sum + parseStudyMinutes(item.note), 0);
  return skillTemplates.map((skill, index) => {
    const matched = records.filter((item) => skill.keywords.some((keyword) => `${item.subject} ${item.topic} ${item.note || ''}`.includes(keyword)));
    const base = matched.length * 18 + totalMinutes * 2 + index * 4;
    return { ...skill, mastery: Math.max(8, Math.min(100, Math.round(base))) };
  });
}

function buildDailyRecommendation(records: LearningRecord[]) {
  if (!records.length) return '今天先完成 25 分钟基础学习，并记录 1 个关键知识点。';
  const latest = records[0];
  const mastery = Number(latest.mastery || 0);
  if (mastery < 40) return `继续巩固 ${latest.topic || '当前主题'}，建议完成一次概念复述和 3 道练习。`;
  if (mastery < 80) return `围绕 ${latest.topic || '当前主题'} 做一次应用练习，并整理易错点。`;
  return `尝试把 ${latest.topic || '当前主题'} 输出成笔记、讲解或 Slidev 演示。`;
}

export default function LearningPage() {
  useLearningTracker({ subject: 'learning' });
  const { user, isLogin } = useAuthStore();
  const [records, setRecords] = useState<LearningRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isLogin || !user?.id) {
        setRecords([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const result = await request.get(`/learning-records?userId=${encodeURIComponent(user.id)}`);
        if (!cancelled) setRecords(Array.isArray(result) ? result : []);
      } catch {
        if (!cancelled) setRecords([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isLogin, user?.id]);

  const learningPath = useMemo(() => buildLearningPath(records), [records]);
  const skillTree = useMemo(() => buildSkillTree(records), [records]);
  const recommendation = useMemo(() => buildDailyRecommendation(records), [records]);
  const totalMinutes = records.reduce((sum, item) => sum + parseStudyMinutes(item.note), 0);

  return (
    <WorkspaceShell active="/learning">
      <div className="panel">
        <p className="text-sm text-blue-400">Learning Center</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-50">AI 学习系统</h1>
        <p className="mt-2 text-sm text-zinc-500">基于 learning_records 自动生成学习路径、技能图谱与今日建议。</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          [String(records.length), '学习记录'],
          [`${totalMinutes} min`, '累计时长'],
          [loading ? '同步中' : '已生成', 'AI 建议']
        ].map(([value, label]) => (
          <div key={label} className="panel-muted">
            <div className="font-mono text-2xl font-semibold text-zinc-50">{value}</div>
            <div className="mt-1 text-sm text-zinc-500">{label}</div>
          </div>
        ))}
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="panel">
          <h2 className="text-xl font-semibold text-zinc-50">Learning Path 目标拆解</h2>
          <div className="mt-4 space-y-3">
            {learningPath.map((item, index) => (
              <div key={item.title} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-blue-400">Step {index + 1}</p>
                    <h3 className="mt-1 font-semibold text-zinc-100">{item.title}</h3>
                  </div>
                  <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">{item.status}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2 className="text-xl font-semibold text-zinc-50">Daily Recommendation 今日学习建议</h2>
          <p className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm leading-6 text-zinc-300">{recommendation}</p>
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-zinc-200">最近记录</h3>
            <div className="mt-3 space-y-2">
              {records.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-400">
                  <span className="text-zinc-200">{item.subject}</span> · {item.topic}
                </div>
              ))}
              {!records.length ? <p className="text-sm text-zinc-500">暂无学习记录，进入页面后会自动开始记录。</p> : null}
            </div>
          </div>
        </div>
      </section>

      <div className="panel">
        <h2 className="text-xl font-semibold text-zinc-50">Skill Tree 技能图谱</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {skillTree.map((skill) => (
            <div key={skill.name} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-zinc-100">{skill.name}</h3>
                <span className="font-mono text-sm text-blue-400">{skill.mastery}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-zinc-800">
                <div className="h-2 rounded-full bg-blue-500" style={{ width: `${skill.mastery}%` }} />
              </div>
              <p className="mt-3 text-xs text-zinc-500">{skill.keywords.join(' / ')}</p>
            </div>
          ))}
        </div>
      </div>
    </WorkspaceShell>
  );
}

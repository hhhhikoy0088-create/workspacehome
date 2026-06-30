import { WorkspaceShell } from '@/components/workspace-shell';

const items = ['学习地图', '掌握度分析', '错题系统', '复习计划', '阶段目标', '每日提醒'];

export default function LearningPage() {
  return (
    <WorkspaceShell active="/learning">
      <div className="panel">
        <h1 className="text-3xl font-semibold text-zinc-50">学习地图与掌握度跟踪</h1>
        <p className="mt-2 text-sm text-zinc-500">规划路径、追踪掌握度、管理复习节奏</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item} className="panel-muted text-zinc-200">
            {item}
          </div>
        ))}
      </div>
    </WorkspaceShell>
  );
}

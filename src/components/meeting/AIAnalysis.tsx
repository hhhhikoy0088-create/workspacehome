'use client';

interface AIAnalysisProps {
  isRecording: boolean;
  currentTopics: string[];
  actionItems: string[];
  assignees: string[];
  deadlines: string[];
}

export function AIAnalysis({
  isRecording,
  currentTopics,
  actionItems,
  assignees,
  deadlines
}: AIAnalysisProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-panel backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <h3 className="text-base font-semibold text-zinc-50">AI 实时分析</h3>
        {isRecording && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400">分析中</span>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-800/40 p-4">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">📌 讨论主题</div>
          <div className="mt-3 space-y-2">
            {currentTopics.length === 0 ? (
              <p className="text-sm text-zinc-500">等待话题识别...</p>
            ) : (
              currentTopics.slice(0, 3).map((topic, i) => (
                <div key={i} className="text-sm text-zinc-300">
                  • {topic}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-800/40 p-4">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">✓ 待办事项</div>
          <div className="mt-3 space-y-2">
            {actionItems.length === 0 ? (
              <p className="text-sm text-zinc-500">等待任务识别...</p>
            ) : (
              actionItems.slice(0, 3).map((item, i) => (
                <div key={i} className="text-sm text-zinc-300">
                  • {item}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-800/40 p-4">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">👥 负责人</div>
          <div className="mt-3 space-y-2">
            {assignees.length === 0 ? (
              <p className="text-sm text-zinc-500">等待人员识别...</p>
            ) : (
              assignees.slice(0, 3).map((person, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
                  <span className="text-sm text-zinc-300">{person}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-800/40 p-4">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">📅 截止时间</div>
          <div className="mt-3 space-y-2">
            {deadlines.length === 0 ? (
              <p className="text-sm text-zinc-500">等待时间识别...</p>
            ) : (
              deadlines.slice(0, 3).map((deadline, i) => (
                <div key={i} className="text-sm text-zinc-300">
                  • {deadline}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

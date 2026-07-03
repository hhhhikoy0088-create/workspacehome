'use client';

interface SummaryPanelProps {
  data: any | null;
  isLoading?: boolean;
}

export function SummaryPanel({ data, isLoading }: SummaryPanelProps) {
  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-6 overflow-y-auto rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <h3 className="text-lg font-semibold text-zinc-50">AI 纪要</h3>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-6 w-32 animate-pulse rounded bg-zinc-800" />
              <div className="h-4 w-full animate-pulse rounded bg-zinc-800" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl border border-zinc-800 bg-zinc-950/60">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/></svg>
          </div>
          <p className="text-sm text-zinc-500">AI 纪要将显示在这里</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div>
        <h3 className="text-lg font-semibold text-zinc-50">AI 纪要</h3>
      </div>

      {/* 摘要 */}
      {data.summary && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-violet-400">会议摘要</h4>
          <p className="text-sm leading-6 text-zinc-300">{data.summary}</p>
        </div>
      )}

      {/* 重点讨论 */}
      {data.keyPoints?.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-violet-400">重点讨论</h4>
          <ul className="space-y-2">
            {data.keyPoints.map((point: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-300">
                <span className="text-violet-400">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 决策事项 */}
      {data.decisions?.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-emerald-400">决策事项</h4>
          <ul className="space-y-2">
            {data.decisions.map((decision: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-300">
                <span className="text-emerald-400">✓</span>
                <span>{decision}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 待办事项 */}
      {data.actionItems?.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-amber-400">待办事项</h4>
          <div className="space-y-2">
            {data.actionItems.map((item: any, i: number) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <p className="text-sm font-medium text-zinc-100">{item.task}</p>
                <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                  <span>{item.owner}</span>
                  <span>{item.deadline}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 参与人员 */}
      {data.teamMembers?.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-purple-400">参与人员</h4>
          <div className="flex flex-wrap gap-2">
            {data.teamMembers.map((member: string, i: number) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1 text-xs text-zinc-300"
              >
                <span className="h-2 w-2 rounded-full bg-violet-400" />
                {member}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 时间节点 */}
      {data.timeline && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-cyan-400">时间节点</h4>
          <p className="text-sm text-zinc-300">{data.timeline}</p>
        </div>
      )}

      {/* AI建议 */}
      {data.suggestions?.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-orange-400">AI 建议</h4>
          <ul className="space-y-2">
            {data.suggestions.map((suggestion: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-300">
                <span className="text-orange-400">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

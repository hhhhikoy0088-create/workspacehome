'use client';

interface SummaryPanelProps {
  data: any | null;
  isLoading?: boolean;
}

export function SummaryPanel({ data, isLoading }: SummaryPanelProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col h-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-panel backdrop-blur-2xl gap-6 overflow-y-auto">
        <h3 className="text-lg font-semibold text-zinc-50">AI 纪要</h3>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-full bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-zinc-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col h-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-panel backdrop-blur-2xl items-center justify-center">
        <p className="text-sm text-zinc-500">AI 纪要将显示在这里</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-panel backdrop-blur-2xl gap-6 overflow-y-auto">
      <div>
        <h3 className="text-lg font-semibold text-zinc-50 mb-4">AI 纪要</h3>
      </div>

      {/* 摘要 */}
      {data.summary && (
        <div>
          <h4 className="text-sm font-semibold text-blue-400 mb-2">📋 会议摘要</h4>
          <p className="text-sm leading-6 text-zinc-300">{data.summary}</p>
        </div>
      )}

      {/* 重点讨论 */}
      {data.keyPoints?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-blue-400 mb-2">💡 重点讨论</h4>
          <ul className="space-y-2">
            {data.keyPoints.map((point: string, i: number) => (
              <li key={i} className="text-sm text-zinc-300 flex gap-2">
                <span className="text-blue-400">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 决策事项 */}
      {data.decisions?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-green-400 mb-2">✓ 决策事项</h4>
          <ul className="space-y-2">
            {data.decisions.map((decision: string, i: number) => (
              <li key={i} className="text-sm text-zinc-300 flex gap-2">
                <span className="text-green-400">✓</span>
                <span>{decision}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 待办事项 */}
      {data.actionItems?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-amber-400 mb-2">📝 待办事项</h4>
          <div className="space-y-2">
            {data.actionItems.map((item: any, i: number) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-800/40 p-3">
                <p className="text-sm font-medium text-zinc-100">{item.task}</p>
                <div className="mt-2 flex gap-4 text-xs text-zinc-400">
                  <span>👤 {item.owner}</span>
                  <span>📅 {item.deadline}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 参与人员 */}
      {data.teamMembers?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-purple-400 mb-2">👥 参与人员</h4>
          <div className="flex flex-wrap gap-2">
            {data.teamMembers.map((member: string, i: number) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1 text-xs text-zinc-300"
              >
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                {member}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 时间节点 */}
      {data.timeline && (
        <div>
          <h4 className="text-sm font-semibold text-cyan-400 mb-2">⏱️ 时间节点</h4>
          <p className="text-sm text-zinc-300">{data.timeline}</p>
        </div>
      )}

      {/* AI建议 */}
      {data.suggestions?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-orange-400 mb-2">🎯 AI 建议</h4>
          <ul className="space-y-2">
            {data.suggestions.map((suggestion: string, i: number) => (
              <li key={i} className="text-sm text-zinc-300 flex gap-2">
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

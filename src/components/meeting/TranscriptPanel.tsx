'use client';

interface TranscriptPanelProps {
  text: string;
  isLoading?: boolean;
}

export function TranscriptPanel({ text, isLoading }: TranscriptPanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/40 px-6 py-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-50">会议全文</h3>
          <p className="mt-1 text-xs text-zinc-500">转录自音频内容</p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />
            <span className="text-xs text-violet-400">处理中</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-zinc-800" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : text ? (
          <div className="whitespace-pre-wrap text-sm leading-7 text-zinc-300">{text}</div>
        ) : (
          <div className="flex h-full items-center justify-center text-center text-zinc-500">
            <div>
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl border border-zinc-800 bg-zinc-950/60">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <p className="text-sm">开始录音或上传文件后，转录内容将显示在这里</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

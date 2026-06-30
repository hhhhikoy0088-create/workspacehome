'use client';

interface TranscriptPanelProps {
  text: string;
  isLoading?: boolean;
}

export function TranscriptPanel({ text, isLoading }: TranscriptPanelProps) {
  return (
    <div className="flex flex-col h-full rounded-xl border border-zinc-800 bg-zinc-900/80 shadow-panel backdrop-blur-2xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/40 px-6 py-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-50">会议全文</h3>
          <p className="mt-1 text-xs text-zinc-500">转录自音频内容</p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs text-blue-400">处理中</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-full rounded bg-zinc-800 animate-pulse" />
                <div className="h-4 w-5/6 rounded bg-zinc-800 animate-pulse" />
              </div>
            ))}
          </div>
        ) : text ? (
          <div className="text-sm leading-7 text-zinc-300 whitespace-pre-wrap">{text}</div>
        ) : (
          <div className="flex items-center justify-center h-full text-center text-zinc-500">
            <div>
              <div className="text-3xl">📝</div>
              <p className="mt-2 text-sm">开始录音或上传文件后，转录内容将显示在这里</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

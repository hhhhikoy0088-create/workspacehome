'use client';

interface TranscriptProps {
  text: string;
  isLoading?: boolean;
}

export function Transcript({ text, isLoading }: TranscriptProps) {
  return (
    <div className="flex flex-col h-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-panel backdrop-blur-2xl">
      <h3 className="text-lg font-semibold text-zinc-50 mb-4">会议全文</h3>
      
      <div className="flex-1 overflow-y-auto pr-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 bg-zinc-800 rounded animate-pulse" style={{ width: `${Math.random() * 40 + 60}%` }} />
            ))}
          </div>
        ) : text ? (
          <p className="text-sm leading-7 text-zinc-300 whitespace-pre-wrap">{text}</p>
        ) : (
          <p className="text-sm text-zinc-500">会议转录文本将显示在这里</p>
        )}
      </div>
    </div>
  );
}

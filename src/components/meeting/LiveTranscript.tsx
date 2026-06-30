'use client';

import { useEffect, useRef, useState } from 'react';

interface LiveTranscriptProps {
  isRecording: boolean;
  transcript: string;
}

export function LiveTranscript({ isRecording, transcript }: LiveTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const segments = transcript.split('\n').filter((s) => s.trim());

  return (
    <div className="flex flex-col h-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-panel backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h3 className="text-base font-semibold text-zinc-50">实时字幕</h3>
          <p className="mt-1 text-xs text-zinc-500">AI 实时转录中</p>
        </div>
        {isRecording && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs text-blue-400">监听中</span>
          </div>
        )}
      </div>

      <div ref={scrollRef} className="mt-4 flex-1 overflow-y-auto space-y-3 pr-2">
        {segments.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-zinc-500">
            {isRecording ? '等待识别...' : '开始录音后字幕会显示在这里'}
          </div>
        ) : (
          segments.map((segment, index) => (
            <div
              key={index}
              className={`rounded-lg p-3 max-w-[90%] ${
                index % 2 === 0
                  ? 'bg-blue-500/15 text-blue-100 border border-blue-500/30 mr-auto'
                  : 'bg-zinc-800/60 text-zinc-100 border border-zinc-700 ml-auto'
              }`}
            >
              <p className="text-sm leading-6">{segment}</p>
            </div>
          ))
        )}
        {isRecording && transcript && (
          <div className="flex gap-1 mt-3">
            <div className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" />
            <div className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        )}
      </div>
    </div>
  );
}

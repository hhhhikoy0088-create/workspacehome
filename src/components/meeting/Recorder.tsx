'use client';

import { useEffect, useRef, useState } from 'react';

interface RecorderProps {
  onRecordComplete: (audioBlob: Blob) => void;
  disabled?: boolean;
}

type RecorderState = 'idle' | 'recording' | 'paused' | 'stopping';

export function Recorder({ onRecordComplete, disabled }: RecorderProps) {
  const [state, setState] = useState<RecorderState>('idle');
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onRecordComplete(audioBlob);
        setState('idle');
        setDuration(0);
      };

      mediaRecorder.start();
      setState('recording');

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setError(err.message || '无法访问麦克风，请检查权限设置');
      setState('idle');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.pause();
      setState('paused');
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && state === 'paused') {
      mediaRecorderRef.current.resume();
      setState('recording');
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state !== 'idle') {
      setState('stopping');
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-12">
      <div className="text-center">
        <h2 className="text-3xl font-semibold text-zinc-50">实时录音</h2>
        <p className="mt-2 text-sm text-zinc-500">高保真音频 + 智能转录</p>
      </div>

      {/* 计时器 */}
      <div className="font-mono text-6xl font-bold tracking-wider text-violet-400">
        {formatTime(duration)}
      </div>

      {/* 录音状态指示器 */}
      {state === 'recording' && (
        <div className="flex items-center gap-3">
          <div className="relative h-3 w-3">
            <div className="absolute inset-0 animate-pulse rounded-full bg-red-500" />
            <div className="absolute inset-0 animate-ping rounded-full bg-red-400/50" />
          </div>
          <span className="text-sm font-medium text-red-400">录音中...</span>
        </div>
      )}

      {state === 'paused' && (
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <span className="text-sm font-medium text-yellow-400">已暂停</span>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="max-w-md rounded-xl border border-rose-900/40 bg-rose-950/30 px-4 py-3 text-center text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* 控制按钮 */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {state === 'idle' && (
          <button
            onClick={startRecording}
            disabled={disabled}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 px-8 py-4 text-lg font-semibold text-white transition hover:from-violet-400 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            开始录音
          </button>
        )}

        {(state === 'recording' || state === 'paused') && (
          <>
            {state === 'recording' && (
              <button
                onClick={pauseRecording}
                className="rounded-full border-2 border-yellow-500/50 bg-yellow-500/10 px-6 py-3 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-500/20"
              >
                暂停
              </button>
            )}

            {state === 'paused' && (
              <button
                onClick={resumeRecording}
                className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
              >
                继续
              </button>
            )}

            <button
              onClick={stopRecording}
              className="rounded-full bg-red-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-400"
            >
              停止
            </button>
          </>
        )}

        {state === 'stopping' && (
          <button
            disabled
            className="cursor-not-allowed rounded-full bg-zinc-800 px-6 py-3 text-sm font-semibold text-zinc-400"
          >
            处理中...
          </button>
        )}
      </div>

      <p className="text-center text-xs text-zinc-600">
        {state === 'idle' && duration === 0 && '点击开始录音'}
        {state === 'recording' && '录音进行中，点击暂停或停止'}
        {state === 'paused' && '录音已暂停，可继续或停止'}
        {state === 'stopping' && '正在处理音频...'}
      </p>
    </div>
  );
}

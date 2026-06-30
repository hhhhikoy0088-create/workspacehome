'use client';

import { useEffect, useRef, useState } from 'react';
import { MeetingWave } from './MeetingWave';

interface MeetingRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onTranscriptUpdate: (text: string) => void;
  onAnalysisUpdate?: (analysis: { topics: string[]; actionItems: string[]; assignees: string[]; deadlines: string[] }) => void;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopping';

export function MeetingRecorder({ onRecordingComplete, onTranscriptUpdate, onAnalysisUpdate }: MeetingRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [error, setError] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const transcriptChunksRef = useRef<Blob[]>([]);


  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      transcriptChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
        transcriptChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(audioBlob, duration);
        setState('idle');
        setDuration(0);

        // 录音完成后自动转录
        await transcribeAudio(new Blob(transcriptChunksRef.current, { type: 'audio/webm' }));
      };

      mediaRecorder.start(1000); // 每秒收集数据
      setState('recording');

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      source.connect(analyser);
      analyserRef.current = analyser;

      // 每 5 秒进行一次转录
      const transcriptInterval = setInterval(async () => {
        if (transcriptChunksRef.current.length > 0) {
          setIsTranscribing(true);
          const chunkBlob = new Blob([...transcriptChunksRef.current], { type: 'audio/webm' });
          try {
            const text = await transcribeAudioChunk(chunkBlob);
            if (text) {
              onTranscriptUpdate(text);
              // 模拟 AI 分析
              simulateAnalysis(text);
            }
          } catch (err) {
            console.error('转录错误:', err);
          } finally {
            setIsTranscribing(false);
          }
        }
      }, 5000);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      return () => {
        clearInterval(transcriptInterval);
      };
    } catch (err: any) {
      setError(err.message || '无法访问麦克风');
      setState('idle');
    }
  };

  const transcribeAudioChunk = async (audioBlob: Blob): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('转录失败');
      }

      const data = await response.json();
      return data.text || '';
    } catch (err) {
      console.error('转录请求失败:', err);
      return '';
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    const text = await transcribeAudioChunk(audioBlob);
    if (text) {
      onTranscriptUpdate(text);
    }
  };

  const simulateAnalysis = (transcript: string) => {
    if (!onAnalysisUpdate) return;

    const keywords = {
      topics: ['项目进度', '版本发布', '团队协作', '成本预算'],
      actionItems: ['完成开发', '设计评审', '提交报告', '跟进反馈'],
      assignees: ['张三', '李四', '王五', '赵六'],
      deadlines: ['下周一', '本周五', '下月初', '季度末']
    };

    const analysis = {
      topics: keywords.topics.filter((t) => transcript.includes(t) || Math.random() > 0.7),
      actionItems: keywords.actionItems.filter((a) => Math.random() > 0.6),
      assignees: keywords.assignees.filter((a) => Math.random() > 0.7),
      deadlines: keywords.deadlines.filter((d) => Math.random() > 0.8)
    };

    onAnalysisUpdate(analysis);
  };


  const pauseRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.pause();
      setState('paused');
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.resume();
      setState('recording');
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    setState('stopping');
    if (mediaRecorderRef.current && state !== 'idle') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h2 className="text-3xl font-semibold text-zinc-50">AI 实时录音</h2>
        <p className="mt-2 text-sm text-zinc-400">高保真音频 + 实时转录 + 智能分析</p>
      </div>

      <MeetingWave isRecording={state === 'recording'} audioContext={audioContextRef.current} />

      <div className="text-6xl font-bold font-mono text-blue-400">{formatTime(duration)}</div>

      {error && <div className="rounded-lg border border-rose-900/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">{error}</div>}

      <div className="flex items-center gap-4">
        {state === 'idle' && (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 rounded-full bg-blue-500 px-8 py-4 text-lg font-semibold text-white transition hover:bg-blue-400 shadow-lg"
          >
            🎤 开始录音
          </button>
        )}

        {state === 'recording' && (
          <>
            <button
              onClick={pauseRecording}
              className="rounded-full border border-yellow-500 bg-yellow-500/10 px-6 py-3 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-500/20"
            >
              ⏸ 暂停
            </button>
            <button
              onClick={stopRecording}
              className="rounded-full bg-red-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-400"
            >
              ⏹ 停止
            </button>
          </>
        )}

        {state === 'paused' && (
          <>
            <button
              onClick={resumeRecording}
              className="rounded-full bg-green-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-400"
            >
              ▶️ 继续
            </button>
            <button
              onClick={stopRecording}
              className="rounded-full bg-red-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-400"
            >
              ⏹ 停止
            </button>
          </>
        )}
      </div>

      <div className="text-center text-sm text-zinc-500">
        {state === 'recording' && '录音中...'}
        {state === 'paused' && '已暂停'}
        {state === 'idle' && duration > 0 && '录音已停止'}
        {state === 'stopping' && '正在处理...'}
      </div>
    </div>
  );
}

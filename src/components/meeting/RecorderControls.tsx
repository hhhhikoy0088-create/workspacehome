'use client';

import { useState } from 'react';

interface RecorderControlsProps {
  onRecordingStart: () => void;
  onRecordingPause: () => void;
  onRecordingResume: () => void;
  onRecordingStop: (audioBlob: Blob) => void;
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  error?: string;
}

export function RecorderControls({
  onRecordingStart,
  onRecordingPause,
  onRecordingResume,
  onRecordingStop,
  isRecording,
  isPaused,
  duration,
  error
}: RecorderControlsProps) {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [chunks, setChunks] = useState<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        audioChunks.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setChunks([]);
        onRecordingStop(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setChunks(audioChunks);
      onRecordingStart();
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.pause();
      onRecordingPause();
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.resume();
      onRecordingResume();
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/80 px-6 py-4">
        <div className="flex items-center gap-4">
          {isRecording && (
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-semibold text-red-400">{isPaused ? '已暂停' : '录音中'}</span>
            </div>
          )}
          <div className="text-3xl font-mono font-bold text-blue-400">{formatTime(duration)}</div>
        </div>

        <div className="flex items-center gap-3">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 rounded-lg bg-blue-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:opacity-50"
            >
              🎤 开始录音
            </button>
          ) : (
            <>
              {!isPaused ? (
                <button
                  onClick={pauseRecording}
                  className="rounded-lg border border-yellow-500 bg-yellow-500/10 px-4 py-2 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-500/20"
                >
                  ⏸ 暂停
                </button>
              ) : (
                <button
                  onClick={resumeRecording}
                  className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-400"
                >
                  ▶️ 继续
                </button>
              )}
              <button
                onClick={stopRecording}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
              >
                ⏹ 停止
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-900/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">{error}</div>}
    </div>
  );
}

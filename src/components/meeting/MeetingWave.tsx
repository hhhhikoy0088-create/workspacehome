'use client';

import { useEffect, useRef } from 'react';

interface MeetingWaveProps {
  isRecording: boolean;
  audioContext: AudioContext | null;
}

export function MeetingWave({ isRecording, audioContext }: MeetingWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRecording || !audioContext) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!analyserRef.current) {
      analyserRef.current = audioContext.createAnalyser();
      analyserRef.current.fftSize = 256;
    }

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      ctx.fillStyle = 'rgba(17, 24, 39, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      analyser.getByteFrequencyData(dataArray);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;

        const hue = (i / bufferLength) * 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 55%)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);

        x += barWidth;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, audioContext]);

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <canvas
        ref={canvasRef}
        width={300}
        height={100}
        className="rounded-lg border border-blue-500/30 bg-zinc-900/80 shadow-lg"
      />
      {isRecording && (
        <div className="flex items-center gap-2">
          <div className="relative h-3 w-3">
            <div className="absolute inset-0 rounded-full bg-red-500 animate-pulse" />
            <div className="absolute inset-0 rounded-full bg-red-400/50 animate-ping" />
          </div>
          <span className="text-sm text-red-400">录音中</span>
        </div>
      )}
    </div>
  );
}

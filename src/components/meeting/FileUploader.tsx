'use client';

import { useRef } from 'react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  progress?: number;
}

export function FileUploader({ onFileSelect, isLoading, progress }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && isAudioFile(file)) {
      onFileSelect(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isAudioFile(file)) {
      onFileSelect(file);
    }
  };

  const isAudioFile = (file: File): boolean => {
    const validTypes = ['audio/webm', 'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a'];
    return validTypes.some((type) => file.type.includes(type.split('/')[1])) ||
      file.name.match(/\.(mp3|wav|m4a|webm)$/i) !== null;
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-800/40 px-6 py-12 text-center transition hover:border-zinc-600 hover:bg-zinc-800/60 cursor-pointer"
      >
        <div className="text-5xl">🎙️</div>
        <p className="mt-4 text-lg font-semibold text-zinc-100">拖拽或点击上传音频</p>
        <p className="mt-2 text-sm text-zinc-400">支持 MP3、WAV、M4A、WebM 格式</p>
      </div>

      {progress !== undefined && progress > 0 && progress < 100 && (
        <div>
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span>上传中</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-800">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.webm"
        onChange={handleFileChange}
        disabled={isLoading}
        className="hidden"
      />
    </div>
  );
}

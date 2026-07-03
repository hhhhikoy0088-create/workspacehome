'use client';

import { useRef } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  error?: string;
}

export function FileUpload({ onFileSelect, isLoading, error }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/webm'];
      const isValid = validTypes.some((type) => file.type === type) || /\.(mp3|wav|m4a|webm)$/i.test(file.name);

      if (isValid) {
        onFileSelect(file);
      } else {
        alert('仅支持 MP3、WAV、M4A、WEBM 格式');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/webm'];
      const isValid = validTypes.some((type) => file.type === type) || /\.(mp3|wav|m4a|webm)$/i.test(file.name);
      if (isValid) {
        onFileSelect(file);
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-950/40 p-6 text-center transition hover:border-violet-500/50 hover:bg-zinc-900/50"
      >
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-violet-500/30 bg-violet-500/10 text-violet-300">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <div className="mt-3 text-sm font-semibold text-zinc-50">拖拽音频文件至此或点击上传</div>
        <div className="mt-1 text-xs text-zinc-500">支持 MP3、WAV、M4A、WEBM 格式</div>
      </div>

      {error && <div className="rounded-xl border border-rose-900/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">{error}</div>}

      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,.m4a,.webm,audio/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={isLoading}
      />
    </div>
  );
}

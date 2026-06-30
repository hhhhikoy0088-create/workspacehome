'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { WorkspaceShell } from '@/components/workspace-shell';
import { Recorder } from '@/components/meeting/Recorder';
import { FileUpload } from '@/components/meeting/FileUpload';
import { TranscriptPanel } from '@/components/meeting/TranscriptPanel';
import { SummaryPanel } from '@/components/meeting/SummaryPanel';
import { ExportToolbar } from '@/components/meeting/ExportToolbar';

type Tab = 'record' | 'upload' | 'text';

interface SummaryData {
  summary: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: Array<{
    task: string;
    owner: string;
    deadline: string;
  }>;
  teamMembers: string[];
  timeline: string;
  suggestions: string[];
}

export default function MeetingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('record');
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const processAudio = async (audioBlob: Blob) => {
    try {
      setError('');
      setIsLoading(true);
      setTranscript('');
      setSummary(null);

      // 上传并转录
      const formData = new FormData();
      formData.append('file', audioBlob);

      const transcribeResponse = await fetch('/api/meeting/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!transcribeResponse.ok) {
        const errorData = await transcribeResponse.json();
        throw new Error(errorData.error || '转录失败');
      }

      const { text } = await transcribeResponse.json();
      setTranscript(text);

      // 生成摘要
      const summaryResponse = await fetch('/api/meeting/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullText: text })
      });

      if (!summaryResponse.ok) {
        const errorData = await summaryResponse.json();
        throw new Error(errorData.error || '生成纪要失败');
      }

      const summaryData = await summaryResponse.json();
      setSummary(summaryData);
    } catch (err: any) {
      setError(err.message || '处理失败');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const handleRecordComplete = async (audioBlob: Blob) => {
    await processAudio(audioBlob);
  };

  const handleFileSelect = async (file: File) => {
    try {
      setError('');
      setIsLoading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', file);

      // 模拟进度
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/meeting/transcribe', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '转录失败');
      }

      const { text } = await response.json();
      setTranscript(text);

      // 生成摘要
      const summaryResponse = await fetch('/api/meeting/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullText: text })
      });

      if (!summaryResponse.ok) {
        throw new Error('生成纪要失败');
      }

      const summaryData = await summaryResponse.json();
      setSummary(summaryData);
    } catch (err: any) {
      setError(err.message || '上传失败');
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const handleTextSubmit = async () => {
    const text = textInputRef.current?.value.trim();
    if (!text) {
      setError('请输入会议文字内容');
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      setTranscript(text);

      // 直接生成摘要
      const response = await fetch('/api/meeting/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullText: text })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '生成纪要失败');
      }

      const summaryData = await response.json();
      setSummary(summaryData);
    } catch (err: any) {
      setError(err.message || '处理失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewMeeting = () => {
    setTranscript('');
    setSummary(null);
    setError('');
    setUploadProgress(0);
    setActiveTab('record');
    if (textInputRef.current) {
      textInputRef.current.value = '';
    }
  };

  return (
    <WorkspaceShell active="/meeting">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/office-hub"
          className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-800/60 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800"
        >
          <span>←</span>
          返回办公效率中心
        </Link>
      </div>

      <div className="panel">
        <h1 className="text-3xl font-semibold text-zinc-50">AI 会议纪要</h1>
        <p className="mt-2 text-sm text-zinc-400">
          实时转录 + AI 智能分析，生成专业会议纪要
        </p>
      </div>

      {/* Tab 切换 */}
      {!transcript && (
        <div className="flex gap-4 border-b border-zinc-800 pb-4">
          <button
            onClick={() => setActiveTab('record')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'record'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            🎤 实时录音
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'upload'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            📁 上传文件
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'text'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            📝 输入文字
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-900/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
          ⚠️ {error}
        </div>
      )}

      {/* 输入阶段 */}
      {!transcript && (
        <div className="panel">
          {activeTab === 'record' && (
            <Recorder onRecordComplete={handleRecordComplete} disabled={isLoading} />
          )}

          {activeTab === 'upload' && (
            <FileUpload
              onFileSelect={handleFileSelect}
              isLoading={isLoading}
              error={error}
            />
          )}

          {activeTab === 'text' && (
            <div className="flex flex-col gap-4">
              <textarea
                ref={textInputRef}
                placeholder="粘贴会议记录、笔记或转录文本..."
                className="w-full h-64 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 resize-none"
              />
              <button
                onClick={handleTextSubmit}
                disabled={isLoading}
                className="w-full rounded-lg bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '⏳ 生成中...' : '✨ 生成纪要'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 输出阶段 */}
      {transcript && (
        <div className="space-y-6">
          <ExportToolbar
            transcript={transcript}
            summary={summary}
            disabled={isLoading}
            onReset={handleNewMeeting}
          />

          <div className="grid gap-6 xl:grid-cols-2">
            <TranscriptPanel text={transcript} isLoading={isLoading} />
            <SummaryPanel data={summary} isLoading={isLoading} />
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}

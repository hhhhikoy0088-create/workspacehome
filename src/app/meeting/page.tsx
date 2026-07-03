'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { WorkspaceShell } from '@/components/workspace-shell';
import { Recorder } from '@/components/meeting/Recorder';
import { FileUpload } from '@/components/meeting/FileUpload';
import { TranscriptPanel } from '@/components/meeting/TranscriptPanel';
import { SummaryPanel } from '@/components/meeting/SummaryPanel';
import { ExportToolbar } from '@/components/meeting/ExportToolbar';
import { motion } from 'framer-motion';

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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'record', label: '实时录音' },
    { key: 'upload', label: '上传文件' },
    { key: 'text', label: '输入文字' },
  ];

  return (
    <WorkspaceShell active="/meeting">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-950 via-zinc-950 to-slate-950 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] md:p-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 shrink-0"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium tracking-[0.3em] text-violet-300/80">MEETING MINUTES</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">AI 会议纪要</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
                实时转录 + AI 智能分析，生成专业会议纪要。支持录音、上传音频、粘贴文字三种输入方式。
              </p>
            </div>
            <Link
              href="/office-hub"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-800/60 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800"
            >
              <span>←</span>
              返回
            </Link>
          </div>
        </motion.div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-2xl border border-rose-900/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Tab 切换 */}
          {!transcript && (
            <div className="mb-5 flex gap-2 border-b border-zinc-800 pb-3">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    activeTab === tab.key
                      ? 'border border-violet-500/30 bg-violet-500/10 text-violet-300'
                      : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* 输入阶段 */}
          {!transcript && (
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
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
                    className="h-64 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
                  />
                  <button
                    onClick={handleTextSubmit}
                    disabled={isLoading}
                    className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-3 font-semibold text-white transition hover:from-violet-400 hover:to-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? '生成中...' : '生成纪要'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 输出阶段 */}
          {transcript && (
            <div className="space-y-5">
              <ExportToolbar
                transcript={transcript}
                summary={summary}
                disabled={isLoading}
                onReset={handleNewMeeting}
              />

              <div className="grid gap-5 xl:grid-cols-2">
                <TranscriptPanel text={transcript} isLoading={isLoading} />
                <SummaryPanel data={summary} isLoading={isLoading} />
              </div>
            </div>
          )}
        </div>
      </div>
    </WorkspaceShell>
  );
}

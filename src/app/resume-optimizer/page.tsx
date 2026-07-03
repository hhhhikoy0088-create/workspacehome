'use client';

import { useState } from 'react';
import Link from 'next/link';
import { WorkspaceShell } from '@/components/workspace-shell';
import { ResumeUploader } from '@/components/resume/ResumeUploader';
import { AnalysisPanel } from '@/components/resume/AnalysisPanel';
import request from '@/api/request';
import { motion } from 'framer-motion';

interface ResumeAnalysis {
  atsScore: number | null;
  jobMatchRate: number | null;
  missingKeywords: string[];
  improvements: string[];
  skillsOptimization: {
    current: string[];
    recommended: string[];
    additions: string[];
  };
  projectsOptimization: Array<{
    title: string;
    suggestions: string[];
  }>;
  optimizedResume: string;
}

export default function ResumeOptimizerPage() {
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileUpload = async (file: File) => {
    try {
      setError('');
      setIsAnalyzing(true);
      setUploadProgress(0);
      setFileName(file.name);

      const formData = new FormData();
      formData.append('file', file);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 30;
        });
      }, 300);

      const result = await request.post('/resume/analyze', formData as any);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!result.success || !result.analysis) {
        throw new Error('分析失败：返回数据不完整');
      }

      const analysisData: ResumeAnalysis = {
        atsScore: result.analysis.atsScore ?? null,
        jobMatchRate: result.analysis.jobMatchRate ?? null,
        missingKeywords: result.analysis.missingKeywords || [],
        improvements: result.analysis.improvements || [],
        skillsOptimization: result.analysis.skillsOptimization || { current: [], recommended: [], additions: [] },
        projectsOptimization: result.analysis.projectsOptimization || [],
        optimizedResume: result.analysis.optimizedResume || ''
      };

      setAnalysis(analysisData);
      setIsAnalyzing(false);
    } catch (err: any) {
      setError(err.message || '分析失败，请重试');
      setIsAnalyzing(false);
    }
  };

  const handleGenerateNewResume = () => {
    alert('优化版简历已生成！\n\n您可以：\n1. 复制文本内容\n2. 导出为 Word 格式\n3. 导出为 PDF 格式');
  };

  return (
    <WorkspaceShell active="/office-hub">
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
              <p className="text-sm font-medium tracking-[0.3em] text-cyan-300/80">RESUME OPTIMIZER</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">AI 简历优化</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
                AI 驱动的简历分析和优化，提高求职成功率。上传简历即可获得 ATS 评分、岗位匹配度、缺失关键词及优化建议。
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
          {!analysis ? (
            <ResumeUploader
              onFileUpload={handleFileUpload}
              isAnalyzing={isAnalyzing}
              uploadProgress={uploadProgress}
            />
          ) : (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-50">分析结果</h2>
                  <p className="mt-1 text-sm text-zinc-500">文件：{fileName}</p>
                </div>
                <button
                  onClick={() => {
                    setAnalysis(null);
                    setFileName('');
                    setUploadProgress(0);
                  }}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800"
                >
                  ← 上传新简历
                </button>
              </div>

              <AnalysisPanel
                analysis={analysis}
                isGenerating={isAnalyzing}
                onGenerateNewResume={handleGenerateNewResume}
              />
            </div>
          )}
        </div>
      </div>
    </WorkspaceShell>
  );
}

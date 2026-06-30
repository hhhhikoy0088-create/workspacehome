'use client';

import { useState } from 'react';
import Link from 'next/link';
import { WorkspaceShell } from '@/components/workspace-shell';
import { ResumeUploader } from '@/components/resume/ResumeUploader';
import { AnalysisPanel } from '@/components/resume/AnalysisPanel';
import request from '@/api/request';

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

      // 真实调用后端 API，获取 AI 分析
      console.log('上传简历到后端:', file.name);
      
      const result = await request.post('/resume/analyze', formData as any);

      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log('后端返回:', result);

      if (!result.success || !result.analysis) {
        throw new Error('分析失败：返回数据不完整');
      }

      const analysis: ResumeAnalysis = {
        atsScore: result.analysis.atsScore ?? null,
        jobMatchRate: result.analysis.jobMatchRate ?? null,
        missingKeywords: result.analysis.missingKeywords || [],
        improvements: result.analysis.improvements || [],
        skillsOptimization: result.analysis.skillsOptimization || { current: [], recommended: [], additions: [] },
        projectsOptimization: result.analysis.projectsOptimization || [],
        optimizedResume: result.analysis.optimizedResume || ''
      };

      setAnalysis(analysis);
      setIsAnalyzing(false);

    } catch (err: any) {
      console.error('上传或分析错误:', err);
      setError(err.message || '分析失败，请重试');
      setIsAnalyzing(false);
    }
  };

  const handleGenerateNewResume = () => {
    alert('优化版简历已生成！\n\n您可以：\n1. 复制文本内容\n2. 导出为 Word 格式\n3. 导出为 PDF 格式');
  };

  return (
    <WorkspaceShell active="/office-hub">
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
        <h1 className="text-3xl font-semibold text-zinc-50">✨ AI 简历优化</h1>
        <p className="mt-2 text-sm text-zinc-400">
          AI 驱动的简历分析和优化，提高求职成功率
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-900/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
          ⚠️ {error}
        </div>
      )}

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
              <p className="mt-1 text-sm text-zinc-400">文件：{fileName}</p>
            </div>
            <button
              onClick={() => {
                setAnalysis(null);
                setFileName('');
                setUploadProgress(0);
              }}
              className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800"
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
    </WorkspaceShell>
  );
}

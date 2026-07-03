'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ResumeUploaderProps {
  onFileUpload: (file: File) => void;
  isAnalyzing: boolean;
  uploadProgress: number;
}

export function ResumeUploader({
  onFileUpload,
  isAnalyzing,
  uploadProgress
}: ResumeUploaderProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [validationError, setValidationError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    handleSelectedFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleSelectedFile(file);
    e.target.value = '';
  };

  const handleSelectedFile = (file?: File) => {
    if (!file) return;
    const error = getValidationError(file);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError('');
    onFileUpload(file);
  };

  const getValidationError = (file: File) => {
    const validTypes = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const validExtensions = ['.pdf', '.doc', '.docx'];
    const maxSize = 10 * 1024 * 1024;
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some((ext) => fileName.endsWith(ext));

    if (file.size > maxSize) return '文件过大，请上传 10MB 以内的简历文件。';
    if (!validTypes.includes(file.type) && !hasValidExtension) return '文件格式不支持，请上传 PDF、DOC 或 DOCX 格式。';
    return '';
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* 左侧上传区 */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl"
      >
        <h2 className="text-lg font-semibold text-zinc-50">上传简历</h2>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`mt-4 flex flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-300 ${
            isDragActive
              ? 'border-cyan-500 bg-cyan-500/5'
              : 'border-zinc-700 bg-zinc-950/40 hover:border-cyan-500/50 hover:bg-zinc-900/50'
          }`}
        >
          <motion.div
            animate={{ y: isDragActive ? -5 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
          </motion.div>

          <h3 className="mt-4 text-lg font-semibold text-zinc-100">
            {isAnalyzing ? '分析中...' : '拖放简历到这里'}
          </h3>

          <p className="mt-2 text-sm text-zinc-500">
            {isAnalyzing
              ? `进度: ${Math.round(uploadProgress)}%`
              : '支持 PDF、Word 格式，最大 10MB'}
          </p>

          {isAnalyzing ? (
            <motion.div className="mt-4 w-full max-w-xs">
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="mt-3 text-center text-xs text-zinc-500">正在 AI 分析中...</p>
            </motion.div>
          ) : (
            <>
              <button
                onClick={() => inputRef.current?.click()}
                className="mt-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-2.5 text-sm font-medium text-white transition hover:from-cyan-400 hover:to-blue-400"
              >
                选择文件
              </button>
              <p className="mt-2 text-xs text-zinc-600">或拖放到这里</p>
              {validationError ? (
                <p className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                  {validationError}
                </p>
              ) : null}
            </>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        {/* 支持格式 */}
        <div className="mt-5 space-y-2">
          <p className="text-xs font-medium text-zinc-400">支持的格式</p>
          <div className="flex flex-wrap gap-2">
            {['PDF', 'Word', 'DOCX'].map((format) => (
              <div
                key={format}
                className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300"
              >
                {format}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 右侧功能说明 */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="space-y-4"
      >
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-zinc-50">AI 分析功能</h3>
          <div className="mt-4 space-y-3">
            {[
              { title: 'ATS 评分', desc: '根据招聘系统算法评估简历质量' },
              { title: '岗位匹配度', desc: '与目标岗位的匹配程度分析' },
              { title: '缺失关键词', desc: '识别简历中缺少的核心关键词' },
              { title: '优化建议', desc: 'AI 提供具体的改进方案' },
              { title: '技能优化', desc: '推荐补充的技能和认证' },
              { title: '项目优化', desc: '如何更好地展示你的项目成果' }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-xs font-mono font-medium text-cyan-300">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-100">{item.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#67e8f9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3h12l4 6-10 13L2 9z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-zinc-50">Pro 功能</p>
              <p className="mt-1 text-xs text-zinc-400">
                获得个性化建议、下载优化版简历、追踪申请进度
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

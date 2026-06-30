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

  // 仅在客户端渲染后启用交互
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
    debugger
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
        className="panel flex flex-col"
      >
        <h2 className="text-lg font-semibold text-zinc-50 mb-4">📄 上传简历</h2>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`flex-1 rounded-xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-8 cursor-pointer ${
            isDragActive
              ? 'border-blue-500 bg-blue-500/5'
              : 'border-zinc-700 bg-zinc-900/30 hover:border-blue-500/50 hover:bg-zinc-900/50'
          }`}
        >
          <motion.div
            animate={{ y: isDragActive ? -5 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="text-5xl mb-3">📤</div>
          </motion.div>

          <h3 className="text-lg font-semibold text-zinc-100 text-center mb-2">
            {isAnalyzing ? '分析中...' : '拖放简历到这里'}
          </h3>

          <p className="text-sm text-zinc-400 text-center mb-4">
            {isAnalyzing
              ? `进度: ${uploadProgress}%`
              : '支持 PDF、Word 格式，最大 10MB'}
          </p>

          {isAnalyzing ? (
            <motion.div className="w-full max-w-xs">
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-zinc-500 text-center mt-3">正在 AI 分析中...</p>
            </motion.div>
          ) : (
            <>
              <button
                onClick={() => inputRef.current?.click()}
                className="px-6 py-2 rounded-lg bg-blue-500 text-white font-medium transition hover:bg-blue-400 mb-3"
              >
                选择文件
              </button>

              <p className="text-xs text-zinc-500">或点击选择，或拖放到这里</p>
              {validationError ? (
                <p className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
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

        {/* 支持格式说明 */}
        <div className="mt-6 space-y-3">
          <p className="text-xs font-semibold text-zinc-400">✓ 支持的格式</p>
          <div className="flex flex-wrap gap-2">
            {['PDF', 'Word', 'DOCX'].map((format) => (
              <div
                key={format}
                className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300"
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
        <div className="panel">
          <h3 className="text-lg font-semibold text-zinc-50 mb-4">🤖 AI 分析功能</h3>
          <div className="space-y-3">
            {[
              { icon: '🎯', title: 'ATS 评分', desc: '根据招聘系统算法评估简历质量' },
              { icon: '📊', title: '岗位匹配度', desc: '与目标岗位的匹配程度分析' },
              { icon: '🔑', title: '缺失关键词', desc: '识别简历中缺少的核心关键词' },
              { icon: '💡', title: '优化建议', desc: 'AI 提供具体的改进方案' },
              { icon: '🛠️', title: '技能优化', desc: '推荐补充的技能和认证' },
              { icon: '📈', title: '项目优化', desc: '如何更好地展示你的项目成果' }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="flex gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700"
              >
                <span className="text-xl shrink-0">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{item.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="panel bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💎</span>
            <div>
              <p className="font-semibold text-zinc-50">Pro 功能</p>
              <p className="text-xs text-zinc-400 mt-1">
                获得个性化建议、下载优化版简历、追踪申请进度
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

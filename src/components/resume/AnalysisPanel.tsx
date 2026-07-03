'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

interface AnalysisPanelProps {
  analysis: ResumeAnalysis;
  isGenerating: boolean;
  onGenerateNewResume: () => void;
}

function AnalysisCard({
  title,
  children,
  defaultExpanded = true
}: {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <motion.div
      layout
      className="cursor-pointer rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:border-zinc-700/80"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-50">{title}</h3>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-zinc-500"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </motion.div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 border-t border-zinc-800 pt-4"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ScoreCircle({ score, label, max = 100 }: { score: number | null; label: string; max?: number }) {
  const safeScore = typeof score === 'number' ? score : 0;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (safeScore / max) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" className="mb-2">
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="rgb(39, 39, 42)"
          strokeWidth="4"
        />
        <motion.circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="#06b6d4"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          strokeLinecap="round"
        />
      </svg>
      <motion.div
        className="text-3xl font-bold text-cyan-300"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        {score}
      </motion.div>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

export function AnalysisPanel({
  analysis,
  isGenerating,
  onGenerateNewResume
}: AnalysisPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* 顶部评分卡片 */}
      <div className="grid gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center rounded-2xl border border-zinc-800/80 bg-zinc-900/60 py-8 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl"
        >
          <ScoreCircle score={analysis.atsScore} label="ATS 评分" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center justify-center rounded-2xl border border-zinc-800/80 bg-zinc-900/60 py-8 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl"
        >
          <ScoreCircle score={analysis.jobMatchRate} label="岗位匹配度" />
        </motion.div>
      </div>

      {/* 缺失关键词 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <AnalysisCard title="缺失关键词">
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              这些关键词在你的简历中缺失，建议补充以提高 ATS 匹配度：
            </p>
            <div className="flex flex-wrap gap-2">
              {analysis.missingKeywords.map((keyword, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-sm font-medium text-amber-300"
                >
                  + {keyword}
                </motion.div>
              ))}
            </div>
          </div>
        </AnalysisCard>
      </motion.div>

      {/* AI 修改建议 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <AnalysisCard title="AI 修改建议">
          <div className="space-y-2">
            {analysis.improvements.map((improvement, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-start gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3"
              >
                <span className="font-mono text-sm font-semibold text-cyan-400">{idx + 1}</span>
                <p className="text-sm text-zinc-300">{improvement}</p>
              </motion.div>
            ))}
          </div>
        </AnalysisCard>
      </motion.div>

      {/* 技能优化 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <AnalysisCard title="技能优化">
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-xs font-semibold text-zinc-400">已有技能</p>
              <div className="flex flex-wrap gap-2">
                {analysis.skillsOptimization.current.map((skill, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300"
                  >
                    {skill}
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-zinc-400">推荐补充</p>
              <div className="flex flex-wrap gap-2">
                {analysis.skillsOptimization.recommended.map((skill, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="rounded-full border border-violet-500/40 bg-violet-500/15 px-3 py-1 text-xs text-violet-300"
                  >
                    {skill}
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-zinc-400">增强竞争力</p>
              <div className="flex flex-wrap gap-2">
                {analysis.skillsOptimization.additions.map((skill, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="rounded-full border border-cyan-500/40 bg-cyan-500/15 px-3 py-1 text-xs text-cyan-300"
                  >
                    {skill}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </AnalysisCard>
      </motion.div>

      {/* 项目经历优化 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <AnalysisCard title="项目经历优化" defaultExpanded={false}>
          <div className="space-y-4">
            {analysis.projectsOptimization.map((project, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
              >
                <h4 className="mb-3 font-semibold text-zinc-100">{project.title}</h4>
                <ul className="space-y-2">
                  {project.suggestions.map((suggestion, sidx) => (
                    <motion.li
                      key={sidx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: sidx * 0.05 }}
                      className="flex items-start gap-2 text-sm text-zinc-300"
                    >
                      <span className="shrink-0 text-cyan-400">→</span>
                      <span>{suggestion}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </AnalysisCard>
      </motion.div>

      {/* 生成新简历按钮 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <button
          onClick={onGenerateNewResume}
          disabled={isGenerating}
          className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4 text-lg font-semibold text-white transition hover:from-cyan-400 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              生成中...
            </span>
          ) : (
            '下载优化后的简历'
          )}
        </button>
      </motion.div>

      {/* 优化版本预览 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <AnalysisCard title="优化版本预览" defaultExpanded={false}>
          <div className="max-h-96 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <pre className="whitespace-pre-wrap break-words font-mono text-xs text-zinc-300">
              {analysis.optimizedResume}
            </pre>
          </div>
        </AnalysisCard>
      </motion.div>
    </motion.div>
  );
}

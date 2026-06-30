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
  icon,
  children,
  defaultExpanded = true
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <motion.div
      layout
      className="panel cursor-pointer transition"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-zinc-500"
        >
          ▼
        </motion.div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 pt-4 border-t border-zinc-800"
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
  const hue = (safeScore / max) * 120;

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" className="mb-2">
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="rgb(39, 39, 42)"
          strokeWidth="3"
        />
        <motion.circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke={`hsl(${hue}, 100%, 50%)`}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          strokeLinecap="round"
        />
      </svg>
      <motion.div
        className="text-3xl font-bold text-zinc-100"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        {score}
      </motion.div>
      <p className="text-xs text-zinc-400 mt-1">{label}</p>
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
          className="panel flex items-center justify-center py-8"
        >
          <ScoreCircle score={analysis.atsScore} label="ATS 评分" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="panel flex items-center justify-center py-8"
        >
          <ScoreCircle score={analysis.jobMatchRate} label="岗位匹配度" />
        </motion.div>
      </div>

      {/* 缺失关键词卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <AnalysisCard title="缺失关键词" icon="🔑">
          <div className="space-y-3">
            <p className="text-sm text-zinc-400 mb-3">
              这些关键词在你的简历中缺失，建议补充以提高 ATS 匹配度：
            </p>
            <div className="flex flex-wrap gap-2">
              {analysis.missingKeywords.map((keyword, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-sm text-amber-300 font-medium"
                >
                  + {keyword}
                </motion.div>
              ))}
            </div>
          </div>
        </AnalysisCard>
      </motion.div>

      {/* AI 修改建议卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <AnalysisCard title="AI 修改建议" icon="💡" defaultExpanded={true}>
          <div className="space-y-2">
            {analysis.improvements.map((improvement, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30"
              >
                <span className="text-blue-400 font-semibold shrink-0">{idx + 1}</span>
                <p className="text-sm text-zinc-300">{improvement}</p>
              </motion.div>
            ))}
          </div>
        </AnalysisCard>
      </motion.div>

      {/* 技能优化卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <AnalysisCard title="技能优化" icon="🛠️">
          <div className="space-y-6">
            {/* 当前技能 */}
            <div>
              <p className="text-xs font-semibold text-zinc-400 mb-2">✓ 已有技能</p>
              <div className="flex flex-wrap gap-2">
                {analysis.skillsOptimization.current.map((skill, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="px-3 py-1 rounded-full bg-green-500/20 border border-green-500/50 text-xs text-green-300"
                  >
                    {skill}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* 推荐技能 */}
            <div>
              <p className="text-xs font-semibold text-zinc-400 mb-2">⭐ 推荐补充</p>
              <div className="flex flex-wrap gap-2">
                {analysis.skillsOptimization.recommended.map((skill, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/50 text-xs text-purple-300"
                  >
                    {skill}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* 额外技能 */}
            <div>
              <p className="text-xs font-semibold text-zinc-400 mb-2">✨ 增强竞争力</p>
              <div className="flex flex-wrap gap-2">
                {analysis.skillsOptimization.additions.map((skill, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/50 text-xs text-cyan-300"
                  >
                    {skill}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </AnalysisCard>
      </motion.div>

      {/* 项目经历优化卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <AnalysisCard title="项目经历优化" icon="📈" defaultExpanded={false}>
          <div className="space-y-4">
            {analysis.projectsOptimization.map((project, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700"
              >
                <h4 className="font-semibold text-zinc-100 mb-3">{project.title}</h4>
                <ul className="space-y-2">
                  {project.suggestions.map((suggestion, sidx) => (
                    <motion.li
                      key={sidx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: sidx * 0.05 }}
                      className="flex items-start gap-2 text-sm text-zinc-300"
                    >
                      <span className="text-blue-400 shrink-0">→</span>
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
          className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4 text-lg font-semibold text-white transition hover:from-blue-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {isGenerating ? (
            <motion.div className="flex items-center justify-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
              生成中...
            </motion.div>
          ) : (
            '✨ 下载优化后的简历'
          )}
        </button>
      </motion.div>

      {/* 预览简历内容 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <AnalysisCard title="优化版本预览" icon="👁️" defaultExpanded={false}>
          <div className="max-h-96 overflow-y-auto p-4 rounded-lg bg-zinc-900 border border-zinc-800">
            <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap break-words">
              {analysis.optimizedResume}
            </pre>
          </div>
        </AnalysisCard>
      </motion.div>
    </motion.div>
  );
}

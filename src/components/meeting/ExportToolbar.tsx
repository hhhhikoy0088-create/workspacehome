'use client';

import { useState } from 'react';

interface ExportToolbarProps {
  transcript: string;
  summary: any;
  disabled?: boolean;
  onReset?: () => void;
}

export function ExportToolbar({
  transcript,
  summary,
  disabled,
  onReset
}: ExportToolbarProps) {
  const [exporting, setExporting] = useState(false);

  const generateMarkdown = (): string => {
    const timestamp = new Date().toLocaleString('zh-CN');

    let md = `# 会议纪要\n\n**生成时间**: ${timestamp}\n\n`;

    if (summary) {
      md += `## 会议摘要\n${summary.summary || ''}\n\n`;

      if (summary.keyPoints?.length) {
        md += `## 重点讨论\n${summary.keyPoints.map((p: string) => `- ${p}`).join('\n')}\n\n`;
      }

      if (summary.decisions?.length) {
        md += `## 决策事项\n${summary.decisions.map((d: string) => `- ${d}`).join('\n')}\n\n`;
      }

      if (summary.actionItems?.length) {
        md += `## 待办事项\n`;
        summary.actionItems.forEach((item: any) => {
          md += `- [ ] ${item.task} (责任人: ${item.owner}, 截止: ${item.deadline})\n`;
        });
        md += '\n';
      }

      if (summary.suggestions?.length) {
        md += `## AI 建议\n${summary.suggestions.map((s: string) => `- ${s}`).join('\n')}\n\n`;
      }
    }

    md += `## 会议全文\n\`\`\`\n${transcript}\n\`\`\`\n`;

    return md;
  };

  const generateWord = (): string => {
    const timestamp = new Date().toLocaleString('zh-CN');

    let html = `<html><head><meta charset="utf-8"><style>
      body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
      h1 { color: #1a1a1a; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px; }
      h2 { color: #8b5cf6; margin-top: 20px; }
      table { border-collapse: collapse; width: 100%; margin: 10px 0; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f8f9fa; }
      li { margin: 5px 0; }
      .meta { color: #666; font-size: 12px; margin: 10px 0; }
    </style></head><body>`;

    html += `<h1>会议纪要</h1>`;
    html += `<p class="meta"><strong>生成时间</strong>: ${timestamp}</p>`;

    if (summary) {
      if (summary.summary) {
        html += `<h2>会议摘要</h2><p>${summary.summary}</p>`;
      }

      if (summary.keyPoints?.length) {
        html += `<h2>重点讨论</h2><ul>`;
        summary.keyPoints.forEach((p: string) => {
          html += `<li>${p}</li>`;
        });
        html += `</ul>`;
      }

      if (summary.decisions?.length) {
        html += `<h2>决策事项</h2><ul>`;
        summary.decisions.forEach((d: string) => {
          html += `<li>${d}</li>`;
        });
        html += `</ul>`;
      }

      if (summary.actionItems?.length) {
        html += `<h2>待办事项</h2><table>`;
        html += `<tr><th>任务</th><th>负责人</th><th>截止时间</th></tr>`;
        summary.actionItems.forEach((item: any) => {
          html += `<tr><td>${item.task}</td><td>${item.owner}</td><td>${item.deadline}</td></tr>`;
        });
        html += `</table>`;
      }

      if (summary.suggestions?.length) {
        html += `<h2>AI 建议</h2><ul>`;
        summary.suggestions.forEach((s: string) => {
          html += `<li>${s}</li>`;
        });
        html += `</ul>`;
      }
    }

    html += `<h2>会议全文</h2><p>${transcript.replace(/\n/g, '<br>')}</p>`;
    html += `</body></html>`;

    return html;
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = async () => {
    setExporting(true);
    try {
      const md = generateMarkdown();
      downloadFile(md, `会议纪要-${Date.now()}.md`, 'text/markdown');
    } finally {
      setExporting(false);
    }
  };

  const handleExportWord = async () => {
    setExporting(true);
    try {
      const html = generateWord();
      downloadFile(html, `会议纪要-${Date.now()}.doc`, 'application/msword');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </span>
        会议已处理完成 · 全文 {transcript.length} 字符
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleExportMarkdown}
          disabled={disabled || exporting || !transcript}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          {exporting ? '导出中...' : '导出 Markdown'}
        </button>

        <button
          onClick={handleExportWord}
          disabled={disabled || exporting || !transcript}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          {exporting ? '导出中...' : '导出 Word'}
        </button>

        {onReset && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300 transition hover:border-violet-500/50 hover:bg-violet-500/20"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            新建会议
          </button>
        )}
      </div>
    </div>
  );
}

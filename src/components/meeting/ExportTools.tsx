'use client';

import { useState } from 'react';

interface ExportToolsProps {
  transcript: string;
  summary: any;
  disabled?: boolean;
}

export function ExportTools({ transcript, summary, disabled }: ExportToolsProps) {
  const [exporting, setExporting] = useState(false);

  const generateMarkdown = (): string => {
    const timestamp = new Date().toLocaleString('zh-CN');
    
    let md = `# 会议纪要\n\n**生成时间**: ${timestamp}\n\n`;

    if (summary) {
      md += `## 会议摘要\n${summary.summary}\n\n`;

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
    
    let html = `<html><head><meta charset="utf-8"></head><body>`;
    html += `<h1>会议纪要</h1>`;
    html += `<p><strong>生成时间</strong>: ${timestamp}</p>`;

    if (summary) {
      html += `<h2>会议摘要</h2><p>${summary.summary}</p>`;

      if (summary.keyPoints?.length) {
        html += `<h2>重点讨论</h2><ul>`;
        summary.keyPoints.forEach((p: string) => {
          html += `<li>${p}</li>`;
        });
        html += `</ul>`;
      }

      if (summary.actionItems?.length) {
        html += `<h2>待办事项</h2><table border="1">`;
        html += `<tr><th>任务</th><th>负责人</th><th>截止时间</th></tr>`;
        summary.actionItems.forEach((item: any) => {
          html += `<tr><td>${item.task}</td><td>${item.owner}</td><td>${item.deadline}</td></tr>`;
        });
        html += `</table>`;
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
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={handleExportMarkdown}
        disabled={disabled || exporting || !transcript}
        className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        📝 {exporting ? '导出中...' : '导出 Markdown'}
      </button>

      <button
        onClick={handleExportWord}
        disabled={disabled || exporting || !transcript}
        className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        📄 {exporting ? '导出中...' : '导出 Word'}
      </button>
    </div>
  );
}

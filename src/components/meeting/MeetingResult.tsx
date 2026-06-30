'use client';

import { useState } from 'react';
import { MeetingToolbar } from './MeetingToolbar';

interface MeetingResultProps {
  summary: string;
  keyPoints: string;
  actionItems: string;
  teamMembers: string;
  timeline: string;
  suggestions: string;
  onShareToKnowledge: (content: string) => void;
}

export function MeetingResult({
  summary,
  keyPoints,
  actionItems,
  teamMembers,
  timeline,
  suggestions,
  onShareToKnowledge
}: MeetingResultProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const fullContent = `会议纪要
生成时间：${new Date().toLocaleString()}

会议摘要
${summary}

重点讨论
${keyPoints}

Action Items
${actionItems}

人员分工
${teamMembers}

时间节点
${timeline}

AI建议
${suggestions}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullContent);
    setCopiedIndex(0);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownloadWord = () => {
    const docContent = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>会议纪要</w:t></w:r></w:p>
    <w:p><w:r><w:t>${summary}</w:t></w:r></w:p>
  </w:body>
</w:document>`;
    const blob = new Blob([docContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    downloadFile(blob, 'meeting-notes.docx');
  };

  const handleDownloadMarkdown = () => {
    const mdContent = fullContent;
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    downloadFile(blob, 'meeting-notes.md');
  };

  const handleDownloadPDF = () => {
    const pdfContent = fullContent;
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    downloadFile(blob, 'meeting-notes.pdf');
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cards = [
    { title: '会议摘要', content: summary, icon: '📋' },
    { title: '重点讨论', content: keyPoints, icon: '💡' },
    { title: 'Action Items', content: actionItems, icon: '✓' },
    { title: '人员分工', content: teamMembers, icon: '👥' },
    { title: '时间节点', content: timeline, icon: '⏱️' },
    { title: 'AI建议', content: suggestions, icon: '🎯' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-50">会议纪要已生成</h2>
        <MeetingToolbar
          onDownloadWord={handleDownloadWord}
          onDownloadMarkdown={handleDownloadMarkdown}
          onDownloadPDF={handleDownloadPDF}
          onCopy={handleCopy}
          onShareToKnowledge={() => onShareToKnowledge(fullContent)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card, i) => (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-panel backdrop-blur-2xl">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <span className="text-2xl">{card.icon}</span>
              <h3 className="text-base font-semibold text-zinc-50">{card.title}</h3>
            </div>
            <div className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
              {card.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

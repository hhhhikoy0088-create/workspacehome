'use client';

import { useState } from 'react';

interface MeetingToolbarProps {
  onDownloadWord: () => void;
  onDownloadMarkdown: () => void;
  onDownloadPDF: () => void;
  onCopy: () => void;
  onShareToKnowledge: () => void;
  disabled?: boolean;
}

export function MeetingToolbar({
  onDownloadWord,
  onDownloadMarkdown,
  onDownloadPDF,
  onCopy,
  onShareToKnowledge,
  disabled = false
}: MeetingToolbarProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onCopy}
        disabled={disabled}
        className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
        title="复制到剪贴板"
      >
        📋 复制
      </button>

      <button
        onClick={onShareToKnowledge}
        disabled={disabled}
        className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
        title="分享到知识库"
      >
        📚 分享到知识库
      </button>

      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          disabled={disabled}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ⬇️ 下载 {showMenu ? '▲' : '▼'}
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-2 w-48 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl z-10 overflow-hidden">
            <button
              onClick={() => {
                onDownloadWord();
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-sm text-zinc-200 hover:bg-zinc-800 transition flex items-center gap-2"
            >
              📄 Word (.docx)
            </button>
            <button
              onClick={() => {
                onDownloadMarkdown();
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-sm text-zinc-200 hover:bg-zinc-800 transition flex items-center gap-2"
            >
              📝 Markdown (.md)
            </button>
            <button
              onClick={() => {
                onDownloadPDF();
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-sm text-zinc-200 hover:bg-zinc-800 transition flex items-center gap-2"
            >
              📕 PDF (.pdf)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

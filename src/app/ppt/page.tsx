'use client';

import Link from 'next/link';
import { useState } from 'react';
import { WorkspaceShell } from '@/components/workspace-shell';
import request from '@/api/request';
import { motion } from 'framer-motion';

type PPTDocument = {
  id: string;
  title: string;
  theme: 'dark' | 'light' | 'purple';
  slides: Array<
    | { type: 'hero'; title: string; subtitle?: string; background?: string }
    | { type: 'text'; title: string; content: string[] }
    | { type: 'cards'; title: string; items: { title: string; desc: string }[] }
  >;
};

type ParsedFile = { title?: string; text?: string; summary?: string; keywords?: string[]; fileType?: string; paragraphs?: string[] };

const fallbackDoc: PPTDocument = { id: 'fallback', title: 'PPT', theme: 'dark', slides: [{ type: 'hero', title: 'PPT 系统初始化成功', subtitle: 'fallback mode active' }] };
const fileTypes = ['PDF', 'Word', 'Markdown', '纯文本'];
const pptTypes = ['答辩PPT', '商业计划书', '工作汇报', '课程作业'];

const guizangStyles = [
  { key: 'magazine', name: '电子杂志风', desc: '衬线字体 · 优雅排版 · 渐变背景' },
  { key: 'swiss', name: '瑞士国际主义', desc: '无衬线粗体 · 网格系统 · 高对比色块' },
];

const magazineThemes = [
  { key: 'ink', name: '墨水经典', color: '#0a0a0b', desc: '黑白经典' },
  { key: 'indigo', name: '靛蓝瓷', color: '#0a1f3d', desc: '科技研究' },
  { key: 'forest', name: '森林墨', color: '#1a2e1f', desc: '自然文化' },
  { key: 'kraft', name: '牛皮纸', color: '#2a1e13', desc: '怀旧人文' },
  { key: 'dune', name: '沙丘', color: '#1f1a14', desc: '艺术设计' },
  { key: 'cinnabar', name: '朱砂红', color: '#3d0a0a', desc: '中国红' },
  { key: 'lavender', name: '暮紫', color: '#1e1433', desc: '优雅浪漫' },
  { key: 'slate', name: '鸦青', color: '#1c2433', desc: '冷峻商务' },
];

const swissThemes = [
  { key: 'ikb', name: '克莱因蓝', color: '#002FA7', desc: '科技通用' },
  { key: 'lemon', name: '柠檬黄', color: '#FFD500', desc: '年轻活力' },
  { key: 'neon', name: '荧光绿', color: '#39FF14', desc: '未来生态' },
  { key: 'orange', name: '安全橙', color: '#FF6B35', desc: '工业运动' },
  { key: 'burgundy', name: '勃艮第红', color: '#800020', desc: '高端品牌' },
  { key: 'mint', name: '薄荷青', color: '#4ECDC4', desc: '清新健康' },
  { key: 'coral', name: '珊瑚粉', color: '#FF6F61', desc: '温暖创意' },
  { key: 'charcoal', name: '炭黑金', color: '#1a1a1a', desc: '金融高端' },
];

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' as const }
};

export default function PptPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [doc, setDoc] = useState<PPTDocument>(fallbackDoc);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<'idle' | 'upload' | 'generate' | 'pptx' | 'pdf' | 'html'>('idle');
  const [pptType, setPptType] = useState(pptTypes[0]);
  const [pages, setPages] = useState(15);
  const [dragOver, setDragOver] = useState(false);
  const [htmlStyle, setHtmlStyle] = useState<'magazine' | 'swiss'>('magazine');
  const [htmlTheme, setHtmlTheme] = useState('ink');

  const onUpload = async (file?: File | null) => {
    if (!file) return;
    setLoading('upload');
    setError('');
    try {
      setSelectedFile(file);
      setFileName(file.name);
      const form = new FormData();
      form.append('file', file);
      const uploaded = await request.post('/ppt/upload', form as any);
      if (uploaded?.pages) setPages(Number(uploaded.pages));
      if (uploaded?.fileId) {
        const parsed = await request.post('/ppt/parse', { fileId: uploaded.fileId });
        setParsedFile(parsed);
      }
    } catch (e: any) {
      setError(e?.message || '上传失败');
    } finally {
      setLoading('idle');
    }
  };

  const generate = async () => {
    setLoading('generate');
    setError('');
    try {
      const data = await request.post('/ppt/generate', {
        input: parsedFile?.summary || parsedFile?.text || fileName,
        pptType,
        pages,
        parsedFile,
        sourceFileName: fileName || selectedFile?.name || '',
      });
      setDoc(data.document || fallbackDoc);
    } catch (e: any) {
      setDoc(fallbackDoc);
      setError(e?.message || '生成失败');
    } finally {
      setLoading('idle');
    }
  };

  const API_BASE = '/api';

  const downloadBinary = async (path: string, payload: any, name: string) => {
    const response = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`下载失败：${response.status} ${text.slice(0, 200)}`);
    }
    const blob = await response.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportPptx = async () => { setLoading('pptx'); setError(''); try { await downloadBinary('/ppt/export-pptx-python', { outline: doc, sourceFileName: fileName }, `${doc.title}.pptx`); } catch (e: any) { setError(e?.message || 'PPT 下载失败'); } finally { setLoading('idle'); } };
  const exportPdf = async () => { setLoading('pdf'); setError(''); try { await downloadBinary('/ppt/export-pdf', { outline: doc, sourceFileName: fileName }, `${doc.title}.pdf`); } catch (e: any) { setError(e?.message || 'PDF 下载失败'); } finally { setLoading('idle'); } };
  const exportHtml = async () => { setLoading('html'); setError(''); try { await downloadBinary('/ppt/export-html', { outline: doc, style: htmlStyle, theme: htmlTheme, sourceFileName: fileName }, `${doc.title}.html`); } catch (e: any) { setError(e?.message || 'HTML 下载失败'); } finally { setLoading('idle'); } };

  const currentThemes = htmlStyle === 'magazine' ? magazineThemes : swissThemes;

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
              <p className="text-sm font-medium tracking-[0.3em] text-indigo-300/80">AI PPT ASSISTANT</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">AI PPT 助手</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
                一句话生成大纲，自动配图、排版与动画，支持在线演示。多风格导出，一键生成专业 PPT。
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

        {/* Content */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto">
          {error && (
            <div className="rounded-2xl border border-rose-900/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          {/* 上传 + 设置 */}
          <div className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
            {/* 上传区 */}
            <motion.section
              {...fadeUp}
              className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl"
            >
              <div
                onClick={() => document.getElementById('ppt-file-input')?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); onUpload(e.dataTransfer.files?.[0]); }}
                className={`flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all duration-300 ${
                  dragOver
                    ? 'border-indigo-500 bg-indigo-500/5 scale-[1.01]'
                    : selectedFile
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-zinc-700/80 bg-zinc-950/40 hover:border-zinc-600 hover:bg-zinc-900/50'
                }`}
              >
                <div className={`grid h-14 w-14 place-items-center rounded-2xl border transition-all duration-300 ${
                  dragOver ? 'border-indigo-500/40 bg-indigo-500/10 scale-110' : selectedFile ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-zinc-700 bg-zinc-900/60'
                }`}>
                  {selectedFile ? (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  ) : (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  )}
                </div>

                <h2 className={`mt-4 text-xl font-semibold transition-colors ${selectedFile ? 'text-emerald-400' : 'text-zinc-100'}`}>
                  {selectedFile ? '文件已就绪' : '上传内容文件'}
                </h2>
                <p className="mt-2 text-sm text-zinc-500">支持 PDF · Word · Markdown · 纯文本</p>

                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {fileTypes.map((type) => (
                    <span key={type} className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-xs text-zinc-500">
                      {type}
                    </span>
                  ))}
                </div>

                <input id="ppt-file-input" type="file" accept=".pdf,.docx,.md,.txt,.pptx" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} />

                <div className="mt-4 flex items-center gap-2 text-sm">
                  {loading === 'upload' ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-indigo-400" />
                      <span className="text-zinc-400">正在解析文件内容...</span>
                    </>
                  ) : selectedFile ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      <span className="font-medium text-emerald-400">{selectedFile.name}</span>
                    </>
                  ) : (
                    <span className="text-zinc-600">拖拽文件到此处，或点击上传</span>
                  )}
                </div>
              </div>

              {parsedFile && parsedFile.summary && (
                <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    文件内容摘要
                  </div>
                  <p className="line-clamp-3 text-sm leading-relaxed text-zinc-400">{parsedFile.summary}</p>
                  {parsedFile.keywords && parsedFile.keywords.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {parsedFile.keywords.slice(0, 6).map((kw) => (
                        <span key={kw} className="rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 text-[11px] text-zinc-500">{kw}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.section>

            {/* 设置面板 */}
            <motion.section
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.05 }}
              className="flex flex-col gap-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg border border-indigo-500/30 bg-indigo-500/10">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v10"/><path d="M21 12h-6m-6 0H1"/></svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-50">PPT 设置</h2>
                  <p className="text-xs text-zinc-500">配置生成参数与视觉风格</p>
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">PPT 类型</p>
                <div className="flex flex-wrap gap-2">
                  {pptTypes.map((item) => (
                    <button
                      key={item}
                      onClick={() => setPptType(item)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                        pptType === item
                          ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                          : 'border border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">输出页数</p>
                  <span className="font-mono text-sm font-semibold text-indigo-400">{pages} 页</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="30"
                  value={pages}
                  onChange={(e) => setPages(Number(e.target.value))}
                  className="h-2 w-full appearance-none rounded-full bg-zinc-800 outline-none"
                  style={{ accentColor: '#6366f1' }}
                />
                <div className="mt-2 flex justify-between text-[11px] text-zinc-600">
                  <span>3</span>
                  <span>15</span>
                  <span>30</span>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">HTML 导出风格</p>
                  <span className="rounded-md border border-violet-500/20 bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-400">Guizang</span>
                </div>
                <div className="mb-4 flex gap-2">
                  {guizangStyles.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => {
                        setHtmlStyle(s.key as 'magazine' | 'swiss');
                        setHtmlTheme(s.key === 'magazine' ? 'ink' : 'ikb');
                      }}
                      className={`flex-1 rounded-lg border p-3 text-left transition-all ${
                        htmlStyle === s.key
                          ? 'border-violet-500/30 bg-violet-500/[0.06]'
                          : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-sm font-medium text-zinc-200">{s.name}</div>
                      <div className="mt-0.5 text-[10px] text-zinc-500">{s.desc}</div>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentThemes.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setHtmlTheme(t.key)}
                      className={`group flex items-center gap-2 rounded-lg border px-3 py-2 transition-all ${
                        htmlTheme === t.key
                          ? 'border-zinc-600 bg-zinc-800 ring-1 ring-zinc-500'
                          : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'
                      }`}
                    >
                      <div className="h-4 w-4 rounded-full border border-zinc-700" style={{ backgroundColor: t.color }} />
                      <span className="text-xs text-zinc-300">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.section>
          </div>

          {/* 操作区 */}
          <motion.section
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.1 }}
            className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-1.5">
                {[
                  { label: '上传文件', done: !!selectedFile },
                  { label: '生成大纲', done: doc.id !== 'fallback' },
                  { label: '导出 PPT', done: false },
                ].map((step, i, arr) => (
                  <div key={step.label} className="flex items-center gap-1.5">
                    <div className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-all ${
                      step.done
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                        : 'border-zinc-800 bg-zinc-950/40 text-zinc-500'
                    }`}>
                      <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                        step.done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-600'
                      }`}>
                        {step.done ? '\u2713' : i + 1}
                      </span>
                      {step.label}
                    </div>
                    {i < arr.length - 1 && <span className="mx-1 text-zinc-700">{'\u203A'}</span>}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={generate}
                  disabled={loading === 'generate' || !selectedFile}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white transition hover:from-indigo-400 hover:to-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading === 'generate' ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                      AI 生成 PPT 大纲
                    </>
                  )}
                </button>
                <button
                  onClick={exportPptx}
                  disabled={loading === 'pptx' || doc.id === 'fallback'}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading === 'pptx' ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-300" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  )}
                  导出 PPT
                </button>
                <button
                  onClick={exportPdf}
                  disabled={loading === 'pdf' || doc.id === 'fallback'}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading === 'pdf' ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-300" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  )}
                  导出 PDF
                </button>
                <button
                  onClick={exportHtml}
                  disabled={loading === 'html' || doc.id === 'fallback'}
                  className="inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-5 py-3 text-sm font-medium text-violet-300 transition hover:border-violet-500/50 hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading === 'html' ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-400" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                  )}
                  导出 HTML
                </button>
              </div>
            </div>
          </motion.section>

          {/* 预览区 */}
          <motion.section
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.15 }}
            className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-800 bg-zinc-950/60">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-100">{doc.title}</h3>
                  <p className="text-xs text-zinc-500">{doc.slides?.length || 0} 页幻灯片 · {pptType}</p>
                </div>
              </div>
              {doc.id !== 'fallback' && (
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
                  已生成
                </span>
              )}
            </div>

            {doc.slides?.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {doc.slides.slice(0, 6).map((slide: any, index: number) => (
                  <div
                    key={index}
                    className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/50"
                  >
                    <div className="absolute left-0 top-0 h-0.5 w-full bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-800 font-mono text-[10px] text-zinc-500">
                          {index + 1}
                        </span>
                        <span className="line-clamp-1 text-sm font-medium text-zinc-200">{slide.title}</span>
                      </div>
                      <span className="shrink-0 rounded-md bg-zinc-800/60 px-2 py-0.5 text-[10px] capitalize text-zinc-500">
                        {slide.type || 'content'}
                      </span>
                    </div>
                    {slide.content && slide.content.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {slide.content.slice(0, 3).map((item: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-zinc-500">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
                            <span className="line-clamp-1">{item}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {slide.items && slide.items.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {slide.items.slice(0, 3).map((item: any, i: number) => (
                          <span key={i} className="rounded-md bg-zinc-800/60 px-2 py-0.5 text-[10px] text-zinc-500">
                            {item.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/20 py-12">
                <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl border border-zinc-800 bg-zinc-900/40">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                </div>
                <p className="text-sm text-zinc-500">上传文件并点击「AI 生成 PPT 大纲」后，此处将显示幻灯片预览</p>
              </div>
            )}

            {doc.slides && doc.slides.length > 6 && (
              <div className="mt-3 text-center text-xs text-zinc-600">
                还有 {doc.slides.length - 6} 页未显示
              </div>
            )}
          </motion.section>
        </div>
      </div>
    </WorkspaceShell>
  );
}

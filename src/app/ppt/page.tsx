'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '@/components/auth-provider';

import { WorkspaceShell } from '@/components/workspace-shell';
import request from '@/api/request';

const AUTO_TYPES: Record<string, { label: string; templateIndex: number; hint: string }> = {
  教程: { label: '教程', templateIndex: 0, hint: '步骤清晰、图文并茂' },
  报告: { label: '报告', templateIndex: 1, hint: '数据驱动、结论明确' },
  方案: { label: '方案', templateIndex: 0, hint: '结构化、架构感强' },
  总结: { label: '总结', templateIndex: 2, hint: '复盘感、轻商务' }
};

const fileTypes = ['PDF', 'Word', 'Markdown', '纯文本'];
const pptTypes = ['答辩PPT', '商业计划书', '工作汇报', '课程作业'];
const templates = [
  { name: '科技蓝', hint: '记忆中：你常用', accent: 'border-blue-500/40 bg-blue-500/15 text-blue-300', dot: 'bg-blue-500' },
  { name: '极简暗', hint: '深色低噪', accent: 'bg-zinc-800 text-zinc-300', dot: 'bg-zinc-500' },
  { name: '石墨灰', hint: '商务克制', accent: 'bg-zinc-700/60 text-zinc-200', dot: 'bg-zinc-400' },
  { name: '自然绿', hint: '清新明亮', accent: 'bg-emerald-500/15 text-emerald-400', dot: 'bg-emerald-500' }
];

export default function PptPage() {
  const { user } = useAuthStore();
  const userId = user?.id || '';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTemplate, setActiveTemplate] = useState(0);
  const [pages, setPages] = useState(15);
  const [activeType, setActiveType] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileId, setUploadedFileId] = useState('');
  const [outline, setOutline] = useState<any>(null);
  const [projectId, setProjectId] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [loading, setLoading] = useState('');
  const [pendingStage, setPendingStage] = useState('');
  const [status, setStatus] = useState('等待上传文件');
  const [error, setError] = useState('');
  const [projectsCount, setProjectsCount] = useState(0);
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [detectedType, setDetectedType] = useState('');
  const [detectedHint, setDetectedHint] = useState('');
  const [detectReason, setDetectReason] = useState<string[]>([]);

  const currentTemplate = useMemo(() => templates[activeTemplate], [activeTemplate]);
  const currentPptType = pptTypes[activeType];

  useEffect(() => {
    const loadCount = async () => {
      try {
        const data = await request.get(`/ppt-projects?userId=${userId}`);
        setProjectsCount(Array.isArray(data) ? data.length : 0);
      } catch {
        setProjectsCount(0);
      }
    };
    loadCount();
  }, []);

  const uploadFile = async (file?: File | null) => {
    if (!file) return;
    setError('');
    setStatus('正在上传文件');
    setSelectedFile(file);
    const formData = new FormData();
    formData.append('file', file);
    const data = await request.post('/ppt/upload', formData as any);
    setUploadedFileId(data.fileId);
    setOutline(null);
    setProjectId('');
    setDownloadUrl('');
    setShowExportSuccess(false);
    const auto = AUTO_TYPES[data.documentType] || AUTO_TYPES.教程;
    setDetectedType(data.documentType || '教程');
    setDetectedHint(auto.hint);
    setDetectReason(Array.isArray(data.analysis?.matchedKeywords) ? data.analysis.matchedKeywords : []);
    setActiveType(auto.templateIndex);
    setActiveTemplate(auto.templateIndex);
    setStatus(`已上传：${data.fileName} · ${data.fileType.toUpperCase()} · ${Math.round(data.fileSize / 1024)}KB · 自动识别为 ${auto.label}`);
  };

  const handleGenerateOutline = async () => {
    if (!uploadedFileId) {
      setError('请先上传文件');
      return;
    }
    setLoading('outline');
    setPendingStage('解析内容并调用 AI 生成大纲');
    setError('');
    setStatus('正在生成 PPT 大纲');
    try {
      const data = await request.post('/ppt/generate-outline', {
        fileId: uploadedFileId,
        pptType: currentPptType,
        template: currentTemplate.name,
        slideCount: pages
      });
      if (data?.documentType) {
        const auto = AUTO_TYPES[data.documentType] || AUTO_TYPES.教程;
        setDetectedType(data.documentType);
        setDetectedHint(auto.hint);
        setDetectReason(Array.isArray(data.analysis?.matchedKeywords) ? data.analysis.matchedKeywords : []);
        setActiveType(auto.templateIndex);
        setActiveTemplate(auto.templateIndex);
      }
      setOutline(data);
      setProjectId(data.projectId || '');
      setStatus(`大纲已生成 · ${Array.isArray(data.slides) ? data.slides.length : 0} 页`);
    } catch (err: any) {
      setError(err?.message ? `生成大纲失败：${err.message}` : '生成大纲失败：请检查文件内容、AI Key 和网络连接');
    } finally {
      setLoading('');
      setPendingStage('');
    }
  };

  const handleExport = async () => {
    if (!outline) {
      setError('请先生成大纲');
      return;
    }
    setLoading('export');
    setStatus('正在导出 PPTX');
    setError('');
    try {
      const data = await request.post('/ppt/export', {
        fileId: uploadedFileId,
        outline,
        template: currentTemplate.name,
        pptType: currentPptType,
        userId,
        sourceFileId: uploadedFileId,
        sourceFileName: selectedFile?.name || outline?.title || 'AI 生成PPT',
        documentType: detectedType || outline?.documentType || '教程'
      });
      setProjectId(data.projectId || projectId);
      const nextDownloadUrl = data.downloadUrl?.startsWith('http') ? data.downloadUrl : `http://localhost:3001${data.downloadUrl}`;
      setDownloadUrl(nextDownloadUrl);
      setShowExportSuccess(true);
      setStatus('导出完成，点击下方按钮下载文件');
    } catch (err: any) {
      setError(err.message || '导出失败');
    } finally {
      setLoading('');
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) {
      setError('下载链接不存在，请重新导出一次');
      return;
    }
    window.location.href = downloadUrl;
  };

  return (
    <WorkspaceShell active="/office-hub">
      <div className="mb-4 flex items-center justify-start">
        <Link href="/office-hub" className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-800/60 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800">
          <span className="text-base">←</span>
          返回办公效率中心
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="panel text-zinc-100">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); uploadFile(e.dataTransfer.files?.[0]); }}
            className="flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-800/40 px-6 text-center"
          >
            <div className="grid h-16 w-16 place-items-center rounded-full border border-zinc-800 bg-zinc-800/60 text-3xl text-blue-400">▶</div>
            <h1 className="mt-5 text-2xl font-semibold text-zinc-50">上传内容文件</h1>
            <p className="mt-2 text-sm text-zinc-400">支持 PDF · Word · Markdown · 纯文本</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {fileTypes.map((type) => (
                <button key={type} className="rounded-full bg-zinc-800/60 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800">{type}</button>
              ))}
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.md,.txt" className="hidden" onChange={(e) => uploadFile(e.target.files?.[0])} />
            <div className="mt-5 text-sm text-zinc-400">{status}</div>
            {selectedFile ? <div className="mt-2 text-sm text-zinc-50">{selectedFile.name}</div> : null}
          </div>
        </section>

        <section className="panel text-zinc-100">
          <p className="text-sm text-zinc-500">PPT 设置</p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-50">PPT 设置</h2>
          <div className="mt-8">
            <p className="text-sm text-zinc-400">PPT 类型</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {pptTypes.map((type, index) => (
                <button key={type} onClick={() => setActiveType(index)} className={`rounded-full px-4 py-2 text-sm font-medium transition ${activeType === index ? 'bg-zinc-700 text-zinc-50' : index === 1 ? 'bg-zinc-700 text-zinc-300' : index === 2 ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-700 text-zinc-300'}`}>{type}</button>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <p className="text-sm text-zinc-400">幻灯片数量</p>
            <div className="mt-4">
              <input type="range" min="6" max="30" value={pages} onChange={(e) => setPages(Number(e.target.value))} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 accent-blue-500" />
              <div className="mt-4 text-center text-sm text-zinc-400">{pages} 页</div>
            </div>
          </div>
        </section>
      </div>

      <section className="pt-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-50">选择模板</h2>
          <button className="text-sm font-medium text-blue-400 transition hover:text-blue-300">浏览全部模板 →</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {templates.map((item, index) => (
            <button key={item.name} onClick={() => setActiveTemplate(index)} className={`overflow-hidden rounded-lg border text-left transition ${activeTemplate === index ? 'border-blue-500/40 shadow-[0_0_0_1px_rgba(188,174,164,0.35)]' : 'border-zinc-800 hover:border-zinc-700'}`}>
              <div className={`flex min-h-[150px] items-center justify-center ${item.accent}`}>{item.name}</div>
              <div className="flex items-center gap-2 bg-zinc-800/60 px-4 py-3 text-sm text-zinc-400"><span className={`h-3 w-3 rounded-full ${item.dot}`} /><span>{item.name}（{item.hint}）</span></div>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 panel">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500">生成预览</p>
            <h3 className="mt-2 text-xl font-semibold text-zinc-50">{outline?.title || (loading === 'outline' ? 'AI 正在思考中...' : '等待 AI 生成大纲')}</h3>
          </div>
          <div className="flex items-center gap-3">
            {detectedType ? <div className="rounded-full border border-zinc-800 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">自动识别：{detectedType}</div> : null}
            <div className="rounded-full border border-zinc-800 bg-zinc-800/60 px-4 py-2 text-sm text-zinc-300">历史项目：{projectsCount}</div>
          </div>
        </div>
        <div className="mt-3 text-sm text-zinc-400">{loading === 'outline' ? `正在处理：${pendingStage || '生成大纲'}` : outline?.subtitle || '上传文件并生成后，这里会显示结构预览。'}</div>
        {detectedHint ? <div className="mt-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">当前模板策略：{detectedHint}</div> : null}
        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_280px]">
          <div className="space-y-2">
            {outline?.slides?.length ? outline.slides.slice(0, 6).map((slide: any) => (
              <div key={slide.index} className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-4 text-sm text-zinc-50">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold">{slide.index}. {slide.title}</div>
                  <div className="rounded-full bg-zinc-800/60 px-3 py-1 text-xs text-zinc-400">{slide.type || 'content'}</div>
                </div>
                <div className="mt-1 text-zinc-400">{Array.isArray(slide.bullets) ? slide.bullets.join(' / ') : ''}</div>
              </div>
            )) : (
              <div className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-4 text-sm text-zinc-400">上传文件后点击“AI 生成 PPT 大纲”，这里会出现完整预览。</div>
            )}
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-4 text-sm text-zinc-400">
            <div className="font-semibold text-zinc-50">上传后状态</div>
            <div className="mt-3 space-y-2">
              <div>文件：{selectedFile?.name || '未选择'}</div>
              <div>类型：{currentPptType}</div>
              <div>模板：{currentTemplate.name}</div>
              <div>页数：{pages} 页</div>
              <div>项目：{projectId || '未生成'}</div>
            </div>
            <div className="mt-4 rounded-lg bg-white px-4 py-3 text-zinc-400">{status}</div>
          </div>
        </div>
        {error ? <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div> : null}
      </section>

      <section className="panel">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          {['1 上传文件', '2 生成大纲', '3 导出 PPTX'].map((step, index) => (
            <div key={step} className={`flex items-center gap-2 rounded-full px-3 py-2 ${loading === 'outline' && index === 1 ? 'bg-zinc-800/60 text-zinc-50' : loading === 'export' && index === 2 ? 'bg-zinc-800/60 text-zinc-50' : index === 0 && uploadedFileId ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800/30'}`}>
              <span className="h-2 w-2 rounded-full bg-current opacity-70" />
              {step}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-4">
          <button onClick={handleGenerateOutline} disabled={!uploadedFileId || loading === 'outline'} className="flex-1 rounded-md bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-[0_18px_40px_rgba(149,135,126,0.18)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60">
            {loading === 'outline' ? '生成中...' : '✦ AI 生成 PPT 大纲'}
          </button>
          <button onClick={handleExport} disabled={!outline || loading === 'export'} className="rounded-md border border-zinc-800 bg-zinc-800/60 px-6 py-4 text-base font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60">
            {loading === 'export' ? '导出中...' : '导出 PPTX'}
          </button>
        </div>

        {showExportSuccess ? (
          <div className="mt-4 rounded-lg border border-zinc-800 bg-emerald-500/10 p-4 text-zinc-50">
            <div className="text-lg font-semibold">导出成功</div>
            <p className="mt-2 text-sm text-zinc-400">PPTX 已经生成完成，你可以点击下面按钮下载，也可以到项目列表继续复用。</p>
            <div className="mt-4 text-sm text-zinc-400">文件名：{selectedFile?.name ? `${selectedFile.name.replace(/\.[^.]+$/, '')}.pptx` : 'AI 生成PPT.pptx'}</div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={handleDownload} className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95">点击下载</button>
              <Link href="/ppt/projects" className="rounded-full border border-zinc-800 bg-zinc-800/30 px-5 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-800">查看项目列表</Link>
            </div>
          </div>
        ) : null}
      </section>
    </WorkspaceShell>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { WorkspaceShell } from '@/components/workspace-shell';
import { useAuthStore } from '@/components/auth-provider';
import request from '@/api/request';

const uploadTypes = ['PDF', 'DOCX', 'TXT', 'Markdown'];

type KnowledgeBase = {
  id: string;
  name: string;
  description?: string;
  documentCount?: number;
  chunkCount?: number;
  ingestionStatus?: 'stored' | 'failed';
};

type KnowledgeDocument = {
  id: string;
  baseId: string;
  displayName?: string;
  originalName?: string;
  fileName?: string;
  fileType?: string;
  content?: string;
  chunkCount?: number;
  ingestionStatus?: 'stored' | 'failed';
  createdAt?: string;
  chunks?: KnowledgeChunk[];
};

type KnowledgeChunk = {
  id: string;
  fileName: string;
  content: string;
  chunkIndex: number;
  similarity?: number;
};

type UploadStats = {
  fileCount: number;
  chunkCount: number;
  embeddingStatus: 'stored' | 'failed';
};

type SearchResult = {
  id: string;
  fileName: string;
  chunkIndex: number;
  similarity: number;
  content: string;
};

type LearningLinkResult = {
  linked: boolean;
  reason?: string;
  tasks?: Array<{ id: string; title: string; knowledgePointTitle: string; sourceChunkId: string }>;
  knowledgePoints?: Array<{ id: string; title: string; sourceChunkIds: string[] }>;
  pathRecommendation?: Array<{ order: number; title: string; difficulty: string; mastery: number; recommendedReason: string }>;
};

function similarityTone(score?: number) {
  const value = Number(score || 0);
  if (value > 0.85) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (value >= 0.6) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-500';
}

async function kbRequest(path: string, options: RequestInit = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const body = options.body instanceof FormData ? options.body : (typeof options.body === 'string' ? JSON.parse(options.body) : options.body);

  if (method === 'POST') return request.post(path, body as any);
  if (method === 'PATCH') return request.patch(path, body as any);
  if (method === 'DELETE') return request.delete(path);
  return request.get(path);
}

export default function KnowledgePage() {
  const { user } = useAuthStore();
  const userId = user?.id || '';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedBaseId, setSelectedBaseId] = useState('');
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocument | null>(null);
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [loading, setLoading] = useState('');
  const [status, setStatus] = useState('等待上传文件');
  const [error, setError] = useState('');
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);
  const [recentFileName, setRecentFileName] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadDraftName, setUploadDraftName] = useState('');
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const selectedBase = useMemo(() => knowledgeBases.find((item) => item.id === selectedBaseId) || null, [knowledgeBases, selectedBaseId]);

  const loadData = async () => {
    try {
      setLoading('loading');
      const data = await kbRequest(`/knowledge?userId=${encodeURIComponent(userId)}`);
      const bases = Array.isArray(data?.bases) ? data.bases : [];
      setKnowledgeBases(bases);
      const nextBaseId = selectedBaseId || bases?.[0]?.id || '';
      setSelectedBaseId(nextBaseId);
      if (nextBaseId) {
        const docsResponse = await kbRequest(`/knowledge-bases/${nextBaseId}/documents`);
        setDocuments(Array.isArray(docsResponse?.documents) ? docsResponse.documents : []);
      } else {
        setDocuments([]);
      }
    } catch (err: any) {
      setError(err?.message || '加载知识库失败');
    } finally {
      setLoading('');
    }
  };

  useEffect(() => {
    if (!userId) return;
    loadData();
  }, [userId]);

  useEffect(() => {
    if (!selectedBaseId) return;
    kbRequest(`/knowledge-bases/${selectedBaseId}/documents`)
      .then((res) => setDocuments(Array.isArray(res?.documents) ? res.documents : []))
      .catch(() => setDocuments([]));
  }, [selectedBaseId]);

  const openFileDialog = () => fileInputRef.current?.click();

  const handleCreateBase = async () => {
    if (!userId) {
      setError('请先登录');
      return;
    }
    const name = window.prompt('请输入知识库名称', '新建知识库');
    if (!name) return;
    try {
      setError('');
      await kbRequest('/knowledge-bases', {
        method: 'POST',
        body: JSON.stringify({ userId, name, description: '由文件导入生成' })
      });
      await loadData();
      setStatus(`已创建知识库：${name}`);
    } catch (err: any) {
      setError(err?.message || '新建知识库失败');
    }
  };

  const handleDeleteBase = async (base: KnowledgeBase) => {
    if (!window.confirm(`确定删除知识库「${base.name}」吗？这会同时删除其下所有文档和 Chunk。`)) return;
    try {
      setError('');
      await kbRequest(`/knowledge-bases/${base.id}`, { method: 'DELETE' });
      setSelectedBaseId('');
      setSelectedDocument(null);
      setChunks([]);
      setDetailOpen(false);
      setUploadStats(null);
      await loadData();
      setStatus('知识库已删除');
    } catch (err: any) {
      setError(err?.message || '删除知识库失败');
    }
  };

  const handleUpload = async (file?: File | null, displayName?: string) => {
    if (!userId) {
      setError('请先登录');
      return;
    }
    if (!file) {
      setError('请先选择一个文件');
      return;
    }

    try {
      setLoading('uploading');
      setError('');
      setStatus('正在解析并导入文件');
      setRecentFileName(file.name);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', userId);
      if (displayName?.trim()) {
        formData.append('display_name', displayName.trim());
        formData.append('knowledge_base_name', displayName.trim());
      }
      if (selectedBaseId) formData.append('knowledge_base_id', selectedBaseId);
      if (!selectedBaseId && !displayName?.trim()) {
        formData.append('knowledge_base_name', file.name.replace(/\.[^.]+$/, '').slice(0, 20) || '自动知识库');
      }

      const data = await request.post('/knowledge-upload', formData as any);
      if (!data) throw new Error('导入失败');

      setSelectedBaseId(data.base?.id || data.document?.baseId || selectedBaseId);
      setUploadStats(data.stats || null);
      setStatus(`已导入：${data.document?.displayName || data.document?.originalName || file.name}`);
      setUploadDialogOpen(false);
      setPendingUploadFile(null);
      await loadData();

      if (data.document?.id) {
        const detail = await kbRequest(`/knowledge/documents/${data.document.id}`);
        setSelectedDocument(detail);
        setChunks(Array.isArray(detail?.chunks) ? detail.chunks : []);
        setDetailOpen(true);
      }
    } catch (err: any) {
      setError(err?.message || '导入失败');
    } finally {
      setLoading('');
      setUploadDialogOpen(false);
      setPendingUploadFile(null);
    }
  };

  const openDetail = async (doc: KnowledgeDocument) => {
    try {
      setDetailLoading(true);
      const data = await kbRequest(`/knowledge/documents/${doc.id}`);
      setSelectedDocument(data);
      setChunks(Array.isArray(data?.chunks) ? data.chunks : []);
      setDetailOpen(true);
    } catch (err: any) {
      setError(err?.message || '读取文档详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const deleteDocument = async () => {
    if (!selectedDocument?.id) return;
    if (!window.confirm('确定要删除这个文档吗？')) return;
    try {
      await kbRequest(`/knowledge/documents/${selectedDocument.id}`, { method: 'DELETE' });
      setDetailOpen(false);
      setSelectedDocument(null);
      setChunks([]);
      await loadData();
      setStatus('文档已删除');
    } catch (err: any) {
      setError(err?.message || '删除失败');
    }
  };

  const handleSearch = async () => {
    if (!selectedBaseId) {
      setError('请先选择知识库');
      return;
    }
    if (!searchQuery.trim()) {
      setError('请输入检索问题');
      return;
    }
    try {
      setSearchLoading(true);
      setError('');
      const data = await kbRequest('/knowledge/search', {
        method: 'POST',
        body: JSON.stringify({ knowledgeBaseId: selectedBaseId, query: searchQuery.trim(), topK: 5 })
      });
      setSearchResults(Array.isArray(data?.chunks) ? data.chunks : []);
    } catch (err: any) {
      setError(err?.message || '检索失败');
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <WorkspaceShell active="/knowledge">
      <div className="panel text-slate-700">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200/70 pb-4">
          <h1 className="gradient-text text-2xl font-bold">AI知识库</h1>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-400 md:flex md:min-w-[260px]">搜索任何内容...</div>
            <div className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white/80 text-sm font-medium text-indigo-500">KB</div>
            <div className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white/80 text-sm font-medium text-slate-400">···</div>
          </div>
        </div>

        <div
          onClick={openFileDialog}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) {
              setPendingUploadFile(file);
              setUploadDraftName(file.name.replace(/\.[^.]+$/, ''));
              setUploadDialogOpen(true);
            }
          }}
          className="mt-5 flex min-h-[240px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center transition hover:border-indigo-300 hover:bg-indigo-50/30"
        >
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-2xl font-bold text-white shadow-[0_4px_16px_rgba(99,102,241,0.3)]">+</div>
          <h2 className="mt-5 text-xl font-semibold text-slate-800">上传文件到知识库</h2>
          <p className="mt-2 text-sm text-slate-400">拖拽文件至此，或点击选择文件</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {uploadTypes.map((type) => (
              <button key={type} className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-600">
                {type}
              </button>
            ))}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setPendingUploadFile(file);
                setUploadDraftName(file.name.replace(/\.[^.]+$/, ''));
                setUploadDialogOpen(true);
              }
            }}
          />
          <div className="mt-4 text-sm text-slate-500">{loading === 'uploading' ? '导入中...' : status}</div>
          {recentFileName ? <div className="mt-2 text-sm text-slate-400">{recentFileName}</div> : null}
          {uploadStats ? (
            <div className="mt-4 grid w-full max-w-xl gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 px-4 py-3">
                <div className="text-xs text-slate-400">文件数量</div>
                <div className="mt-1 text-lg font-semibold text-slate-800">{uploadStats.fileCount}</div>
              </div>
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 px-4 py-3">
                <div className="text-xs text-slate-400">Chunk数量</div>
                <div className="mt-1 text-lg font-semibold text-slate-800">{uploadStats.chunkCount}</div>
              </div>
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 px-4 py-3">
                <div className="text-xs text-slate-400">Embedding状态</div>
                <div className="mt-1 text-lg font-semibold text-emerald-600">{uploadStats.embeddingStatus}</div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="section-title">我的知识库</h2>
            {selectedBase ? <p className="mt-1 text-sm text-slate-400">当前知识库：{selectedBase.name} · {selectedBase.description || '暂无描述'}</p> : null}
          </div>
          <button onClick={handleCreateBase} className="text-sm font-medium text-indigo-500 transition hover:text-indigo-600">+ 新建知识库</button>
        </div>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {knowledgeBases.map((item) => (
            <div
              key={item.id}
              className={`card-hover rounded-2xl border p-5 text-left text-slate-700 transition ${selectedBaseId === item.id ? 'border-indigo-300 bg-indigo-50/40 shadow-[0_4px_16px_rgba(99,102,241,0.08)]' : 'border-slate-200/80 bg-white/80 hover:border-indigo-200'}`}
            >
              <button className="w-full text-left" onClick={() => setSelectedBaseId(item.id)}>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xl font-bold text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)]">KB</div>
                <h3 className="mt-5 text-lg font-semibold text-slate-800">{item.name}</h3>
                <p className="mt-2 text-sm text-slate-400">{item.description || '暂无描述'}</p>
                <div className="mt-4 flex gap-2">
                  <span className="badge badge-muted">文件 {item.documentCount || 0}</span>
                  <span className="badge badge-muted">Chunk {item.chunkCount || 0}</span>
                  <span className={`badge ${item.ingestionStatus === 'failed' ? 'badge-danger' : 'badge-success'}`}>{item.ingestionStatus || 'stored'}</span>
                </div>
              </button>
              <div className="mt-4 flex items-center gap-2">
                <button onClick={() => setSelectedBaseId(item.id)} className="rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50">选择</button>
                <button onClick={() => handleDeleteBase(item)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600 transition hover:bg-red-100">删除知识库</button>
              </div>
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="flex items-center justify-between gap-3">
            <h3 className="section-title">知识库文件</h3>
            <div className="text-sm text-slate-400">{documents.length} 个文档</div>
          </div>
          <div className="mt-4 space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-800">{doc.displayName || doc.originalName || doc.fileName || '未命名文档'}</div>
                    <div className="mt-1 text-xs text-slate-400">{doc.fileType || 'unknown'} · {doc.createdAt}</div>
                  </div>
                  <span className={`badge ${doc.ingestionStatus === 'failed' ? 'badge-danger' : 'badge-success'}`}>{doc.ingestionStatus || 'stored'}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-500">{doc.content ? doc.content.slice(0, 220) : '暂无内容'}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => openDetail(doc)} className="rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50">查看 Chunk</button>
                </div>
              </div>
            ))}
            {!documents.length ? <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/40 p-6 text-sm text-slate-400">当前知识库还没有文档，上传一个文件试试。</div> : null}
          </div>
        </div>
      </section>

      {uploadDialogOpen && pendingUploadFile ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/30 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-slate-700 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
            <div className="text-lg font-semibold text-slate-800">填写文件名</div>
            <p className="mt-1 text-sm text-slate-400">你可以为这次导入指定一个更清晰的知识库名称，或者直接用文件名。</p>
            <label className="mt-4 block text-sm text-slate-500">名称</label>
            <input value={uploadDraftName} onChange={(e) => setUploadDraftName(e.target.value)} className="input-field mt-2" placeholder="例如：高数第1章资料" />
            <div className="mt-4 flex items-center justify-between gap-3">
              <button onClick={() => { setUploadDialogOpen(false); setPendingUploadFile(null); }} className="btn-ghost">取消</button>
              <button onClick={() => { const name = uploadDraftName.trim() || pendingUploadFile.name.replace(/\.[^.]+$/, ''); handleUpload(pendingUploadFile, name); }} className="btn-primary">确认导入</button>
            </div>
          </div>
        </div>
      ) : null}

      {detailOpen && selectedDocument ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-3 py-4 backdrop-blur-sm">
          <div className="flex max-h-[82vh] w-full max-w-[920px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-slate-800">文档 Chunk</h3>
                <p className="mt-1 truncate text-[11px] text-slate-400">{selectedDocument.displayName || selectedDocument.originalName || selectedDocument.fileName || '未命名文档'}</p>
              </div>
              <button onClick={() => setDetailOpen(false)} className="shrink-0 rounded-lg border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-50">关闭</button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
                  <div className="text-[11px] text-slate-400">文件内容预览</div>
                  <div className="mt-2 max-h-[140px] overflow-auto text-[13px] leading-5 text-slate-700">{selectedDocument.content || '暂无内容'}</div>
                </div>
                <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
                  <div className="text-[11px] text-slate-400">文件信息</div>
                  <div className="mt-2 text-[12px] text-slate-600">文件类型：{selectedDocument.fileType || 'unknown'}</div>
                  <div className="mt-1 text-[12px] text-slate-600">Chunk 数量：{selectedDocument.chunkCount || chunks.length || 0}</div>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">Chunk 列表</div>
                  {detailLoading ? <div className="text-[11px] text-indigo-500">加载中...</div> : null}
                </div>
                <div className="mt-3 space-y-3">
                  {chunks.map((chunk) => (
                    <button key={chunk.id} onClick={() => alert(chunk.content)} className="w-full rounded-lg border border-slate-200/70 bg-white/80 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/30">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400"><span>Chunk #{chunk.chunkIndex}</span></div>
                      <pre className="mt-2 max-h-[160px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-[12px] leading-5 text-slate-700">{chunk.content}</pre>
                    </button>
                  ))}
                  {!chunks.length ? <div className="text-sm text-slate-400">当前文档暂无 Chunk。</div> : null}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-slate-200/70 px-4 py-3">
              <button onClick={deleteDocument} className="btn-danger">删除文档</button>
            </div>
          </div>
        </div>
      ) : null}
    </WorkspaceShell>
  );
}

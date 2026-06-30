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

type ChatReference = {
  fileName: string;
  chunkIndex: number;
  similarity: number;
};

type ChatReferenceWithCitation = ChatReference & { citation: number };

type ChatMessagePart =
  | { type: 'text'; value: string }
  | { type: 'reference'; citation: number };

type LearningLinkResult = {
  linked: boolean;
  reason?: string;
  tasks?: Array<{ id: string; title: string; knowledgePointTitle: string; sourceChunkId: string }>;
  knowledgePoints?: Array<{ id: string; title: string; sourceChunkIds: string[] }>;
  pathRecommendation?: Array<{ order: number; title: string; difficulty: string; mastery: number; recommendedReason: string }>;
};

function parseCitations(answer: string) {
  const matches = [...answer.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]));
  return Array.from(new Set(matches.filter((num) => Number.isFinite(num) && num > 0)));
}

function parseAnswerParts(answer: string): ChatMessagePart[] {
  const parts: ChatMessagePart[] = [];
  const regex = /\[(\d+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(answer)) !== null) {
    const text = answer.slice(lastIndex, match.index).trim();
    if (text) parts.push({ type: 'text', value: text });
    parts.push({ type: 'reference', citation: Number(match[1]) });
    lastIndex = regex.lastIndex;
  }

  const tail = answer.slice(lastIndex).trim();
  if (tail) parts.push({ type: 'text', value: tail });
  return parts;
}

function similarityTone(score?: number) {
  const value = Number(score || 0);
  if (value > 0.85) return 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10';
  if (value >= 0.6) return 'text-amber-300 border-amber-500/20 bg-amber-500/10';
  return 'text-zinc-400 border-zinc-700 bg-zinc-800/40';
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
  const chunkRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const citationRefs = useRef<Record<number, HTMLButtonElement | null>>({});
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
  const [chatQuery, setChatQuery] = useState('');
  const [chatAnswer, setChatAnswer] = useState('');
  const [chatAnswerParts, setChatAnswerParts] = useState<ChatMessagePart[]>([]);
  const [chatReferences, setChatReferences] = useState<ChatReferenceWithCitation[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [activeCitation, setActiveCitation] = useState<number | null>(null);
  const [activeChunkIndex, setActiveChunkIndex] = useState<number | null>(null);
  const [learningLink, setLearningLink] = useState<LearningLinkResult | null>(null);

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

  useEffect(() => {
    if (activeCitation == null) return;
    citationRefs.current[activeCitation]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeCitation]);

  useEffect(() => {
    if (activeChunkIndex == null) return;
    chunkRefs.current[activeChunkIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeChunkIndex]);

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
      setActiveChunkIndex(null);
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

  const handleChat = async () => {
    if (!selectedBaseId) {
      setError('请先选择知识库');
      return;
    }
    if (!chatQuery.trim()) {
      setError('请输入问题');
      return;
    }
    try {
      setChatLoading(true);
      setError('');
      const data = await kbRequest('/knowledge/chat', {
        method: 'POST',
        body: JSON.stringify({ knowledgeBaseId: selectedBaseId, query: chatQuery.trim() })
      });
      const nextAnswer = String(data?.answer || '');
      const nextReferences = Array.isArray(data?.references) ? data.references : [];
      if (!nextReferences.length) {
        setChatAnswer('知识库中未找到相关信息');
        setChatAnswerParts([{ type: 'text', value: '知识库中未找到相关信息' }]);
        setChatReferences([]);
        setActiveCitation(null);
        return;
      }

      const citationNumbers = parseCitations(nextAnswer);
      const normalizedReferences = nextReferences.map((item: ChatReference, index: number) => ({
        ...item,
        citation: citationNumbers[index] || index + 1
      }));

      setChatAnswer(nextAnswer);
      setChatAnswerParts(parseAnswerParts(nextAnswer));
      setChatReferences(normalizedReferences);
      setActiveCitation(null);

      try {
        const linkResponse = await kbRequest('/api/learning/rag-link', {
          method: 'POST',
          body: JSON.stringify({ userId, knowledgeBaseId: selectedBaseId, query: chatQuery.trim() })
        });
        setLearningLink(linkResponse as LearningLinkResult);
        if ((linkResponse as LearningLinkResult)?.linked) {
          window.dispatchEvent(new Event('workspace-data-updated'));
        }
      } catch (linkErr: any) {
        setLearningLink({ linked: false, reason: linkErr?.message || '联动失败' });
      }
    } catch (err: any) {
      setError(err?.message || '问答失败');
    } finally {
      setChatLoading(false);
    }
  };

  const focusReference = (citation: number) => {
    setActiveCitation(citation);
    const ref = chatReferences.find((item) => item.citation === citation);
    if (!ref) return;
    const chunkIndex = chunks.find((chunk) => chunk.chunkIndex === ref.chunkIndex)?.chunkIndex ?? ref.chunkIndex;
    setActiveChunkIndex(chunkIndex);
  };

  const focusChunk = (chunkIndex: number) => {
    setActiveChunkIndex(chunkIndex);
    const ref = chatReferences.find((item) => item.chunkIndex === chunkIndex);
    if (ref) setActiveCitation(ref.citation);
  };

  return (
    <WorkspaceShell active="/knowledge">
      <div className="panel text-zinc-100">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-semibold text-zinc-50">AI知识库</h1>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-zinc-800 bg-zinc-800/60 px-4 py-3 text-sm text-zinc-500 md:flex md:min-w-[260px]">搜索任何内容...</div>
            <div className="grid h-11 w-11 place-items-center rounded-lg border border-zinc-800 bg-zinc-800/60 text-blue-400">🔔</div>
            <div className="grid h-11 w-11 place-items-center rounded-lg border border-zinc-800 bg-zinc-800/60 text-zinc-500">⋯</div>
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
          className="mt-5 flex min-h-[240px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-800/40 px-6 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
        >
          <div className="grid h-16 w-16 place-items-center rounded-full border border-zinc-800 bg-zinc-800/60 text-3xl text-blue-400">◐</div>
          <h2 className="mt-5 text-2xl font-semibold text-zinc-50">上传文件到知识库</h2>
          <p className="mt-2 text-sm text-zinc-400">拖拽文件至此，或点击选择文件</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {uploadTypes.map((type) => (
              <button key={type} className="rounded-full border border-zinc-800 bg-zinc-800/60 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800">
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
          <div className="mt-4 text-sm text-zinc-300">{loading === 'uploading' ? '导入中...' : status}</div>
          {recentFileName ? <div className="mt-2 text-sm text-zinc-400">{recentFileName}</div> : null}
          {uploadStats ? (
            <div className="mt-4 grid w-full max-w-xl gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 md:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3">
                <div className="text-xs text-zinc-500">文件数量</div>
                <div className="mt-1 text-lg font-semibold text-zinc-50">{uploadStats.fileCount}</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3">
                <div className="text-xs text-zinc-500">Chunk数量</div>
                <div className="mt-1 text-lg font-semibold text-zinc-50">{uploadStats.chunkCount}</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3">
                <div className="text-xs text-zinc-500">Embedding状态</div>
                <div className="mt-1 text-lg font-semibold text-emerald-300">{uploadStats.embeddingStatus}</div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-50">我的知识库</h2>
            {selectedBase ? <p className="mt-1 text-sm text-zinc-500">当前知识库：{selectedBase.name} · {selectedBase.description || '暂无描述'}</p> : null}
          </div>
          <button onClick={handleCreateBase} className="text-sm font-medium text-blue-400 transition hover:text-blue-300">+ 新建知识库</button>
        </div>

        {error ? <div className="rounded-lg border border-rose-900/60 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {knowledgeBases.map((item) => (
            <div
              key={item.id}
              className={`rounded-lg border p-5 text-left text-zinc-100 shadow-panel backdrop-blur-2xl transition ${selectedBaseId === item.id ? 'border-blue-500/60 bg-zinc-900/95' : 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-700'}`}
            >
              <button className="w-full text-left" onClick={() => setSelectedBaseId(item.id)}>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#6d6371] to-[#5e5764] text-xl">📚</div>
                <h3 className="mt-5 text-lg font-semibold text-zinc-50">{item.name}</h3>
                <p className="mt-2 text-sm text-zinc-400">{item.description || '暂无描述'}</p>
                <div className="mt-4 flex gap-2 text-xs text-zinc-400">
                  <span className="rounded-full border border-zinc-800 px-2 py-1">文件 {item.documentCount || 0}</span>
                  <span className="rounded-full border border-zinc-800 px-2 py-1">Chunk {item.chunkCount || 0}</span>
                  <span className="rounded-full border border-zinc-800 px-2 py-1">{item.ingestionStatus || 'stored'}</span>
                </div>
              </button>
              <div className="mt-4 flex items-center gap-2">
                <button onClick={() => setSelectedBaseId(item.id)} className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800">选择</button>
                <button onClick={() => handleDeleteBase(item)} className="rounded-full border border-rose-900/50 bg-rose-950/30 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-900/40">删除知识库</button>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-5 text-zinc-100 shadow-panel backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-zinc-50">知识库文件</h3>
            <div className="text-sm text-zinc-400">{documents.length} 个文档</div>
          </div>
          <div className="mt-4 space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-zinc-50">{doc.displayName || doc.originalName || doc.fileName || '未命名文档'}</div>
                    <div className="mt-1 text-xs text-zinc-500">{doc.fileType || 'unknown'} · {doc.createdAt}</div>
                  </div>
                  <div className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">{doc.ingestionStatus || 'stored'}</div>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{doc.content ? doc.content.slice(0, 220) : '暂无内容'}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => openDetail(doc)} className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800">查看 Chunk</button>
                </div>
              </div>
            ))}
            {!documents.length ? <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/30 p-6 text-sm text-zinc-500">当前知识库还没有文档，上传一个文件试试。</div> : null}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[360px_1fr_360px]">
        <div className="panel space-y-4">
          <h3 className="text-lg font-semibold text-zinc-50">Knowledge Chat</h3>
          <textarea value={chatQuery} onChange={(e) => setChatQuery(e.target.value)} className="min-h-[140px] w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-blue-500" placeholder="输入你的问题" />
          <button onClick={handleChat} disabled={chatLoading} className="h-11 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-sm font-semibold text-white transition hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50">
            {chatLoading ? 'Sending...' : 'Send'}
          </button>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="text-xs text-zinc-500">AI 回答</div>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-zinc-200">
              {chatAnswerParts.length
                ? chatAnswerParts.map((part, index) =>
                    part.type === 'reference' ? (
                      <button key={`${part.type}-${part.citation}-${index}`} onClick={() => focusReference(part.citation)} className="mx-0.5 inline-flex items-center rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20">
                        [{part.citation}]
                      </button>
                    ) : (
                      <span key={`${part.type}-${index}`}>{part.value}{' '}</span>
                    )
                  )
                : chatAnswer || 'AI 回答会显示在这里。'}
            </div>
          </div>
          {learningLink?.linked ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              已基于 chunk 自动生成学习任务：{learningLink.tasks?.length || 0} 个，知识点：{learningLink.knowledgePoints?.length || 0} 个。
            </div>
          ) : null}
          {learningLink?.reason ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-400">{learningLink.reason}</div>
          ) : null}
        </div>

        <div className="panel space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-zinc-50">Chunks</h3>
            <div className="text-sm text-zinc-500">点击 chunk 可联动引用</div>
          </div>
          <div className="space-y-3">
            {chunks.map((chunk) => {
              const selected = activeChunkIndex === chunk.chunkIndex;
              return (
                <div
                  key={chunk.id}
                  ref={(node) => {
                    chunkRefs.current[chunk.chunkIndex] = node;
                  }}
                  onClick={() => focusChunk(chunk.chunkIndex)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all duration-300 ${selected ? 'border-indigo-400 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(129,140,248,0.35)] animate-pulse' : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-zinc-50">{chunk.fileName}</div>
                      <div className="text-xs text-zinc-500">Chunk #{chunk.chunkIndex}</div>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-xs font-medium ${similarityTone(chunk.similarity)}`}>{(chunk.similarity ?? 0).toFixed(2)}</span>
                  </div>
                  <p className="mt-3 line-clamp-6 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{chunk.content}</p>
                </div>
              );
            })}
            {!chunks.length ? <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30 p-4 text-sm text-zinc-500">Chunk 会显示在这里。</div> : null}
          </div>
        </div>

        <div className="panel space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-zinc-50">References</h3>
            <div className="text-sm text-zinc-500">点击 reference 可定位 chunk</div>
          </div>
          <div className="space-y-3">
            {chatReferences.map((item) => {
              const active = activeCitation === item.citation;
              return (
                <button
                  key={`${item.fileName}-${item.chunkIndex}-${item.citation}`}
                  ref={(node) => {
                    citationRefs.current[item.citation] = node;
                  }}
                  onClick={() => focusReference(item.citation)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all duration-300 ${active ? 'border-indigo-400 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(129,140,248,0.35)]' : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-zinc-50">[{item.citation}] {item.fileName}</div>
                    <span className={`rounded-full border px-2 py-1 text-xs font-medium ${similarityTone(item.similarity)}`}>{(item.similarity ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">Chunk #{item.chunkIndex}</div>
                </button>
              );
            })}
            {!chatReferences.length ? <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30 p-4 text-sm text-zinc-500">引用会显示在这里。</div> : null}
          </div>
        </div>
      </section>

      {uploadDialogOpen && pendingUploadFile ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-5 text-zinc-100 shadow-2xl">
            <div className="text-lg font-semibold text-zinc-50">填写文件名</div>
            <p className="mt-1 text-sm text-zinc-500">你可以为这次导入指定一个更清晰的知识库名称，或者直接用文件名。</p>
            <label className="mt-4 block text-sm text-zinc-400">名称</label>
            <input value={uploadDraftName} onChange={(e) => setUploadDraftName(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-blue-500" placeholder="例如：高数第1章资料" />
            <div className="mt-4 flex items-center justify-between gap-3">
              <button onClick={() => { setUploadDialogOpen(false); setPendingUploadFile(null); }} className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800">取消</button>
              <button onClick={() => { const name = uploadDraftName.trim() || pendingUploadFile.name.replace(/\.[^.]+$/, ''); handleUpload(pendingUploadFile, name); }} className="rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400">确认导入</button>
            </div>
          </div>
        </div>
      ) : null}

      {detailOpen && selectedDocument ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-3 py-4">
          <div className="flex max-h-[82vh] w-full max-w-[920px] flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 text-zinc-100 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-zinc-50">文档 Chunk</h3>
                <p className="mt-1 truncate text-[11px] text-zinc-500">{selectedDocument.displayName || selectedDocument.originalName || selectedDocument.fileName || '未命名文档'}</p>
              </div>
              <button onClick={() => setDetailOpen(false)} className="shrink-0 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-800">关闭</button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
                  <div className="text-[11px] text-zinc-500">文件内容预览</div>
                  <div className="mt-2 max-h-[140px] overflow-auto text-[13px] leading-5 text-zinc-200">{selectedDocument.content || '暂无内容'}</div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
                  <div className="text-[11px] text-zinc-500">文件信息</div>
                  <div className="mt-2 text-[12px] text-zinc-300">文件类型：{selectedDocument.fileType || 'unknown'}</div>
                  <div className="mt-1 text-[12px] text-zinc-300">Chunk 数量：{selectedDocument.chunkCount || chunks.length || 0}</div>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-zinc-500">Chunk 列表</div>
                  {detailLoading ? <div className="text-[11px] text-blue-400">加载中...</div> : null}
                </div>
                <div className="mt-3 space-y-3">
                  {chunks.map((chunk) => (
                    <button key={chunk.id} onClick={() => alert(chunk.content)} className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-left transition hover:border-zinc-700 hover:bg-zinc-900">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500"><span>Chunk #{chunk.chunkIndex}</span></div>
                      <pre className="mt-2 max-h-[160px] overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-[12px] leading-5 text-zinc-200">{chunk.content}</pre>
                    </button>
                  ))}
                  {!chunks.length ? <div className="text-sm text-zinc-500">当前文档暂无 Chunk。</div> : null}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-zinc-800 px-4 py-3">
              <button onClick={deleteDocument} className="rounded-full bg-rose-600 px-4 py-2 text-xs font-medium text-white hover:bg-rose-500">删除文档</button>
            </div>
          </div>
        </div>
      ) : null}
    </WorkspaceShell>
  );
}

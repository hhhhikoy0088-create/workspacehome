import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { loadStore, saveStore, upsertBase, upsertChunk, upsertDocument } from './knowledge.store';
import {
  createEmbedding,
  createId,
  getFileType,
  makeChunkRecords,
  normalizeText,
  now,
  splitIntoChunks
} from './knowledge.utils';
import { KnowledgeBaseRecord, KnowledgeDocumentRecord } from './knowledge.types';
import { buildKnowledgeContext, rankKnowledgeChunks, toChunkReferences } from './knowledge.retrieval';

const UPLOAD_DIR = join(process.cwd(), 'data', 'knowledge-uploads');
const ALLOWED_EXTS = new Set(['.pdf', '.docx', '.txt', '.md']);

function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
}

function fileStorage() {
  ensureUploadDir();
  return diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${randomUUID()}${extname(file.originalname)}`)
  });
}

function isAllowedFile(fileName: string) {
  return ALLOWED_EXTS.has(extname(fileName).toLowerCase());
}

async function parseFile(filePath: string, fileName: string) {
  const ext = extname(fileName).toLowerCase();
  if (ext === '.pdf') {
    const pdfParse = require('pdf-parse');
    const buffer = readFileSync(filePath);
    const result = await pdfParse(buffer);
    return normalizeText(result.text || '');
  }
  if (ext === '.docx') {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return normalizeText(result.value || '');
  }
  if (ext === '.txt' || ext === '.md') {
    return normalizeText(readFileSync(filePath, 'utf8'));
  }
  throw new Error('不支持的文件格式');
}

function pickBase(store: ReturnType<typeof loadStore>, userId: string, baseId?: string, baseName?: string) {
  if (baseId) {
    const found = store.bases.find((item) => item.id === baseId && item.userId === userId);
    if (found) return found;
  }

  const byName = baseName ? store.bases.find((item) => item.userId === userId && item.name === baseName) : undefined;
  if (byName) return byName;

  const existing = store.bases.find((item) => item.userId === userId);
  if (existing) return existing;

  const created: KnowledgeBaseRecord = {
    id: createId(),
    userId,
    name: baseName || '默认知识库',
    description: '文件入库知识库',
    createdAt: now(),
    updatedAt: now(),
    documentCount: 0,
    chunkCount: 0,
    ingestionStatus: 'stored'
  };
  store.bases.unshift(created);
  return created;
}

function rebuildBaseStats(store: ReturnType<typeof loadStore>, baseId: string) {
  const docs = store.documents.filter((item) => item.baseId === baseId);
  const chunks = store.chunks.filter((item) => item.baseId === baseId);
  const base = store.bases.find((item) => item.id === baseId);
  if (!base) return;

  base.documentCount = docs.length;
  base.chunkCount = chunks.length;
  base.ingestionStatus = docs.length > 0 ? 'stored' : 'failed';
  base.updatedAt = now();
}

function buildQueryChunks(query: string, topK: number) {
  const normalized = normalizeText(query);
  if (!normalized) throw new BadRequestException('query is required');
  if (!Number.isFinite(topK) || topK <= 0) topK = 5;
  return { normalized, topK: Math.min(20, topK) };
}

function buildKnowledgePointPayload(store: ReturnType<typeof loadStore>, knowledgeBaseId: string) {
  const baseChunks = store.chunks.filter((item) => item.baseId === knowledgeBaseId);
  const knowledgePoints = baseChunks.map((chunk) => ({
    id: createId(),
    title: chunk.content.split(/\n|[。！？.!?]/).map((part) => part.trim()).find(Boolean) || chunk.fileName,
    difficulty: chunk.content.length < 120 ? 'easy' : chunk.content.length < 240 ? 'medium' : 'hard',
    sourceChunkIds: [chunk.id],
    sourceFiles: [chunk.fileName],
    chunkIds: [chunk.id],
    mastery: 0,
    priority: chunk.content.length < 120 ? 1 : chunk.content.length < 240 ? 3 : 5,
    tree: []
  }));
  const knowledgePointMap = knowledgePoints.map((point) => ({
    knowledgePointId: point.id,
    title: point.title,
    difficulty: point.difficulty,
    sourceChunkIds: point.sourceChunkIds,
    fileNames: point.sourceFiles
  }));

  const tasks = baseChunks.flatMap((chunk, index) => {
    const point = knowledgePoints[index];
    const root = point?.title || chunk.fileName;
    const sentences = normalizeText(chunk.content).split(/(?<=[。！？.!?])\s*/).map((part) => part.trim()).filter(Boolean).slice(0, 2);
    return [
      {
        title: `学习：${root}`,
        sourceChunkId: chunk.id,
        fileName: chunk.fileName,
        knowledgePointId: point?.id || createId(),
        knowledgePointTitle: root
      },
      ...sentences.map((sentence) => ({
        title: `练习：${sentence.slice(0, 60)}`,
        sourceChunkId: chunk.id,
        fileName: chunk.fileName,
        knowledgePointId: point?.id || createId(),
        knowledgePointTitle: root
      }))
    ];
  });

  return { knowledgePoints, knowledgePointMap, tasks };
}

@Controller('knowledge')
export class KnowledgeController {
  @Get()
  list(@Query('userId') userId = 'demo-user') {
    const store = loadStore();
    const bases = store.bases.filter((item) => item.userId === userId);
    const documents = store.documents.filter((item) => item.userId === userId);
    return {
      documents,
      stats: {
        totalDocuments: documents.length,
        chunks: store.chunks.filter((item) => item.userId === userId).length,
        vectors: 0
      },
      bases
    };
  }

  @Get('bases')
  listBases(@Query('userId') userId = 'demo-user') {
    const store = loadStore();
    const bases = store.bases.filter((item) => item.userId === userId);
    return { bases };
  }

  @Get('bases/:baseId/documents')
  listDocuments(@Param('baseId') baseId: string) {
    const store = loadStore();
    const documents = store.documents.filter((item) => item.baseId === baseId);
    return { documents };
  }

  @Get('documents/:documentId/chunks')
  listChunks(@Param('documentId') documentId: string) {
    const store = loadStore();
    const chunks = store.chunks.filter((item) => item.documentId === documentId);
    return { chunks };
  }

  @Get('documents/:documentId')
  getDocument(@Param('documentId') documentId: string) {
    const store = loadStore();
    const document = store.documents.find((item) => item.id === documentId);
    if (!document) throw new NotFoundException('文档不存在');
    const chunks = store.chunks.filter((item) => item.documentId === documentId);
    return { ...document, chunks };
  }

  @Get('bases/:baseId/learning-payload')
  getLearningPayload(@Param('baseId') baseId: string) {
    const store = loadStore();
    const base = store.bases.find((item) => item.id === baseId);
    if (!base) throw new NotFoundException('知识库不存在');
    return buildKnowledgePointPayload(store, baseId);
  }

  @Post('bases')
  createBase(@Body() body: { user_id?: string; name?: string; description?: string }) {
    const store = loadStore();
    const userId = body.user_id || 'demo-user';
    const base: KnowledgeBaseRecord = {
      id: createId(),
      userId,
      name: body.name?.trim() || '未命名知识库',
      description: body.description?.trim() || '文件入库知识库',
      createdAt: now(),
      updatedAt: now(),
      documentCount: 0,
      chunkCount: 0,
      ingestionStatus: 'stored'
    };
    store.bases.unshift(base);
    saveStore(store);
    return { base };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: fileStorage() }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { user_id?: string; knowledge_base_id?: string; knowledge_base_name?: string; display_name?: string }
  ) {
    if (!file) throw new BadRequestException('请选择文件');
    if (!isAllowedFile(file.originalname)) throw new BadRequestException('仅支持 PDF、DOCX、TXT、Markdown');

    const store = loadStore();
    const userId = body.user_id || 'demo-user';
    const base = pickBase(store, userId, body.knowledge_base_id, body.knowledge_base_name || body.display_name);

    const fileContent = await parseFile(file.path, file.originalname);
    if (!fileContent) throw new BadRequestException('文件中未提取到可读文本');

    const chunks = splitIntoChunks(fileContent, 500, 800);
    if (!chunks.length) throw new BadRequestException('文本切块失败');

    const nowValue = now();
    const documentId = createId();
    const document: KnowledgeDocumentRecord = {
      id: documentId,
      baseId: base.id,
      userId,
      fileName: file.filename,
      originalName: file.originalname,
      displayName: body.display_name?.trim() || file.originalname,
      fileType: getFileType(file.originalname),
      content: fileContent,
      chunkCount: chunks.length,
      createdAt: nowValue,
      updatedAt: nowValue,
      ingestionStatus: 'stored'
    };

    const chunkRecords = makeChunkRecords({
      documentId,
      baseId: base.id,
      userId,
      fileName: file.originalname,
      chunks
    });

    for (const chunk of chunkRecords) {
      upsertChunk(store, chunk);
      createEmbedding(chunk.content);
    }

    upsertDocument(store, document);
    upsertBase(store, base);
    rebuildBaseStats(store, base.id);
    saveStore(store);

    const learningPayload = buildKnowledgePointPayload(store, base.id);

    const stats = {
      fileCount: store.documents.filter((item) => item.baseId === base.id).length,
      chunkCount: store.chunks.filter((item) => item.baseId === base.id).length,
      embeddingStatus: 'stored' as const
    };

    return {
      success: true,
      message: '知识库已导入',
      base,
      document,
      chunks,
      stats,
      learningPayload
    };
  }

  @Post('search')
  search(@Body() body: { knowledgeBaseId?: string; query?: string; topK?: number }) {
    const knowledgeBaseId = body.knowledgeBaseId?.trim();
    if (!knowledgeBaseId) throw new BadRequestException('knowledgeBaseId is required');
    const { normalized, topK } = buildQueryChunks(body.query || '', Number(body.topK || 5));
    const store = loadStore();
    const base = store.bases.find((item) => item.id === knowledgeBaseId);
    if (!base) throw new NotFoundException('知识库不存在');

    const rankedChunks = rankKnowledgeChunks(store, knowledgeBaseId, normalized, topK);
    return { chunks: rankedChunks };
  }

  @Post('chat')
  async chat(@Body() body: { knowledgeBaseId?: string; query?: string }) {
    const knowledgeBaseId = body.knowledgeBaseId?.trim();
    if (!knowledgeBaseId) throw new BadRequestException('knowledgeBaseId is required');
    if (!body.query?.trim()) throw new BadRequestException('query is required');

    const store = loadStore();
    const base = store.bases.find((item) => item.id === knowledgeBaseId);
    if (!base) throw new NotFoundException('知识库不存在');

    const rankedChunks = rankKnowledgeChunks(store, knowledgeBaseId, body.query, 5);
    const context = buildKnowledgeContext(rankedChunks);
    const references = toChunkReferences(rankedChunks);

    if (!rankedChunks.length) {
      return {
        answer: '知识库中未找到相关信息',
        references: []
      };
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new BadRequestException('DEEPSEEK_API_KEY is required');
    }

    const OpenAI = require('openai');
    const client = new OpenAI({
      apiKey,
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
    });

    const prompt = `你是一个基于知识库的AI助手。\n\n你只能根据 Context 回答问题。\n\n如果 Context 中没有答案，请回答：\n\n“知识库中未找到相关信息”\n\n禁止编造内容。\n\n请在回答中为每个关键结论添加引用标记，引用标记必须使用 [1] [2] 的形式，并且必须与下面提供的 references 序号严格对应。\n\nContext:\n${context}\n\nQuestion: ${body.query.trim()}`;

    const completion = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一个基于知识库的AI助手。你只能根据 Context 回答问题。如果 Context 中没有答案，请回答“知识库中未找到相关信息”。禁止编造内容。回答中必须带引用标记 [1] [2]，且只使用提供的 Context。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 1200
    });

    const rawAnswer = completion.choices[0]?.message?.content?.trim() || '';
    const citationMarks = references.map((_, index) => `[${index + 1}]`).join(' ');
    const answer = rawAnswer && rawAnswer !== '知识库中未找到相关信息'
      ? /\[(\d+)\]/.test(rawAnswer)
        ? rawAnswer
        : `${rawAnswer}\n\n${citationMarks}`.trim()
      : '知识库中未找到相关信息';

    return {
      answer,
      references
    };
  }

  @Delete('documents/:documentId')
  deleteDocument(@Param('documentId') documentId: string) {
    const store = loadStore();
    const doc = store.documents.find((item) => item.id === documentId);
    if (!doc) throw new NotFoundException('文档不存在');

    store.documents = store.documents.filter((item) => item.id !== documentId);
    store.chunks = store.chunks.filter((item) => item.documentId !== documentId);
    rebuildBaseStats(store, doc.baseId);
    saveStore(store);

    return { success: true };
  }

  @Delete('bases/:baseId')
  deleteBase(@Param('baseId') baseId: string) {
    const store = loadStore();
    const base = store.bases.find((item) => item.id === baseId);
    if (!base) throw new NotFoundException('知识库不存在');

    store.bases = store.bases.filter((item) => item.id !== baseId);
    store.documents = store.documents.filter((item) => item.baseId !== baseId);
    store.chunks = store.chunks.filter((item) => item.baseId !== baseId);
    saveStore(store);

    return { success: true };
  }
}

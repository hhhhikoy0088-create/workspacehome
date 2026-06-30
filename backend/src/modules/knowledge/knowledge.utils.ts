import { createHash, randomUUID } from 'crypto';
import { extname } from 'path';
import { KnowledgeChunkRecord, KnowledgeFileType } from './knowledge.types';

const WORD_REGEX = /\S+/g;

export function createId() {
  return randomUUID();
}

export function now() {
  return new Date().toISOString();
}

export function getFileType(fileName: string): KnowledgeFileType {
  const ext = extname(fileName).toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (ext === '.docx') return 'docx';
  if (ext === '.txt') return 'txt';
  return 'md';
}

export function normalizeText(text: string) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\u0000/g, '')
    .replace(/[ \u00A0]+/g, ' ')
    .trim();
}

export function estimateTokens(text: string) {
  const matches = text.match(WORD_REGEX);
  return matches ? Math.max(1, Math.ceil(matches.length / 0.75)) : 0;
}

export function splitIntoChunks(text: string, targetMin = 500, targetMax = 800) {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunks: Array<{ content: string; page: number; chunkIndex: number; tokenCount: number }> = [];
  let current = '';
  let currentTokens = 0;
  let page = 1;

  const pushCurrent = () => {
    const content = current.trim();
    if (!content) return;
    chunks.push({ content, page, chunkIndex: chunks.length + 1, tokenCount: estimateTokens(content) });
    current = '';
    currentTokens = 0;
    page += 1;
  };

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);
    if (currentTokens + paragraphTokens > targetMax && currentTokens >= targetMin) {
      pushCurrent();
    }

    if (paragraphTokens > targetMax) {
      const sentences = paragraph.split(/(?<=[。！？.!?])\s*/).filter(Boolean);
      for (const sentence of sentences) {
        const sentenceTokens = estimateTokens(sentence);
        if (currentTokens + sentenceTokens > targetMax && currentTokens >= targetMin) {
          pushCurrent();
        }
        current = current ? `${current}\n${sentence}` : sentence;
        currentTokens += sentenceTokens;
      }
      continue;
    }

    current = current ? `${current}\n${paragraph}` : paragraph;
    currentTokens += paragraphTokens;
  }

  pushCurrent();
  return chunks;
}

export function createEmbedding(text: string) {
  const normalized = normalizeText(text);
  const hash = createHash('sha256').update(normalized).digest();
  const embedding: number[] = [];
  for (let i = 0; i < 32; i += 1) {
    const value = hash[i] ?? 0;
    embedding.push(Number((value / 255).toFixed(6)));
  }
  return embedding;
}

export function cosineSimilarity(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  if (!length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function makeChunkRecords(params: {
  documentId: string;
  baseId: string;
  userId: string;
  fileName: string;
  chunks: Array<{ content: string; page: number; chunkIndex: number; tokenCount: number }>;
}) {
  const createdAt = now();
  return params.chunks.map<KnowledgeChunkRecord>((chunk) => ({
    id: createId(),
    documentId: params.documentId,
    baseId: params.baseId,
    userId: params.userId,
    fileName: params.fileName,
    content: chunk.content,
    chunkIndex: chunk.chunkIndex,
    page: chunk.page,
    tokenCount: chunk.tokenCount,
    createdAt
  }));
}

export function summarizeText(text: string) {
  const normalized = normalizeText(text);
  if (!normalized) return '';
  return normalized.slice(0, 280);
}

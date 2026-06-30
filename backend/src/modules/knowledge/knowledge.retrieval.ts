import { KnowledgeChunkRecord, KnowledgeStoreShape } from './knowledge.types';
import { cosineSimilarity, createEmbedding, normalizeText } from './knowledge.utils';

export interface RankedKnowledgeChunk {
  id: string;
  fileName: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

export function rankKnowledgeChunks(store: KnowledgeStoreShape, knowledgeBaseId: string, query: string, topK = 5) {
  const normalizedQuery = normalizeText(query);
  const baseChunks = store.chunks.filter((chunk) => chunk.baseId === knowledgeBaseId);
  if (!normalizedQuery || !baseChunks.length) {
    return [] as RankedKnowledgeChunk[];
  }

  const queryEmbedding = createEmbedding(normalizedQuery);

  return baseChunks
    .map((chunk) => {
      const similarity = Number(cosineSimilarity(queryEmbedding, createEmbedding(chunk.content)).toFixed(4));
      return {
        id: chunk.id,
        fileName: chunk.fileName,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        similarity
      } satisfies RankedKnowledgeChunk;
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, Math.max(1, Math.min(20, topK)));
}

export function buildKnowledgeContext(chunks: RankedKnowledgeChunk[]) {
  return chunks
    .map((chunk, index) => {
      return `[Chunk ${index + 1}]\nfileName: ${chunk.fileName}\nchunkIndex: ${chunk.chunkIndex}\ncontent:\n${chunk.content}`;
    })
    .join('\n\n---\n\n');
}

export function toChunkReferences(chunks: RankedKnowledgeChunk[]) {
  return chunks.map(({ fileName, chunkIndex, similarity }) => ({ fileName, chunkIndex, similarity }));
}

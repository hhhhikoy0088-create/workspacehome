import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  KnowledgeStoreShape,
  KnowledgeBaseRecord,
  KnowledgeDocumentRecord,
  KnowledgeChunkRecord
} from './knowledge.types';

const DATA_DIR = join(process.cwd(), 'data');
const STORE_FILE = join(DATA_DIR, 'knowledge-store.json');

function defaultStore(): KnowledgeStoreShape {
  return { bases: [], documents: [], chunks: [] };
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

export function loadStore(): KnowledgeStoreShape {
  try {
    ensureDataDir();
    if (!existsSync(STORE_FILE)) return defaultStore();
    const raw = readFileSync(STORE_FILE, 'utf8');
    if (!raw.trim()) return defaultStore();
    const parsed = JSON.parse(raw) as Partial<KnowledgeStoreShape>;
    return {
      bases: parsed.bases || [],
      documents: parsed.documents || [],
      chunks: parsed.chunks || []
    };
  } catch {
    return defaultStore();
  }
}

export function saveStore(store: KnowledgeStoreShape) {
  ensureDataDir();
  writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
}

export function upsertBase(store: KnowledgeStoreShape, base: KnowledgeBaseRecord) {
  const index = store.bases.findIndex((item) => item.id === base.id);
  if (index >= 0) store.bases[index] = base;
  else store.bases.unshift(base);
}

export function upsertDocument(store: KnowledgeStoreShape, document: KnowledgeDocumentRecord) {
  const index = store.documents.findIndex((item) => item.id === document.id);
  if (index >= 0) store.documents[index] = document;
  else store.documents.unshift(document);
}

export function upsertChunk(store: KnowledgeStoreShape, chunk: KnowledgeChunkRecord) {
  const index = store.chunks.findIndex((item) => item.id === chunk.id);
  if (index >= 0) store.chunks[index] = chunk;
  else store.chunks.push(chunk);
}

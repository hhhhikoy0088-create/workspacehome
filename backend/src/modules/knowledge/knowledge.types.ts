export type KnowledgeFileType = 'pdf' | 'docx' | 'txt' | 'md';
export type IngestionStatus = 'stored' | 'failed';

export interface KnowledgeBaseRecord {
  id: string;
  userId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  documentCount: number;
  chunkCount: number;
  ingestionStatus: IngestionStatus;
}

export interface KnowledgeDocumentRecord {
  id: string;
  baseId: string;
  userId: string;
  fileName: string;
  originalName: string;
  displayName: string;
  fileType: KnowledgeFileType;
  content: string;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
  ingestionStatus: IngestionStatus;
}

export interface KnowledgeChunkRecord {
  id: string;
  documentId: string;
  baseId: string;
  userId: string;
  fileName: string;
  content: string;
  chunkIndex: number;
  createdAt: string;
}

export interface KnowledgeStoreShape {
  bases: KnowledgeBaseRecord[];
  documents: KnowledgeDocumentRecord[];
  chunks: KnowledgeChunkRecord[];
}

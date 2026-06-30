export type LearningPlanStatus = 'active' | 'paused' | 'completed' | 'rescheduled';
export type LearningTaskStatus = 'pending' | 'active' | 'paused' | 'completed';
export type LearningNodeStatus = 'pending' | 'active' | 'paused' | 'completed';
export type KnowledgeDifficulty = 'easy' | 'medium' | 'hard';
export type LearningActivityType = 'rag-chat' | 'plan';

export interface LearningKnowledgePointNode {
  id: string;
  title: string;
  difficulty: KnowledgeDifficulty;
  chunkIds: string[];
  sourceFiles: string[];
  mastery: number;
  priority: number;
  status: LearningNodeStatus;
  createdAt: string;
  children: LearningKnowledgePointNode[];
}

export interface LearningKnowledgePoint {
  id: string;
  title: string;
  difficulty: KnowledgeDifficulty;
  sourceChunkIds: string[];
  sourceFiles: string[];
  chunkIds: string[];
  mastery: number;
  priority: number;
  status: LearningNodeStatus;
  createdAt: string;
  tree: LearningKnowledgePointNode[];
}

export interface LearningTaskRecord {
  id: string;
  userId: string;
  learningPlanId: string;
  title: string;
  status: LearningTaskStatus;
  order: number;
  dueDate: string;
  sourceChunkId: string;
  fileName: string;
  knowledgePointId: string;
  knowledgePointTitle: string;
  sourceType: LearningActivityType;
  queryText?: string;
  createdAt: string;
  completedAt?: string;
  rescheduledAt?: string;
}

export interface LearningPlanRecord {
  id: string;
  userId: string;
  knowledgeBaseId: string;
  status: LearningPlanStatus;
  title: string;
  knowledgePoints: LearningKnowledgePoint[];
  learningRoute: string[];
  dailyPlan: string[];
  reviewPlan: string[];
  exercises: string[];
  createdAt: string;
  updatedAt: string;
  lastLinkedAt?: string;
}

export interface LearningProgressRecord {
  userId: string;
  learningPlanId: string;
  learningProgress: number;
  todayTasks: number;
  completionRate: number;
  streakDays: number;
  todayNewKnowledgePoints: number;
  todayNewTasks: number;
  updatedAt: string;
}

export interface KnowledgePointMapEntry {
  knowledgePointId: string;
  title: string;
  difficulty: KnowledgeDifficulty;
  sourceChunkIds: string[];
  fileNames: string[];
}

export interface TaskSourceMappingEntry {
  taskId: string;
  sourceChunkId: string;
  fileName: string;
  knowledgePointId: string;
  knowledgePointTitle: string;
}

export interface LearningActivityRecord {
  id: string;
  userId: string;
  knowledgeBaseId: string;
  type: LearningActivityType;
  queryText: string;
  chunkIds: string[];
  newTaskCount: number;
  newKnowledgePointCount: number;
  createdAt: string;
}

export interface LearningStoreShape {
  plans: LearningPlanRecord[];
  tasks: LearningTaskRecord[];
  progress: LearningProgressRecord[];
  knowledgePointMap: Record<string, KnowledgePointMapEntry[]>;
  taskSourceMapping: Record<string, TaskSourceMappingEntry[]>;
  activityLog: LearningActivityRecord[];
}

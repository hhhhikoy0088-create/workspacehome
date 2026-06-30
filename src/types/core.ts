export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: ApiError;
};

export type UserProfile = {
  userId: string;
  name: string;
  nickname?: string;
  avatar?: string;
  identity?: string;
  profession?: string;
  goal?: string;
  goalDate?: string;
  goalTargetDate?: string;
  currentPhase?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type DashboardSummary = {
  userId: string;
  profile: UserProfile;
  learning: {
    studyHours: number;
    todayTasks: number;
    completionRate: number;
    streak: number;
    pendingTasks: number;
  };
  knowledge: {
    baseCount: number;
    documentCount: number;
    chunkCount: number;
  };
  resume: {
    optimizeCount: number;
    avgAtsScore: number;
  };
  analytics: {
    analysisCount: number;
    lastAnalysisTime: string;
  };
};

export type LearningRecord = {
  id: string;
  userId: string;
  subject: string;
  topic: string;
  mastery: number;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type KnowledgeBase = {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ChatMessage = {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
};

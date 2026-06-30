import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  KnowledgePointMapEntry,
  LearningActivityRecord,
  LearningPlanRecord,
  LearningProgressRecord,
  LearningStoreShape,
  LearningTaskRecord,
  TaskSourceMappingEntry
} from './learning.types';

const DATA_DIR = join(process.cwd(), 'data');
const STORE_FILE = join(DATA_DIR, 'learning-store.json');

function defaultStore(): LearningStoreShape {
  return { plans: [], tasks: [], progress: [], knowledgePointMap: {}, taskSourceMapping: {}, activityLog: [] };
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

export function loadLearningStore(): LearningStoreShape {
  try {
    ensureDir();
    if (!existsSync(STORE_FILE)) return defaultStore();
    const raw = readFileSync(STORE_FILE, 'utf8');
    if (!raw.trim()) return defaultStore();
    const parsed = JSON.parse(raw) as Partial<LearningStoreShape>;
    return {
      plans: parsed.plans || [],
      tasks: parsed.tasks || [],
      progress: parsed.progress || [],
      knowledgePointMap: parsed.knowledgePointMap || {},
      taskSourceMapping: parsed.taskSourceMapping || {},
      activityLog: parsed.activityLog || []
    };
  } catch {
    return defaultStore();
  }
}

export function saveLearningStore(store: LearningStoreShape) {
  ensureDir();
  writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
}

export function upsertPlan(store: LearningStoreShape, plan: LearningPlanRecord) {
  const index = store.plans.findIndex((item) => item.id === plan.id);
  if (index >= 0) store.plans[index] = plan;
  else store.plans.unshift(plan);
}

export function upsertProgress(store: LearningStoreShape, progress: LearningProgressRecord) {
  const index = store.progress.findIndex((item) => item.learningPlanId === progress.learningPlanId && item.userId === progress.userId);
  if (index >= 0) store.progress[index] = progress;
  else store.progress.unshift(progress);
}

export function upsertTask(store: LearningStoreShape, task: LearningTaskRecord) {
  const index = store.tasks.findIndex((item) => item.id === task.id);
  if (index >= 0) store.tasks[index] = task;
  else store.tasks.push(task);
}

export function addActivity(store: LearningStoreShape, activity: LearningActivityRecord) {
  store.activityLog.unshift(activity);
}

export function setKnowledgePointMap(store: LearningStoreShape, knowledgeBaseId: string, entries: KnowledgePointMapEntry[]) {
  store.knowledgePointMap[knowledgeBaseId] = entries;
}

export function setTaskSourceMapping(store: LearningStoreShape, knowledgeBaseId: string, entries: TaskSourceMappingEntry[]) {
  store.taskSourceMapping[knowledgeBaseId] = entries;
}

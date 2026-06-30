import request from './request';

/* =========================
   基础接口
========================= */
export const pingApi = () => {
  return request.get('/ping');
};

/* =========================
   AI 接口
========================= */
export const chatApi = (message) => {
  return request.post('/ai/chat', { message });
};

export const studyPlanApi = (userId, topic) => {
  return request.post('/ai/study-plan', { userId, topic });
};

export const summarizeDocumentApi = (text) => {
  return request.post('/ai/summarize-document', { text });
};

export const extractActionsApi = (transcript) => {
  return request.post('/ai/extract-actions', { transcript });
};

export const generatePptOutlineApi = (topic) => {
  return request.post('/ai/generate-ppt-outline', { topic });
};

/* =========================
   用户接口
========================= */
export const getUserApi = (id) => {
  return request.get(`/users/${id}`);
};

export const createUserApi = (data) => {
  return request.post('/users', data);
};

export const updateUserApi = (id, data) => {
  return request.patch(`/users/${id}`, data);
};

/* =========================
   任务接口
========================= */
export const getTasksApi = (userId, status) => {
  return request.get('/tasks', {
    params: { userId, status }
  });
};

export const createTaskApi = (data) => {
  return request.post('/tasks', data);
};

export const updateTaskApi = (id, data) => {
  return request.patch(`/tasks/${id}`, data);
};

/* =========================
   记忆接口
========================= */
export const getMemoryApi = (userId) => {
  return request.get('/memory', {
    params: { userId }
  });
};

export const createMemoryApi = (data) => {
  return request.post('/memory', data);
};

/* =========================
   知识库接口
========================= */
export const getKnowledgeBasesApi = (userId) => {
  return request.get('/knowledge-bases', {
    params: { userId }
  });
};

export const createKnowledgeBaseApi = (data) => {
  return request.post('/knowledge-bases', data);
};

export const getKnowledgeBaseFilesApi = (id) => {
  return request.get(`/knowledge-bases/${id}/files`);
};

export const createKnowledgeFileApi = (data) => {
  return request.post('/knowledge-files', data);
};

/* =========================
   学习计划 / 学习记录
========================= */
export const getStudyPlansApi = (userId) => {
  return request.get('/study-plans', {
    params: { userId }
  });
};

export const createStudyPlanApi = (data) => {
  return request.post('/study-plans', data);
};

export const getLearningRecordsApi = (userId) => {
  return request.get('/learning-records', {
    params: { userId }
  });
};

export const createLearningRecordApi = (data) => {
  return request.post('/learning-records', data);
};

/* =========================
   会议纪要
========================= */
export const getMeetingNotesApi = (userId) => {
  return request.get('/meeting-notes', {
    params: { userId }
  });
};

export const createMeetingNoteApi = (data) => {
  return request.post('/meeting-notes', data);
};

/* =========================
   文件整理
========================= */
export const getFilesApi = (userId) => {
  return request.get('/files', {
    params: { userId }
  });
};

export const createFileApi = (data) => {
  return request.post('/files', data);
};

/* =========================
   PPT 工坊
========================= */
export const getPptProjectsApi = (userId) => {
  return request.get('/ppt-projects', {
    params: { userId }
  });
};

export const createPptProjectApi = (data) => {
  return request.post('/ppt-projects', data);
};

/* =========================
   聊天记录
========================= */
export const getChatMessagesApi = (userId) => {
  return request.get('/chat/messages', {
    params: { userId }
  });
};

export const createChatMessageApi = (data) => {
  return request.post('/chat/messages', data);
};
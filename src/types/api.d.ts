declare module '@/api' {
  export const pingApi: (...args: any[]) => any;
  export const chatApi: (...args: any[]) => any;
  export const studyPlanApi: (...args: any[]) => any;
  export const summarizeDocumentApi: (...args: any[]) => any;
  export const extractActionsApi: (...args: any[]) => any;
  export const generatePptOutlineApi: (...args: any[]) => any;
  export const getUserApi: (...args: any[]) => any;
  export const createUserApi: (...args: any[]) => any;
  export const updateUserApi: (...args: any[]) => any;
  export const getTasksApi: (...args: any[]) => any;
  export const createTaskApi: (...args: any[]) => any;
  export const updateTaskApi: (...args: any[]) => any;
  export const getMemoryApi: (...args: any[]) => any;
  export const createMemoryApi: (...args: any[]) => any;
  export const getKnowledgeBasesApi: (...args: any[]) => any;
  export const createKnowledgeBaseApi: (...args: any[]) => any;
  export const getKnowledgeBaseFilesApi: (...args: any[]) => any;
  export const createKnowledgeFileApi: (...args: any[]) => any;
  export const getStudyPlansApi: (...args: any[]) => any;
  export const createStudyPlanApi: (...args: any[]) => any;
  export const getLearningRecordsApi: (...args: any[]) => any;
  export const createLearningRecordApi: (...args: any[]) => any;
  export const getMeetingNotesApi: (...args: any[]) => any;
  export const createMeetingNoteApi: (...args: any[]) => any;
  export const getFilesApi: (...args: any[]) => any;
  export const createFileApi: (...args: any[]) => any;
  export const getPptProjectsApi: (...args: any[]) => any;
  export const createPptProjectApi: (...args: any[]) => any;
  export const getChatMessagesApi: (...args: any[]) => any;
  export const createChatMessageApi: (...args: any[]) => any;
}

declare module '@/api/request' {
  const request: {
    get: (...args: any[]) => Promise<any>;
    post: (...args: any[]) => Promise<any>;
    patch: (...args: any[]) => Promise<any>;
    delete: (...args: any[]) => Promise<any>;
  };
  export default request;
}

declare module '@/api/ppt-request' {
  const request: any;
  export default request;
}

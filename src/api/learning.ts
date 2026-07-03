import request from './request';

export interface LearningRecordInput {
  user_id?: string;
  subject?: string;
  topic?: string;
  mastery?: number;
  note?: string;
  study_minutes?: number;
  record_type?: 'start' | 'complete' | 'practice';
}

export const createLearningRecord = async (data: LearningRecordInput) => {
  return request.post('/learning-records', data);
};

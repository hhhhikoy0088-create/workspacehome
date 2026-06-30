import { Controller, Get } from '@nestjs/common';

@Controller('tasks')
export class TasksController {
  @Get()
  list() {
    return [
      { id: 'task_1', title: '复习导数应用', status: 'doing' },
      { id: 'task_2', title: '整理考研资料', status: 'todo' },
      { id: 'task_3', title: '更新简历项目经历', status: 'todo' }
    ];
  }
}

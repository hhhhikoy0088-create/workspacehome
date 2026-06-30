import { Controller, Get } from '@nestjs/common';

@Controller('memory')
export class MemoryController {
  @Get()
  list() {
    return {
      profile: {
        identity: '大学生',
        profession: '学生',
        school: '未设置',
        major: '计算机',
        goal: '考研'
      },
      preferences: ['科技蓝PPT', '深色主题', '思维导图']
    };
  }
}

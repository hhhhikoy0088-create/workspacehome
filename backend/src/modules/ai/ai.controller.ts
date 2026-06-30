import { Body, Controller, Post } from '@nestjs/common';

@Controller('ai')
export class AiController {
  @Post('chat')
  chat(@Body() body: Record<string, unknown>) {
    return {
      message: '小龙虾已收到',
      input: body,
      reply: '这里将接入统一模型管理层。'
    };
  }
}

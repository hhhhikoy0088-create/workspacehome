import { Controller, Get, Param } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get(':id')
  findOne(@Param('id') id: string) {
    return { id, name: '张三', role: 'student' };
  }

  @Get()
  findAll() {
    return [{ id: 'user_1', name: '张三', role: 'student' }];
  }
}

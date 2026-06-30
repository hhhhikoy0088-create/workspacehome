import { Controller, Get, Post, Body } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Post('login')
  login(@Body() body: Record<string, unknown>) {
    return { message: 'login ok', data: body };
  }

  @Post('register')
  register(@Body() body: Record<string, unknown>) {
    return { message: 'register ok', data: body };
  }

  @Get('me')
  me() {
    return { id: 'user_1', name: '张三' };
  }
}

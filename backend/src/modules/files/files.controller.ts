import { Controller, Get } from '@nestjs/common';

@Controller('files')
export class FilesController {
  @Get()
  list() {
    return {
      folders: ['学习资料', '工作文件', '会议纪要'],
      duplicates: [],
      tags: ['考研', '项目', '简历']
    };
  }
}

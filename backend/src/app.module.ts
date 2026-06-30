import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MemoryModule } from './modules/memory/memory.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { FilesModule } from './modules/files/files.module';
import { AiModule } from './modules/ai/ai.module';
import { LearningModule } from './modules/learning/learning.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    AuthModule,
    UsersModule,
    MemoryModule,
    TasksModule,
    KnowledgeModule,
    FilesModule,
    AiModule,
    LearningModule
  ]
})
export class AppModule {}

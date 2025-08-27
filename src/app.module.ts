import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowModule } from './workflows/workflow.module';
import { EventModule } from './events/event.module';
import { SagaModule } from './sagas/saga.module';
import { MessagingModule } from './messaging/messaging.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { DatabaseConfig } from './config/database.config';
import { MessagingConfig } from './config/messaging.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfig,
    }),
    MessagingModule.forRootAsync({
      useClass: MessagingConfig,
    }),
    WorkflowModule,
    EventModule,
    SagaModule,
    MonitoringModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { EventEntity } from './entities/event.entity';
import { EventBus } from './event-bus';
import { EventStore } from './event-store';
import { EventProcessor } from './event-processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventEntity]),
  ],
  controllers: [EventController],
  providers: [
    EventService,
    EventBus,
    EventStore,
    EventProcessor,
  ],
  exports: [EventService, EventBus, EventStore],
})
export class EventModule {}

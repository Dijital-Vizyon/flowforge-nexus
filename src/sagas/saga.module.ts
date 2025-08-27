import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SagaController } from './saga.controller';
import { SagaService } from './saga.service';
import { SagaDefinitionEntity } from './entities/saga-definition.entity';
import { SagaExecutionEntity } from './entities/saga-execution.entity';
import { SagaEngine } from './saga-engine';
import { SagaOrchestrator } from './saga-orchestrator';
import { CompensationManager } from './compensation-manager';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SagaDefinitionEntity,
      SagaExecutionEntity,
    ]),
  ],
  controllers: [SagaController],
  providers: [
    SagaService,
    SagaEngine,
    SagaOrchestrator,
    CompensationManager,
  ],
  exports: [SagaService, SagaEngine],
})
export class SagaModule {}

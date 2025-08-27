import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { WorkflowDefinitionEntity } from './entities/workflow-definition.entity';
import { WorkflowExecutionEntity } from './entities/workflow-execution.entity';
import { WorkflowEngine } from '../core/workflow-engine';
import { WorkflowRegistry } from '../core/workflow-registry';
import { StepExecutor } from '../core/step-executor';
import { StateManager } from '../core/state-manager';
import { WorkflowValidator } from '../core/workflow-validator';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowDefinitionEntity,
      WorkflowExecutionEntity,
    ]),
  ],
  controllers: [WorkflowController],
  providers: [
    WorkflowService,
    WorkflowEngine,
    WorkflowRegistry,
    StepExecutor,
    StateManager,
    WorkflowValidator,
  ],
  exports: [WorkflowService, WorkflowEngine],
})
export class WorkflowModule {}

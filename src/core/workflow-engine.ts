import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { 
  WorkflowDefinition, 
  WorkflowExecution, 
  WorkflowContext, 
  StepResult,
  Event 
} from '../types';
import { WorkflowRegistry } from './workflow-registry';
import { StepExecutor } from './step-executor';
import { StateManager } from './state-manager';
import { WorkflowValidator } from './workflow-validator';

@Injectable()
export class WorkflowEngine {
  private readonly logger = new Logger(WorkflowEngine.name);
  private readonly executions = new Map<string, WorkflowExecution>();

  constructor(
    private readonly workflowRegistry: WorkflowRegistry,
    private readonly stepExecutor: StepExecutor,
    private readonly stateManager: StateManager,
    private readonly validator: WorkflowValidator,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async executeWorkflow(
    workflowId: string,
    triggerEvent: Event,
    context?: Record<string, any>
  ): Promise<WorkflowExecution> {
    try {
      // Get workflow definition
      const definition = await this.workflowRegistry.getWorkflow(workflowId);
      if (!definition) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // Validate workflow
      const validation = await this.validator.validateWorkflow(definition);
      if (!validation.isValid) {
        throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
      }

      // Create execution
      const execution: WorkflowExecution = {
        id: this.generateExecutionId(),
        workflowId,
        status: 'pending',
        context: context || {},
        startedAt: new Date(),
      };

      this.executions.set(execution.id, execution);
      this.logger.log(`Starting workflow execution ${execution.id} for workflow ${workflowId}`);

      // Emit execution started event
      this.eventEmitter.emit('workflow.execution.started', { execution, triggerEvent });

      // Execute workflow
      await this.executeWorkflowSteps(execution, definition, triggerEvent);

      return execution;
    } catch (error) {
      this.logger.error(`Failed to execute workflow ${workflowId}:`, error);
      throw error;
    }
  }

  private async executeWorkflowSteps(
    execution: WorkflowExecution,
    definition: WorkflowDefinition,
    triggerEvent: Event
  ): Promise<void> {
    try {
      execution.status = 'running';
      
      // Find starting steps (triggers)
      const startSteps = this.findStartSteps(definition, triggerEvent);
      if (startSteps.length === 0) {
        throw new Error('No matching trigger steps found');
      }

      // Execute starting steps
      for (const step of startSteps) {
        await this.executeStep(execution, definition, step, triggerEvent);
      }

      // Continue with next steps
      await this.processNextSteps(execution, definition);

      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

      this.logger.log(`Workflow execution ${execution.id} completed successfully`);
      this.eventEmitter.emit('workflow.execution.completed', { execution });

    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

      this.logger.error(`Workflow execution ${execution.id} failed:`, error);
      this.eventEmitter.emit('workflow.execution.failed', { execution, error });
      
      throw error;
    }
  }

  private async executeStep(
    execution: WorkflowExecution,
    definition: WorkflowDefinition,
    stepId: string,
    input?: any
  ): Promise<StepResult> {
    const step = definition.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found in workflow ${definition.id}`);
    }

    execution.currentStep = stepId;
    this.logger.debug(`Executing step ${stepId} in execution ${execution.id}`);

    try {
      // Execute step
      const result = await this.stepExecutor.execute(step, {
        executionId: execution.id,
        workflowId: execution.workflowId,
        stepId,
        data: input || execution.context,
        metadata: { step, execution }
      });

      // Update execution context
      if (result.data) {
        execution.context = { ...execution.context, ...result.data };
      }

      // Save state
      await this.stateManager.saveExecutionState(execution);

      this.logger.debug(`Step ${stepId} completed successfully`);
      return result;

    } catch (error) {
      this.logger.error(`Step ${stepId} failed:`, error);
      
      // Handle step failure
      if (step.errorHandler) {
        return await this.handleStepError(execution, definition, step, error);
      }
      
      throw error;
    }
  }

  private async processNextSteps(
    execution: WorkflowExecution,
    definition: WorkflowDefinition
  ): Promise<void> {
    const pendingSteps = this.findPendingSteps(execution, definition);
    
    while (pendingSteps.length > 0) {
      const stepId = pendingSteps.shift()!;
      const step = definition.steps.find(s => s.id === stepId);
      
      if (step && this.canExecuteStep(step, execution)) {
        const result = await this.executeStep(execution, definition, stepId);
        
        // Add next steps to pending queue
        if (result.nextSteps) {
          pendingSteps.push(...result.nextSteps);
        }
      }
    }
  }

  private findStartSteps(definition: WorkflowDefinition, triggerEvent: Event): string[] {
    return definition.triggers
      .filter(trigger => 
        trigger.eventType === triggerEvent.type &&
        this.evaluateTriggerConditions(trigger, triggerEvent)
      )
      .map(trigger => trigger.type);
  }

  private evaluateTriggerConditions(trigger: any, event: Event): boolean {
    if (!trigger.conditions) return true;
    
    // Simple condition evaluation - in production, use a proper expression engine
    return trigger.conditions.every((condition: string) => {
      // Basic condition evaluation logic
      return true; // Placeholder
    });
  }

  private findPendingSteps(execution: WorkflowExecution, definition: WorkflowDefinition): string[] {
    // Find steps that are ready to execute based on dependencies
    const completedSteps = this.getCompletedSteps(execution);
    const allSteps = definition.steps.map(s => s.id);
    
    return allSteps.filter(stepId => {
      const step = definition.steps.find(s => s.id === stepId);
      if (!step) return false;
      
      // Check if dependencies are met
      if (step.dependencies) {
        return step.dependencies.every(dep => completedSteps.includes(dep));
      }
      
      return true;
    });
  }

  private canExecuteStep(step: any, execution: WorkflowExecution): boolean {
    // Check if step can be executed (dependencies, conditions, etc.)
    return true; // Placeholder
  }

  private getCompletedSteps(execution: WorkflowExecution): string[] {
    // Get list of completed steps from execution context
    return execution.context.completedSteps || [];
  }

  private async handleStepError(
    execution: WorkflowExecution,
    definition: WorkflowDefinition,
    step: any,
    error: Error
  ): Promise<StepResult> {
    // Execute error handler step
    const errorHandler = definition.steps.find(s => s.id === step.errorHandler);
    if (errorHandler) {
      return await this.executeStep(execution, definition, step.errorHandler, { error });
    }
    
    return {
      success: false,
      error: error.message,
    };
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getExecution(executionId: string): Promise<WorkflowExecution | undefined> {
    return this.executions.get(executionId);
  }

  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled';
      execution.completedAt = new Date();
      
      this.logger.log(`Workflow execution ${executionId} cancelled`);
      this.eventEmitter.emit('workflow.execution.cancelled', { execution });
    }
  }
}

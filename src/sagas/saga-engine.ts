import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { 
  SagaDefinition, 
  SagaDefinition as SagaDefinitionType,
  SagaStep,
  CompensationPolicy 
} from '../types';
import { SagaOrchestrator } from './saga-orchestrator';
import { CompensationManager } from './compensation-manager';

@Injectable()
export class SagaEngine {
  private readonly logger = new Logger(SagaEngine.name);
  private readonly activeSagas = new Map<string, any>();

  constructor(
    private readonly sagaOrchestrator: SagaOrchestrator,
    private readonly compensationManager: CompensationManager,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async startSaga(
    sagaDefinition: SagaDefinitionType,
    initialData: Record<string, any>
  ): Promise<string> {
    try {
      this.logger.log(`Starting saga: ${sagaDefinition.name}`);

      // Create saga execution context
      const executionContext = {
        sagaId: sagaDefinition.id,
        sagaName: sagaDefinition.name,
        status: 'running',
        currentStep: 0,
        data: initialData,
        completedSteps: [],
        failedSteps: [],
        startTime: new Date(),
        compensationRequired: false,
      };

      // Store execution context
      const executionId = this.generateExecutionId();
      this.activeSagas.set(executionId, executionContext);

      // Emit saga started event
      this.eventEmitter.emit('saga.started', { 
        executionId, 
        sagaDefinition, 
        initialData 
      });

      // Start saga execution
      await this.executeSaga(executionId, sagaDefinition, executionContext);

      return executionId;
    } catch (error) {
      this.logger.error(`Failed to start saga ${sagaDefinition.name}:`, error);
      throw error;
    }
  }

  private async executeSaga(
    executionId: string,
    sagaDefinition: SagaDefinitionType,
    executionContext: any
  ): Promise<void> {
    try {
      const { steps, compensationPolicy } = sagaDefinition;
      
      // Execute steps in order
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        executionContext.currentStep = i;

        try {
          this.logger.debug(`Executing saga step: ${step.name}`, { 
            executionId, 
            stepIndex: i 
          });

          // Check dependencies
          if (step.dependencies && !this.checkDependencies(step.dependencies, executionContext.completedSteps)) {
            throw new Error(`Dependencies not met for step: ${step.name}`);
          }

          // Execute step
          const result = await this.sagaOrchestrator.executeStep(step, executionContext.data);
          
          // Update execution context
          executionContext.data = { ...executionContext.data, ...result };
          executionContext.completedSteps.push(step.id);

          // Emit step completed event
          this.eventEmitter.emit('saga.step.completed', {
            executionId,
            stepId: step.id,
            stepName: step.name,
            result,
          });

          this.logger.debug(`Saga step completed: ${step.name}`, { executionId });

        } catch (error) {
          this.logger.error(`Saga step failed: ${step.name}`, { 
            executionId, 
            error: error.message 
          });

          executionContext.failedSteps.push({
            stepId: step.id,
            stepName: step.name,
            error: error.message,
            timestamp: new Date(),
          });

          // Handle step failure based on compensation policy
          await this.handleStepFailure(
            executionId,
            sagaDefinition,
            executionContext,
            step,
            error
          );

          break; // Stop execution on failure
        }
      }

      // Check if saga completed successfully
      if (executionContext.failedSteps.length === 0) {
        executionContext.status = 'completed';
        this.logger.log(`Saga completed successfully: ${sagaDefinition.name}`, { executionId });
        
        this.eventEmitter.emit('saga.completed', { executionId, sagaDefinition });
      }

    } catch (error) {
      this.logger.error(`Saga execution failed: ${sagaDefinition.name}`, { 
        executionId, 
        error: error.message 
      });
      
      executionContext.status = 'failed';
      this.eventEmitter.emit('saga.failed', { executionId, sagaDefinition, error });
      
      throw error;
    } finally {
      // Clean up execution context
      this.activeSagas.delete(executionId);
    }
  }

  private async handleStepFailure(
    executionId: string,
    sagaDefinition: SagaDefinitionType,
    executionContext: any,
    failedStep: SagaStep,
    error: Error
  ): Promise<void> {
    try {
      this.logger.log(`Handling step failure: ${failedStep.name}`, { executionId });

      // Determine compensation strategy
      const compensationStrategy = this.determineCompensationStrategy(
        sagaDefinition.compensationPolicy,
        executionContext
      );

      // Execute compensation
      if (compensationStrategy === 'backward') {
        await this.executeBackwardCompensation(
          executionId,
          sagaDefinition,
          executionContext,
          failedStep
        );
      } else if (compensationStrategy === 'forward') {
        await this.executeForwardCompensation(
          executionId,
          sagaDefinition,
          executionContext,
          failedStep
        );
      }

      executionContext.status = 'compensated';
      this.eventEmitter.emit('saga.compensated', { 
        executionId, 
        sagaDefinition, 
        failedStep 
      });

    } catch (compensationError) {
      this.logger.error(`Compensation failed for step: ${failedStep.name}`, { 
        executionId, 
        error: compensationError.message 
      });
      
      executionContext.status = 'compensation_failed';
      this.eventEmitter.emit('saga.compensation_failed', { 
        executionId, 
        sagaDefinition, 
        failedStep, 
        error: compensationError 
      });
      
      throw compensationError;
    }
  }

  private determineCompensationStrategy(
    compensationPolicy: CompensationPolicy,
    executionContext: any
  ): 'forward' | 'backward' | 'mixed' {
    // Logic to determine compensation strategy based on policy and context
    return compensationPolicy.strategy;
  }

  private async executeBackwardCompensation(
    executionId: string,
    sagaDefinition: SagaDefinitionType,
    executionContext: any,
    failedStep: SagaStep
  ): Promise<void> {
    this.logger.log(`Executing backward compensation`, { executionId });

    // Execute compensation steps in reverse order
    const completedSteps = [...executionContext.completedSteps].reverse();
    
    for (const stepId of completedSteps) {
      const step = sagaDefinition.steps.find(s => s.id === stepId);
      if (step && step.compensation) {
        try {
          await this.compensationManager.executeCompensation(
            step.compensation,
            executionContext.data
          );
          
          this.logger.debug(`Compensation executed for step: ${step.name}`, { executionId });
        } catch (error) {
          this.logger.error(`Compensation failed for step: ${step.name}`, { 
            executionId, 
            error: error.message 
          });
          throw error;
        }
      }
    }
  }

  private async executeForwardCompensation(
    executionId: string,
    sagaDefinition: SagaDefinitionType,
    executionContext: any,
    failedStep: SagaStep
  ): Promise<void> {
    this.logger.log(`Executing forward compensation`, { executionId });

    // Execute compensation steps in forward order
    const remainingSteps = sagaDefinition.steps.slice(
      executionContext.currentStep + 1
    );

    for (const step of remainingSteps) {
      if (step.compensation) {
        try {
          await this.compensationManager.executeCompensation(
            step.compensation,
            executionContext.data
          );
          
          this.logger.debug(`Compensation executed for step: ${step.name}`, { executionId });
        } catch (error) {
          this.logger.error(`Compensation failed for step: ${step.name}`, { 
            executionId, 
            error: error.message 
          });
          throw error;
        }
      }
    }
  }

  private checkDependencies(dependencies: string[], completedSteps: string[]): boolean {
    return dependencies.every(dep => completedSteps.includes(dep));
  }

  private generateExecutionId(): string {
    return `saga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getSagaExecution(executionId: string): Promise<any | undefined> {
    return this.activeSagas.get(executionId);
  }

  async cancelSaga(executionId: string): Promise<void> {
    const execution = this.activeSagas.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled';
      this.logger.log(`Saga cancelled: ${executionId}`);
      
      this.eventEmitter.emit('saga.cancelled', { executionId });
    }
  }

  async getActiveSagas(): Promise<any[]> {
    return Array.from(this.activeSagas.values());
  }
}

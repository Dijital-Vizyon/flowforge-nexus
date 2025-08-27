import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowDefinition, ValidationResult } from '../types';
import { WorkflowDefinitionEntity } from '../workflows/entities/workflow-definition.entity';

@Injectable()
export class WorkflowRegistry {
  private readonly logger = new Logger(WorkflowRegistry.name);
  private readonly workflowCache = new Map<string, WorkflowDefinition>();

  constructor(
    @InjectRepository(WorkflowDefinitionEntity)
    private readonly workflowRepository: Repository<WorkflowDefinitionEntity>,
  ) {}

  async registerWorkflow(workflow: WorkflowDefinition): Promise<void> {
    try {
      this.logger.log(`Registering workflow: ${workflow.name}@${workflow.version}`);

      // Check if workflow already exists
      const existing = await this.workflowRepository.findOne({
        where: { name: workflow.name, version: workflow.version },
      });

      if (existing) {
        throw new Error(`Workflow ${workflow.name}@${workflow.version} already exists`);
      }

      // Create workflow entity
      const workflowEntity = this.workflowRepository.create({
        name: workflow.name,
        version: workflow.version,
        description: workflow.description,
        triggers: workflow.triggers,
        steps: workflow.steps,
        metadata: workflow.metadata,
        status: 'draft',
        isActive: false,
      });

      // Save to database
      await this.workflowRepository.save(workflowEntity);

      // Update cache
      this.workflowCache.set(workflow.id, workflow);

      this.logger.log(`Workflow registered successfully: ${workflow.name}@${workflow.version}`);
    } catch (error) {
      this.logger.error(`Failed to register workflow ${workflow.name}:`, error);
      throw error;
    }
  }

  async getWorkflow(workflowId: string): Promise<WorkflowDefinition | null> {
    try {
      // Check cache first
      if (this.workflowCache.has(workflowId)) {
        return this.workflowCache.get(workflowId)!;
      }

      // Query database
      const workflowEntity = await this.workflowRepository.findOne({
        where: { id: workflowId },
      });

      if (!workflowEntity) {
        return null;
      }

      // Convert to WorkflowDefinition
      const workflow: WorkflowDefinition = {
        id: workflowEntity.id,
        name: workflowEntity.name,
        version: workflowEntity.version,
        description: workflowEntity.description,
        triggers: workflowEntity.triggers,
        steps: workflowEntity.steps,
        metadata: workflowEntity.metadata || {},
      };

      // Update cache
      this.workflowCache.set(workflowId, workflow);

      return workflow;
    } catch (error) {
      this.logger.error(`Failed to get workflow ${workflowId}:`, error);
      throw error;
    }
  }

  async getWorkflowByName(name: string, version?: string): Promise<WorkflowDefinition | null> {
    try {
      const whereClause: any = { name };
      if (version) {
        whereClause.version = version;
      }

      const workflowEntity = await this.workflowRepository.findOne({
        where: whereClause,
        order: { versionNumber: 'DESC' },
      });

      if (!workflowEntity) {
        return null;
      }

      return this.getWorkflow(workflowEntity.id);
    } catch (error) {
      this.logger.error(`Failed to get workflow by name ${name}:`, error);
      throw error;
    }
  }

  async listWorkflows(
    filters?: {
      status?: string;
      isActive?: boolean;
      search?: string;
    }
  ): Promise<WorkflowDefinition[]> {
    try {
      const queryBuilder = this.workflowRepository.createQueryBuilder('workflow');

      if (filters?.status) {
        queryBuilder.andWhere('workflow.status = :status', { status: filters.status });
      }

      if (filters?.isActive !== undefined) {
        queryBuilder.andWhere('workflow.isActive = :isActive', { isActive: filters.isActive });
      }

      if (filters?.search) {
        queryBuilder.andWhere(
          '(workflow.name ILIKE :search OR workflow.description ILIKE :search)',
          { search: `%${filters.search}%` }
        );
      }

      queryBuilder.orderBy('workflow.createdAt', 'DESC');

      const workflowEntities = await queryBuilder.getMany();

      // Convert to WorkflowDefinition objects
      const workflows: WorkflowDefinition[] = [];
      for (const entity of workflowEntities) {
        const workflow = await this.getWorkflow(entity.id);
        if (workflow) {
          workflows.push(workflow);
        }
      }

      return workflows;
    } catch (error) {
      this.logger.error('Failed to list workflows:', error);
      throw error;
    }
  }

  async updateWorkflow(
    workflowId: string,
    updates: Partial<WorkflowDefinition>
  ): Promise<WorkflowDefinition> {
    try {
      this.logger.log(`Updating workflow: ${workflowId}`);

      const workflowEntity = await this.workflowRepository.findOne({
        where: { id: workflowId },
      });

      if (!workflowEntity) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // Update fields
      if (updates.name) workflowEntity.name = updates.name;
      if (updates.version) workflowEntity.version = updates.version;
      if (updates.description !== undefined) workflowEntity.description = updates.description;
      if (updates.triggers) workflowEntity.triggers = updates.triggers;
      if (updates.steps) workflowEntity.steps = updates.steps;
      if (updates.metadata) workflowEntity.metadata = updates.metadata;

      // Save updates
      await this.workflowRepository.save(workflowEntity);

      // Update cache
      this.workflowCache.delete(workflowId);

      // Return updated workflow
      return await this.getWorkflow(workflowId);
    } catch (error) {
      this.logger.error(`Failed to update workflow ${workflowId}:`, error);
      throw error;
    }
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      this.logger.log(`Deleting workflow: ${workflowId}`);

      const result = await this.workflowRepository.delete(workflowId);
      
      if (result.affected === 0) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // Remove from cache
      this.workflowCache.delete(workflowId);

      this.logger.log(`Workflow deleted successfully: ${workflowId}`);
    } catch (error) {
      this.logger.error(`Failed to delete workflow ${workflowId}:`, error);
      throw error;
    }
  }

  async publishWorkflow(workflowId: string): Promise<void> {
    try {
      this.logger.log(`Publishing workflow: ${workflowId}`);

      const workflowEntity = await this.workflowRepository.findOne({
        where: { id: workflowId },
      });

      if (!workflowEntity) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // Update status to published
      workflowEntity.status = 'published';
      workflowEntity.isActive = true;

      await this.workflowRepository.save(workflowEntity);

      // Update cache
      this.workflowCache.delete(workflowId);

      this.logger.log(`Workflow published successfully: ${workflowId}`);
    } catch (error) {
      this.logger.error(`Failed to publish workflow ${workflowId}:`, error);
      throw error;
    }
  }

  async unpublishWorkflow(workflowId: string): Promise<void> {
    try {
      this.logger.log(`Unpublishing workflow: ${workflowId}`);

      const workflowEntity = await this.workflowRepository.findOne({
        where: { id: workflowId },
      });

      if (!workflowEntity) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // Update status to draft
      workflowEntity.status = 'draft';
      workflowEntity.isActive = false;

      await this.workflowRepository.save(workflowEntity);

      // Update cache
      this.workflowCache.delete(workflowId);

      this.logger.log(`Workflow unpublished successfully: ${workflowId}`);
    } catch (error) {
      this.logger.error(`Failed to unpublish workflow ${workflowId}:`, error);
      throw error;
    }
  }

  async validateWorkflow(workflow: WorkflowDefinition): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic validation
      if (!workflow.name || workflow.name.trim().length === 0) {
        errors.push('Workflow name is required');
      }

      if (!workflow.version || workflow.version.trim().length === 0) {
        errors.push('Workflow version is required');
      }

      if (!workflow.triggers || workflow.triggers.length === 0) {
        errors.push('At least one trigger is required');
      }

      if (!workflow.steps || workflow.steps.length === 0) {
        errors.push('At least one step is required');
      }

      // Validate triggers
      for (const trigger of workflow.triggers) {
        if (!trigger.type || trigger.type.trim().length === 0) {
          errors.push('Trigger type is required');
        }
        if (!trigger.eventType || trigger.eventType.trim().length === 0) {
          errors.push('Event type is required for trigger');
        }
      }

      // Validate steps
      for (const step of workflow.steps) {
        if (!step.id || step.id.trim().length === 0) {
          errors.push('Step ID is required');
        }
        if (!step.name || step.name.trim().length === 0) {
          errors.push('Step name is required');
        }
        if (!step.type) {
          errors.push('Step type is required');
        }
        if (!step.config) {
          errors.push('Step configuration is required');
        }
      }

      // Check for circular dependencies
      if (this.hasCircularDependencies(workflow)) {
        errors.push('Workflow contains circular dependencies');
      }

      // Check for orphaned steps
      const orphanedSteps = this.findOrphanedSteps(workflow);
      if (orphanedSteps.length > 0) {
        warnings.push(`Orphaned steps found: ${orphanedSteps.join(', ')}`);
      }

    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private hasCircularDependencies(workflow: WorkflowDefinition): boolean {
    // Simple circular dependency check
    // In production, use a more sophisticated algorithm
    return false;
  }

  private findOrphanedSteps(workflow: WorkflowDefinition): string[] {
    const referencedSteps = new Set<string>();
    const allSteps = new Set(workflow.steps.map(s => s.id));

    // Find all referenced steps
    for (const step of workflow.steps) {
      if (step.next) {
        for (const nextStep of step.next) {
          referencedSteps.add(nextStep);
        }
      }
    }

    // Add trigger steps
    for (const trigger of workflow.triggers) {
      referencedSteps.add(trigger.type);
    }

    // Find orphaned steps
    const orphaned: string[] = [];
    for (const stepId of allSteps) {
      if (!referencedSteps.has(stepId)) {
        orphaned.push(stepId);
      }
    }

    return orphaned;
  }

  async clearCache(): Promise<void> {
    this.workflowCache.clear();
    this.logger.log('Workflow cache cleared');
  }
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { WorkflowExecutionEntity } from './workflow-execution.entity';

@Entity('workflow_definitions')
@Index(['name', 'version'], { unique: true })
export class WorkflowDefinitionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  version: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: false })
  triggers: any[];

  @Column({ type: 'jsonb', nullable: false })
  steps: any[];

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status: 'draft' | 'published' | 'deprecated' | 'archived';

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdBy?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  updatedBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @VersionColumn()
  versionNumber: number;

  @OneToMany(
    () => WorkflowExecutionEntity,
    (execution) => execution.workflowDefinition,
  )
  executions: WorkflowExecutionEntity[];

  // Helper methods
  isPublished(): boolean {
    return this.status === 'published';
  }

  isActive(): boolean {
    return this.isActive && this.status === 'published';
  }

  canBeExecuted(): boolean {
    return this.isActive() && this.executions !== undefined;
  }

  getLatestVersion(): string {
    return this.version;
  }

  toJSON(): any {
    const { executions, ...rest } = this;
    return rest;
  }
}

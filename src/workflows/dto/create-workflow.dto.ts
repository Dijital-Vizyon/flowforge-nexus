import { IsString, IsArray, IsOptional, IsObject, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkflowTriggerDto {
  @ApiProperty({ description: 'Trigger type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Event type to trigger on' })
  @IsString()
  eventType: string;

  @ApiPropertyOptional({ description: 'Trigger filters' })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Trigger conditions' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conditions?: string[];
}

export class RetryPolicyDto {
  @ApiProperty({ description: 'Maximum retry attempts' })
  @IsString()
  maxAttempts: number;

  @ApiProperty({ description: 'Backoff strategy', enum: ['fixed', 'exponential', 'linear'] })
  @IsEnum(['fixed', 'exponential', 'linear'])
  backoff: 'fixed' | 'exponential' | 'linear';

  @ApiProperty({ description: 'Delay between retries in milliseconds' })
  @IsString()
  delay: number;

  @ApiPropertyOptional({ description: 'Maximum delay in milliseconds' })
  @IsOptional()
  @IsString()
  maxDelay?: number;
}

export class WorkflowStepDto {
  @ApiProperty({ description: 'Step ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Step name' })
  @IsString()
  name: string;

  @ApiProperty({ 
    description: 'Step type', 
    enum: ['action', 'condition', 'loop', 'parallel', 'delay'] 
  })
  @IsEnum(['action', 'condition', 'loop', 'parallel', 'delay'])
  type: 'action' | 'condition' | 'loop' | 'parallel' | 'delay';

  @ApiProperty({ description: 'Step configuration' })
  @IsObject()
  config: Record<string, any>;

  @ApiPropertyOptional({ description: 'Next step IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  next?: string[];

  @ApiPropertyOptional({ description: 'Error handler step ID' })
  @IsOptional()
  @IsString()
  errorHandler?: string;

  @ApiPropertyOptional({ description: 'Retry policy' })
  @IsOptional()
  @ValidateNested()
  @Type(() => RetryPolicyDto)
  retryPolicy?: RetryPolicyDto;
}

export class CreateWorkflowDto {
  @ApiProperty({ description: 'Workflow name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Workflow version' })
  @IsString()
  version: string;

  @ApiPropertyOptional({ description: 'Workflow description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Workflow triggers' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowTriggerDto)
  triggers: WorkflowTriggerDto[];

  @ApiProperty({ description: 'Workflow steps' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps: WorkflowStepDto[];

  @ApiPropertyOptional({ description: 'Workflow metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Created by user' })
  @IsOptional()
  @IsString()
  createdBy?: string;
}

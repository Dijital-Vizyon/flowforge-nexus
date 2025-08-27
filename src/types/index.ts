export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface Event<T = any> {
  id: string;
  type: string;
  data: T;
  metadata: EventMetadata;
  timestamp: Date;
  correlationId?: string;
  causationId?: string;
}

export interface EventMetadata {
  source: string;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  spanId?: string;
  tags?: Record<string, string>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  metadata: Record<string, any>;
}

export interface WorkflowTrigger {
  type: string;
  eventType: string;
  filters?: Record<string, any>;
  conditions?: string[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'loop' | 'parallel' | 'delay';
  config: Record<string, any>;
  next?: string[];
  errorHandler?: string;
  retryPolicy?: RetryPolicy;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoff: 'fixed' | 'exponential' | 'linear';
  delay: number;
  maxDelay?: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep?: string;
  context: Record<string, any>;
  result?: any;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
}

export interface SagaDefinition {
  id: string;
  name: string;
  steps: SagaStep[];
  compensationPolicy: CompensationPolicy;
}

export interface SagaStep {
  id: string;
  name: string;
  action: string;
  compensation?: string;
  dependencies?: string[];
  timeout?: number;
}

export interface CompensationPolicy {
  strategy: 'forward' | 'backward' | 'mixed';
  maxCompensations: number;
  parallelCompensation: boolean;
}

export interface Message<T = any> {
  id: string;
  type: string;
  payload: T;
  headers: Record<string, string>;
  timestamp: Date;
  correlationId?: string;
  replyTo?: string;
}

export interface WorkflowContext {
  executionId: string;
  workflowId: string;
  stepId: string;
  data: Record<string, any>;
  metadata: Record<string, any>;
}

export interface StepResult {
  success: boolean;
  data?: any;
  error?: string;
  nextSteps?: string[];
  metadata?: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface Metrics {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: Date;
}

export interface TraceSpan {
  id: string;
  traceId: string;
  parentId?: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  attributes: Record<string, any>;
  events: TraceEvent[];
}

export interface TraceEvent {
  name: string;
  timestamp: Date;
  attributes: Record<string, any>;
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: Record<string, HealthCheckResult>;
  timestamp: Date;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  details?: any;
  timestamp: Date;
}

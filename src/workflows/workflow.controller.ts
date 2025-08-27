import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import { WorkflowEngine } from '../core/workflow-engine';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { ExecuteWorkflowDto } from './dto/execute-workflow.dto';
import { WorkflowDefinitionEntity } from './entities/workflow-definition.entity';
import { WorkflowExecutionEntity } from './entities/workflow-execution.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@ApiTags('Workflows')
@Controller('api/workflows')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly workflowEngine: WorkflowEngine,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new workflow definition' })
  @ApiResponse({
    status: 201,
    description: 'Workflow created successfully',
    type: WorkflowDefinitionEntity,
  })
  async createWorkflow(
    @Body() createWorkflowDto: CreateWorkflowDto,
  ): Promise<WorkflowDefinitionEntity> {
    return this.workflowService.createWorkflow(createWorkflowDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all workflow definitions' })
  @ApiResponse({
    status: 200,
    description: 'List of workflows retrieved successfully',
    type: [WorkflowDefinitionEntity],
  })
  async getWorkflows(
    @Query() paginationDto: PaginationDto,
  ): Promise<{ data: WorkflowDefinitionEntity[]; total: number }> {
    return this.workflowService.getWorkflows(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow definition by ID' })
  @ApiResponse({
    status: 200,
    description: 'Workflow retrieved successfully',
    type: WorkflowDefinitionEntity,
  })
  async getWorkflow(@Param('id') id: string): Promise<WorkflowDefinitionEntity> {
    return this.workflowService.getWorkflow(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update workflow definition' })
  @ApiResponse({
    status: 200,
    description: 'Workflow updated successfully',
    type: WorkflowDefinitionEntity,
  })
  async updateWorkflow(
    @Param('id') id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto,
  ): Promise<WorkflowDefinitionEntity> {
    return this.workflowService.updateWorkflow(id, updateWorkflowDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete workflow definition' })
  @ApiResponse({
    status: 204,
    description: 'Workflow deleted successfully',
  })
  async deleteWorkflow(@Param('id') id: string): Promise<void> {
    return this.workflowService.deleteWorkflow(id);
  }

  @Post(':id/execute')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Execute a workflow' })
  @ApiResponse({
    status: 202,
    description: 'Workflow execution started',
    type: WorkflowExecutionEntity,
  })
  async executeWorkflow(
    @Param('id') id: string,
    @Body() executeWorkflowDto: ExecuteWorkflowDto,
  ): Promise<WorkflowExecutionEntity> {
    return this.workflowService.executeWorkflow(id, executeWorkflowDto);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Get workflow executions' })
  @ApiResponse({
    status: 200,
    description: 'List of executions retrieved successfully',
    type: [WorkflowExecutionEntity],
  })
  async getWorkflowExecutions(
    @Param('id') id: string,
    @Query() paginationDto: PaginationDto,
  ): Promise<{ data: WorkflowExecutionEntity[]; total: number }> {
    return this.workflowService.getWorkflowExecutions(id, paginationDto);
  }

  @Get('executions/:executionId')
  @ApiOperation({ summary: 'Get workflow execution by ID' })
  @ApiResponse({
    status: 200,
    description: 'Execution retrieved successfully',
    type: WorkflowExecutionEntity,
  })
  async getExecution(@Param('executionId') executionId: string): Promise<WorkflowExecutionEntity> {
    return this.workflowService.getExecution(executionId);
  }

  @Post('executions/:executionId/cancel')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Cancel workflow execution' })
  @ApiResponse({
    status: 202,
    description: 'Execution cancellation requested',
  })
  async cancelExecution(@Param('executionId') executionId: string): Promise<void> {
    return this.workflowService.cancelExecution(executionId);
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validate workflow definition' })
  @ApiResponse({
    status: 200,
    description: 'Workflow validation result',
  })
  async validateWorkflow(@Param('id') id: string): Promise<any> {
    return this.workflowService.validateWorkflow(id);
  }

  @Post(':id/deploy')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Deploy workflow to runtime' })
  @ApiResponse({
    status: 202,
    description: 'Workflow deployment started',
  })
  async deployWorkflow(@Param('id') id: string): Promise<void> {
    return this.workflowService.deployWorkflow(id);
  }

  @Post(':id/undeploy')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Undeploy workflow from runtime' })
  @ApiResponse({
    status: 202,
    description: 'Workflow undeployment started',
  })
  async undeployWorkflow(@Param('id') id: string): Promise<void> {
    return this.workflowService.undeployWorkflow(id);
  }
}

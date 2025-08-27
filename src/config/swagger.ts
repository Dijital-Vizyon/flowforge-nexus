import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('FlowForge Nexus API')
    .setDescription('Next-Generation Event-Driven Workflow Automation Platform')
    .setVersion('1.0.0')
    .addTag('Workflows', 'Workflow management and execution')
    .addTag('Events', 'Event publishing and subscription')
    .addTag('Sagas', 'Distributed saga orchestration')
    .addTag('Messaging', 'Message routing and delivery')
    .addTag('Monitoring', 'Metrics, tracing, and health checks')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showRequestHeaders: true,
    },
  });
}

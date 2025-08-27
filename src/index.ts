import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { setupSwagger } from './config/swagger';
import { setupGlobalPipes } from './config/pipes';
import { setupGlobalFilters } from './config/filters';
import { setupGlobalInterceptors } from './config/interceptors';
import { setupSecurity } from './config/security';
import { setupMonitoring } from './config/monitoring';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Setup global configurations
    setupSecurity(app);
    setupGlobalPipes(app);
    setupGlobalFilters(app);
    setupGlobalInterceptors(app);
    setupMonitoring(app);
    setupSwagger(app);

    const port = process.env.PORT || 3000;
    await app.listen(port);
    
    logger.log(`🚀 FlowForge Nexus is running on: http://localhost:${port}`);
    logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
    logger.log(`📊 Metrics: http://localhost:${port}/metrics`);
    
  } catch (error) {
    logger.error('Failed to start FlowForge Nexus:', error);
    process.exit(1);
  }
}

bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { useContainer, ValidationError } from 'class-validator';
import { setupSwagger } from './config/swagger';
import { JwtAuthGuard } from './auth/guards/jwt/jwt-auth-guard';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  app.enableCors({
    origin: '*',
  });
  app.setGlobalPrefix('/api/v1');
  // app.useGlobalGuards(new JwtAuthGuard());

  // app.use(json({ limit: '50mb' }));
  // app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        const message = Object.values(
          validationErrors[0].constraints || '',
        ).join(', ');
        return new BadRequestException(message);
      },
    }),
  );
  setupSwagger(app);
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  await app.listen(4000, '0.0.0.0');
}
bootstrap();

import { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerDocumentOptions,
  SwaggerModule,
} from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Hire Core')
  .setDescription('API.')
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'Authorization',
      in: 'header',
    },
    'access-token',
  )
  // AI agent-аас дуудагдах endpoint-уудад (жиш: pdf-template/ai-export/:code)
  // зориулсан тогтмол API key (core/.env-ийн AI_AGENT_KEY, AiAgentGuard-аар
  // шалгагдана) — Swagger UI-ийн баруун дээд "Authorize" товч дор энэ
  // нэрээр (x-ai-agent-key) тусад нь орох талбар гарч ирнэ.
  .addApiKey(
    {
      type: 'apiKey',
      name: 'x-ai-agent-key',
      in: 'header',
    },
    'ai-agent-key',
  )
  .build();

const options: SwaggerDocumentOptions = {
  operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
};

const customOptions: SwaggerCustomOptions = {
  swaggerOptions: {
    tagsSorter: 'alpha',
  },
  customSiteTitle: 'Swagger API',
};

export const setupSwagger = (app: INestApplication) => {
  const document = SwaggerModule.createDocument(app, config, options);
  SwaggerModule.setup('/docs', app, document, customOptions);
};

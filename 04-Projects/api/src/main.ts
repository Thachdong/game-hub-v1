import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerBuilder = new DocumentBuilder()
    .setTitle('Game Hub API')
    .setDescription('Account & Social Module')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerBuilder);
  SwaggerModule.setup('api/docs', app, document);

  // Write generated OpenAPI spec to file for tooling
  fs.writeFileSync('openapi.yml', yaml.dump(document, { noRefs: true }));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') ?? 3000;
  await app.listen(port);
}

bootstrap();

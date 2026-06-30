import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { AppModule } from '../app.module';

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const swaggerBuilder = new DocumentBuilder()
    .setTitle('Game Hub API')
    .setDescription('Account & Social Module')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerBuilder);
  fs.writeFileSync('openapi.yml', yaml.dump(document, { noRefs: true }));
  console.log('openapi.yml written successfully');

  await app.close();
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});

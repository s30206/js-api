import { readFileSync } from 'node:fs';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { createApiRouter } from './routes/index.js';

const openApiSpec = YAML.parse(readFileSync(new URL('./docs/openapi.yaml', import.meta.url), 'utf8'));

export function createApp(container) {
  const app = express();

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.use(express.json());
  app.use('/api', createApiRouter(container));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

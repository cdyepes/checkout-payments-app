import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { createApp } from './create-app';
import { Env } from './shared/config/env.schema';

async function bootstrap(): Promise<void> {
  const app = await createApp();
  const config = app.get(ConfigService<Env, true>);

  const port = config.get('PORT', { infer: true });
  // Explicit 0.0.0.0 binding — required for Cloud Run (and harmless locally)
  // since it forwards traffic to the container over its internal network,
  // not localhost.
  await app.listen(port, '0.0.0.0');
  console.log(`API listening on http://localhost:${port}/api (docs at /docs)`);
}

void bootstrap();

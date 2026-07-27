import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { createApp } from './create-app';
import { Env } from './shared/config/env.schema';

async function bootstrap(): Promise<void> {
  const app = await createApp();
  const config = app.get(ConfigService<Env, true>);

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}/api (docs at /docs)`);
}

void bootstrap();

import 'reflect-metadata';
import serverlessExpress from '@vendia/serverless-express';
import type { Handler } from 'aws-lambda';
import { createApp } from './create-app';

let cachedHandler: Handler | undefined;

export const handler: Handler = async (event, context, callback) => {
  if (!cachedHandler) {
    const app = await createApp();
    await app.init();
    cachedHandler = serverlessExpress({ app: app.getHttpAdapter().getInstance() });
  }
  return cachedHandler(event, context, callback);
};

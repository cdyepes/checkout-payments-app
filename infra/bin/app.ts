#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { GithubOidcStack } from '../lib/github-oidc-stack';
import { ApiStack } from '../lib/api-stack';
import { WebStack } from '../lib/web-stack';

const GITHUB_ORG = 'cdyepes';
const GITHUB_REPO = 'checkout-payments-app';
// Must match the GitHub Environment name exactly (case-sensitive) — see
// deploy.yml's `environment:` key and github-oidc-stack.ts's trust policy.
const GITHUB_ENVIRONMENT = 'Testing';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
};

// Deployed once, by hand, with the user's own AWS credentials — see infra/README.md.
new GithubOidcStack(app, 'GithubOidcStack', {
  env,
  githubOrg: GITHUB_ORG,
  githubRepo: GITHUB_REPO,
  githubEnvironment: GITHUB_ENVIRONMENT,
});

// Deployed by CI (deploy.yml) on every merge to main, in this order: WebStack
// first (ApiStack's CORS_ORIGIN needs its domain), then ApiStack.
const webStack = new WebStack(app, 'WebStack', { env });

new ApiStack(app, 'ApiStack', {
  env,
  corsOrigin: `https://${webStack.distributionDomainName}`,
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  paymentsApiUrl: process.env.PAYMENTS_API_URL ?? 'https://sandbox.wompi.co/v1',
  paymentsPublicKey: process.env.PAYMENTS_PUBLIC_KEY ?? '',
  paymentsPrivateKey: process.env.PAYMENTS_PRIVATE_KEY ?? '',
  paymentsIntegrityKey: process.env.PAYMENTS_INTEGRITY_KEY ?? '',
  paymentsEventsKey: process.env.PAYMENTS_EVENTS_KEY ?? '',
});

# Deployment infrastructure

A standalone CDK app (not an npm workspace member — its dependencies and lockfile are isolated
from the rest of the monorepo). Three stacks:

- **`GithubOidcStack`** — a GitHub OIDC provider + an IAM role GitHub Actions can assume, trusted
  only for `push` to `main` on this exact repo. **Deployed once, by hand, with your own AWS
  credentials** — nothing else can bootstrap this, since CI has no way to authenticate until this
  role exists.
- **`WebStack`** — private S3 bucket + CloudFront (Origin Access Control only, no public bucket
  access) with a security-headers response policy and SPA-routing fallback.
- **`ApiStack`** — the NestJS API as a Docker-image Lambda (`apps/api/Dockerfile`) behind a
  Function URL.

`WebStack` and `ApiStack` are deployed by `.github/workflows/deploy.yml` on every merge to `main`.

## One-time setup

You'll need an AWS account and the AWS CLI configured locally (`aws configure` or `aws sso login`)
for these one-time steps — after this, deploys are fully automatic via CI and you won't need local
AWS credentials again.

```bash
cd infra
npm install

# 1. Bootstrap CDK in your account/region (creates the deploy/file-publishing/
#    image-publishing/lookup roles the GitHub OIDC role will assume).
npx cdk bootstrap aws://<your-account-id>/us-east-1

# 2. Deploy the OIDC stack. This is the only stack you deploy by hand.
npx cdk deploy GithubOidcStack

# 3. Copy the "DeployRoleArn" output — you'll need it for the GitHub secret below.
```

If you deploy to a region other than `us-east-1`, update `AWS_REGION` in
`.github/workflows/deploy.yml` and the region in the bootstrap command above to match.

## GitHub repository secrets

Add these under **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | The `DeployRoleArn` output from step 3 above |
| `DATABASE_URL` | Your Neon Postgres connection string (production database) |
| `PAYMENTS_API_URL` | Same sandbox/UAT value as your local `.env` |
| `PAYMENTS_PUBLIC_KEY` | Same as local `.env` |
| `PAYMENTS_PRIVATE_KEY` | Same as local `.env` |
| `PAYMENTS_INTEGRITY_KEY` | Same as local `.env` |
| `PAYMENTS_EVENTS_KEY` | Same as local `.env` |

No long-lived AWS access keys anywhere — the deploy role is assumed via OIDC per run.

## What happens on merge to `main`

`deploy.yml`: assumes the OIDC role → deploys `WebStack` (S3 + CloudFront) → deploys `ApiStack`
(Lambda, with `CORS_ORIGIN` set to the just-created CloudFront domain) → runs
`prisma migrate deploy` + the (idempotent) seed script against Neon → builds the web app with the
real API URL baked in → syncs the build to S3 → invalidates the CloudFront cache.

## Local commands

```bash
npm run typecheck   # tsc --noEmit
npm run synth       # cdk synth — validates the app, builds the Lambda Docker image locally
npm run diff        # cdk diff — see what would change against the deployed stacks
```

`cdk synth`/`diff`/`deploy` all need Docker running locally (the API stack's Lambda is a Docker
image asset) and, for anything beyond `synth`, real AWS credentials in your environment.

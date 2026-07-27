# Build context is the monorepo root (needed for the npm workspaces install and
# packages/contracts) — see infra/lib/api-stack.ts, which points fromImageAsset
# at '../../' with this file as the --file.

FROM node:20-slim AS build
WORKDIR /app

# Prisma's engine-detection needs openssl on the build image; without it,
# `prisma generate` falls back to a guessed libssl version instead of
# reliably resolving the ones named in binaryTargets below.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Copy just the manifests first so `npm ci` is cached across source-only changes.
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm ci

COPY packages/contracts packages/contracts
COPY apps/api apps/api

RUN npm run build -w @checkout/contracts
RUN npm run db:generate -w @checkout/api
RUN npm run build -w @checkout/api
RUN npm prune --omit=dev

FROM public.ecr.aws/lambda/nodejs:20 AS runtime
COPY --from=build /app ${LAMBDA_TASK_ROOT}
CMD ["apps/api/dist/lambda.handler"]

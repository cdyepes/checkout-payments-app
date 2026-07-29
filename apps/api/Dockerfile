# Build context is the monorepo root (needed for the npm workspaces install and
# packages/contracts) — see .github/workflows/deploy.yml, which builds this
# with `docker build -f apps/api/Dockerfile .` and pushes it for Cloud Run.

FROM node:20-slim AS build
WORKDIR /app

# Without openssl on the image, Prisma can't detect the actual libssl version
# and falls back to a guess — which could silently download an incompatible
# engine even when build and runtime share a base image.
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

# Same base image as the build stage (unlike Lambda's separate Amazon Linux
# runtime layer), so Prisma's "native" engine target — generated above — is
# already correct here. No cross-platform binary target juggling needed.
#
# openssl must be installed here too, not just in the build stage: Prisma
# re-resolves the engine at process startup, and without it this stage's
# detection guesses a different (wrong) libssl version than build time did,
# even though the underlying image is identical — confirmed by actually
# running the built image locally, not just checking that `docker build`
# succeeds.
FROM node:20-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=build /app /app
# Cloud Run injects its own PORT env var and expects the container to listen
# on it (main.ts reads process.env.PORT via ConfigModule) — 8080 is Cloud
# Run's default, documented here for local `docker run` convenience only.
EXPOSE 8080
CMD ["node", "apps/api/dist/main.js"]

# Checkout Payments App

A mobile-first checkout SPA (React + Redux) backed by a NestJS API, built around Hexagonal
Architecture / Ports & Adapters and Railway Oriented Programming.

This is iteration 1: the monorepo scaffold and a complete vertical slice (products) that every
later bounded context follows as a template. Checkout business logic, the payment gateway
integration and cloud deployment land in the next iteration.

## Stack

- **Frontend**: React + TypeScript, Vite, Redux Toolkit + `redux-persist`, react-router, CSS
  Modules, Jest + React Testing Library.
- **Backend**: NestJS + TypeScript, Prisma + PostgreSQL, `neverthrow` for Railway Oriented
  Programming, Zod (`nestjs-zod`) for validation and OpenAPI generation, Jest.
- **Shared**: `packages/contracts` — Zod schemas as the single source of truth for request/response
  shapes, consumed by both apps.

## Repository layout

```
apps/
  api/           NestJS backend (one hexagon per bounded context: domain / application / infrastructure)
  web/           React SPA
packages/
  contracts/     Shared Zod schemas + inferred TypeScript types
infra/           IaC (added with the deployment iteration)
```

## Prerequisites

- Node.js 22+
- Docker (for local PostgreSQL)

## Getting started

```bash
npm install
docker compose up -d db
cp .env.example .env

npm run db:migrate -w @checkout/api -- --name init
npm run db:seed -w @checkout/api

npm run dev:api   # http://localhost:3000/api, Swagger at /docs
npm run dev:web   # http://localhost:5173
```

## Testing

```bash
npm run test:cov   # runs both apps' Jest suites with the 80% coverage gate enforced
```

## Data model

_TODO — added once the transaction/delivery business rules are decided (next iteration)._
The current schema (`apps/api/prisma/schema.prisma`) already models `Product`, `Customer`,
`Transaction` and `Delivery`.

## API documentation

Swagger UI is served at `/docs` when the API is running locally. A public Swagger/Postman link
is added once the API is deployed.

## Test coverage

_TODO — filled in once the full checkout flow is implemented._

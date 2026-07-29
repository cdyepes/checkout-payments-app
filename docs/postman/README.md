# Postman collection

`checkout-payments-api.postman_collection.json` covers every endpoint in the API (products,
customers, deliveries, transactions), generated from the live OpenAPI document that Swagger
already serves at `/docs-json` — no endpoints are hand-maintained separately from the Swagger
annotations in the controllers.

## Import

Postman → Import → select the file. It has one collection variable, `baseUrl`, defaulting to
`http://localhost:3000`; override it (collection → Variables tab) to point at a deployed
environment instead, e.g. the live Cloud Run URL.

## Regenerating after an API change

The collection is a point-in-time export, not something wired into CI — regenerate it whenever
the controllers change:

```bash
npm run dev:api                                     # in one terminal
curl -s localhost:3000/docs-json -o /tmp/openapi.json
npx openapi-to-postmanv2 -s /tmp/openapi.json -o docs/postman/checkout-payments-api.postman_collection.json -p
```

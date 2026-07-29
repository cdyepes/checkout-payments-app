# Deployment (GCP)

- **API**: NestJS as a plain Docker container (`apps/api/Dockerfile`) on **Cloud Run**.
- **Web**: the React SPA on **Firebase Hosting** (`apps/web/firebase.json`).
- **CI/CD**: `.github/workflows/deploy.yml`, authenticating via Workload Identity Federation —
  no long-lived service account keys stored anywhere.

## One-time setup

You'll need `gcloud` authenticated locally (`gcloud auth login`) and a GCP project with billing
enabled.

```bash
GCP_PROJECT_ID=<your-project-id> GITHUB_REPO=cdyepes/checkout-payments-app ./infra/setup-gcp.sh
```

This enables the required APIs, creates an Artifact Registry repository for the API's container
images, creates a deploy service account with the minimum roles needed (Cloud Run, Artifact
Registry, Firebase Hosting), and sets up Workload Identity Federation trusting GitHub's OIDC
issuer, scoped to this exact repo.

It prints four values at the end — add them as GitHub repository secrets (Settings → Secrets and
variables → Actions):

| Secret | Value |
|---|---|
| `GCP_PROJECT_ID` | Your project ID |
| `GCP_REGION` | Region used (default `us-central1`) |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Printed by the script |
| `GCP_SERVICE_ACCOUNT` | Printed by the script |

Also add the existing `DATABASE_URL` and `PAYMENTS_*` secrets if not already present (unchanged
from before — same Neon connection string and sandbox/UAT payment keys).

Then link the project to Firebase once (needed for Hosting):

```bash
npx firebase-tools projects:addfirebase <your-project-id>
```

## What happens on merge to `main`

`deploy.yml`: authenticates via Workload Identity Federation → builds the API's Docker image and
pushes it to Artifact Registry → deploys it to Cloud Run → runs `prisma migrate deploy` + the
(idempotent) seed script against Neon → builds the web app with the live Cloud Run URL baked in
→ deploys it to Firebase Hosting.

## Local commands

```bash
docker build -f apps/api/Dockerfile -t checkout-api:local .   # verify the image builds
docker run --rm -p 8080:8080 -e DATABASE_URL=... checkout-api:local  # run it locally
```

## Note on the earlier AWS attempt

This project originally deployed to AWS (Lambda + Function URL for the API, S3 + CloudFront for
the web tier), all built with CDK. That work is preserved in git history (see the "Iteration 6:
Deployment" PR and follow-up OIDC debugging commits) but was abandoned after AWS's standard
new-account verification hold on CloudFront went unresolved for several days — a manual-review
gate unrelated to the code itself. GCP's equivalent services (Cloud Run, Firebase Hosting) don't
have a comparable hold for this kind of usage.

#!/usr/bin/env bash
# One-time GCP setup for CI/CD deploys — run this once, by hand, with your own
# gcloud credentials (`gcloud auth login` first if needed). It sets up
# Workload Identity Federation so GitHub Actions can deploy without any
# long-lived service account keys.
#
# Usage:
#   GCP_PROJECT_ID=my-project GITHUB_REPO=owner/repo ./infra/setup-gcp.sh
#
# Optional: REGION (default us-central1)

set -euo pipefail

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
: "${GITHUB_REPO:?Set GITHUB_REPO, e.g. cdyepes/checkout-payments-app}"
REGION="${REGION:-us-central1}"

POOL_ID="github-pool"
PROVIDER_ID="github-provider"
SERVICE_ACCOUNT_ID="github-deployer"
REPOSITORY_ID="checkout-api"

echo "== Enabling required APIs =="
gcloud services enable \
  iamcredentials.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  firebasehosting.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --project="$GCP_PROJECT_ID"

echo "== Creating Artifact Registry repository =="
gcloud artifacts repositories create "$REPOSITORY_ID" \
  --project="$GCP_PROJECT_ID" \
  --repository-format=docker \
  --location="$REGION" \
  --description="Checkout API container images" \
  || echo "  (already exists, skipping)"

echo "== Creating deploy service account =="
gcloud iam service-accounts create "$SERVICE_ACCOUNT_ID" \
  --project="$GCP_PROJECT_ID" \
  --display-name="GitHub Actions Deployer" \
  || echo "  (already exists, skipping)"

DEPLOYER_EMAIL="${SERVICE_ACCOUNT_ID}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

echo "== Granting roles to the deploy service account =="
for ROLE in roles/run.admin roles/artifactregistry.writer roles/firebasehosting.admin roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
    --member="serviceAccount:${DEPLOYER_EMAIL}" \
    --role="$ROLE" \
    --condition=None \
    --quiet
done

echo "== Creating Workload Identity Pool =="
gcloud iam workload-identity-pools create "$POOL_ID" \
  --project="$GCP_PROJECT_ID" \
  --location="global" \
  --display-name="GitHub Actions Pool" \
  || echo "  (already exists, skipping)"

echo "== Creating Workload Identity Provider (trusts GitHub OIDC, scoped to this repo) =="
# Uses the "repository" claim, not "sub" — GitHub documents "repository" as a
# stable "owner/repo" string regardless of job context (ref vs environment),
# unlike "sub", whose exact format can vary (confirmed the hard way while
# setting up the AWS version of this pipeline).
gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
  --project="$GCP_PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="$POOL_ID" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='${GITHUB_REPO}'" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  || echo "  (already exists, skipping)"

PROJECT_NUMBER=$(gcloud projects describe "$GCP_PROJECT_ID" --format='value(projectNumber)')

echo "== Allowing the pool to impersonate the deploy service account =="
gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER_EMAIL" \
  --project="$GCP_PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${GITHUB_REPO}"

WORKLOAD_IDENTITY_PROVIDER="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}"

echo
echo "== Done. Add these as GitHub repository secrets: =="
echo "GCP_PROJECT_ID=${GCP_PROJECT_ID}"
echo "GCP_REGION=${REGION}"
echo "GCP_WORKLOAD_IDENTITY_PROVIDER=${WORKLOAD_IDENTITY_PROVIDER}"
echo "GCP_SERVICE_ACCOUNT=${DEPLOYER_EMAIL}"
echo
echo "Also run once, manually, to link this GCP project to Firebase (needed for Hosting):"
echo "  npx firebase-tools projects:addfirebase ${GCP_PROJECT_ID}"

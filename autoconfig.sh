#!/usr/bin/env bash
# ParallelCS, idempotent one-shot deploy.
#
# Blank prerequisites -> running Cloud Run service. Re-runnable: every step checks
# for existing state and only creates what is missing. No manual steps.
#
# Requires: gcloud CLI, authenticated (`gcloud auth login`) with rights on the
# project. No service account keys are created or used, auth is ADC only.
#
#   ./autoconfig.sh
#
set -euo pipefail

# --- config (override via environment) --------------------------------------
PROJECT="${GCP_PROJECT:-dmjone}"
REGION="${REGION:-asia-south1}"
SERVICE="${SERVICE:-parallelcs}"
RUNTIME_SA_ID="${RUNTIME_SA_ID:-parallelcs-run}"
CONTENT_BUCKET="${CONTENT_BUCKET:-dmjone-parallelcs-content}"
VERTEX_LOCATION="${VERTEX_LOCATION:-global}"
GEMINI_MODEL="${GEMINI_MODEL:-gemini-2.5-flash}"
DOMAIN="${DOMAIN:-parallelcs.dmj.one}"

RUNTIME_SA="${RUNTIME_SA_ID}@${PROJECT}.iam.gserviceaccount.com"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { printf '[%s] %s\n' "$(date -u +%H:%M:%SZ)" "$*"; }

log "Project=${PROJECT} Region=${REGION} Service=${SERVICE}"
gcloud config set project "${PROJECT}" --quiet >/dev/null

# --- 1. enable required APIs (no-op if already enabled) ---------------------
log "Ensuring required APIs are enabled..."
gcloud services enable \
  run.googleapis.com aiplatform.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com storage.googleapis.com \
  logging.googleapis.com monitoring.googleapis.com --quiet

# --- 2. runtime service account ---------------------------------------------
if gcloud iam service-accounts describe "${RUNTIME_SA}" >/dev/null 2>&1; then
  log "Runtime SA ${RUNTIME_SA} already exists."
else
  log "Creating runtime SA ${RUNTIME_SA}..."
  gcloud iam service-accounts create "${RUNTIME_SA_ID}" \
    --display-name="ParallelCS Cloud Run runtime" \
    --description="Runtime SA for parallelcs Cloud Run service - Vertex + its content bucket only"
fi

# --- 3. content bucket ------------------------------------------------------
if gcloud storage buckets describe "gs://${CONTENT_BUCKET}" >/dev/null 2>&1; then
  log "Bucket gs://${CONTENT_BUCKET} already exists."
else
  log "Creating private bucket gs://${CONTENT_BUCKET}..."
  gcloud storage buckets create "gs://${CONTENT_BUCKET}" \
    --location="${REGION}" \
    --uniform-bucket-level-access \
    --public-access-prevention
fi

# --- 4. least-privilege IAM (add-iam-policy-binding is idempotent) ----------
log "Binding least-privilege IAM for ${RUNTIME_SA}..."
gcloud storage buckets add-iam-policy-binding "gs://${CONTENT_BUCKET}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/storage.objectAdmin" >/dev/null

for ROLE in roles/aiplatform.user roles/logging.logWriter roles/monitoring.metricWriter; do
  gcloud projects add-iam-policy-binding "${PROJECT}" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role="${ROLE}" --condition=None >/dev/null
done

# Let the current deployer act as the runtime SA so `run deploy` can attach it.
DEPLOYER="$(gcloud config get-value account 2>/dev/null)"
if [[ -n "${DEPLOYER}" ]]; then
  log "Granting ${DEPLOYER} serviceAccountUser on ${RUNTIME_SA}..."
  gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_SA}" \
    --member="user:${DEPLOYER}" \
    --role="roles/iam.serviceAccountUser" >/dev/null
fi

# --- 5. deploy from source --------------------------------------------------
# Cloud Build builds the container; no local Docker needed. Scale-to-zero,
# default CPU throttling (CPU billed only during requests) => $0 idle.
log "Deploying ${SERVICE} from source (Cloud Build)..."
gcloud run deploy "${SERVICE}" \
  --source "${SOURCE_DIR}" \
  --region "${REGION}" \
  --service-account="${RUNTIME_SA}" \
  --min-instances=0 --max-instances=4 \
  --cpu=1 --memory=512Mi --concurrency=80 --timeout=120 \
  --allow-unauthenticated \
  --set-env-vars="CONTENT_BUCKET=${CONTENT_BUCKET},GCP_PROJECT=${PROJECT},VERTEX_LOCATION=${VERTEX_LOCATION},GEMINI_MODEL=${GEMINI_MODEL},NODE_ENV=production" \
  --quiet

URL="$(gcloud run services describe "${SERVICE}" --region "${REGION}" --format='value(status.url)')"
log "Deployed: ${URL}"

# --- 6. health check --------------------------------------------------------
log "Checking ${URL}/health ..."
if curl -fsS --max-time 30 "${URL}/health" >/dev/null; then
  log "Health check OK (200)."
else
  log "WARNING: health check did not return 200, inspect logs:"
  log "  gcloud run services logs read ${SERVICE} --region ${REGION}"
fi

# --- 7. custom domain mapping (best effort) ---------------------------------
if gcloud beta run domain-mappings describe --domain="${DOMAIN}" --region="${REGION}" >/dev/null 2>&1; then
  log "Domain mapping ${DOMAIN} already exists."
else
  log "Creating domain mapping ${DOMAIN} (best effort)..."
  gcloud beta run domain-mappings create \
    --service="${SERVICE}" --domain="${DOMAIN}" --region="${REGION}" --quiet \
    || log "Domain mapping not created, CNAME the *.run.app host instead (see deploy/README.md)."
fi

log "Done. Service URL: ${URL}"

#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-hackathon-2026-496821}"
REGION="${REGION:-us-central1}"

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  routeoptimization.googleapis.com \
  --project "${PROJECT_ID}"

gcloud run deploy gopath-agent \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --source services/agent \
  --allow-unauthenticated \
  --env-vars-file deploy/gopath-agent.env.yaml

AGENT_URL="$(gcloud run services describe gopath-agent --project "${PROJECT_ID}" --region "${REGION}" --format='value(status.url)')"

gcloud run deploy gopath-api \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --source . \
  --allow-unauthenticated \
  --command npm \
  --args=run,start:api \
  --env-vars-file deploy/gopath-api.env.yaml \
  --update-env-vars "AGENT_SERVICE_URL=${AGENT_URL}"

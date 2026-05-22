@echo off
REM ParallelCS - idempotent one-shot deploy (Windows).
REM
REM Blank prerequisites -> running Cloud Run service. Re-runnable: each step
REM only creates what is missing. No manual steps. No service account keys.
REM
REM Requires: gcloud CLI, authenticated. Auth is ADC only.
REM
REM   autoconfig.bat
REM
setlocal enableextensions

if "%GCP_PROJECT%"==""     set "GCP_PROJECT=dmjone"
if "%REGION%"==""          set "REGION=asia-south1"
if "%SERVICE%"==""         set "SERVICE=parallelcs"
if "%RUNTIME_SA_ID%"==""   set "RUNTIME_SA_ID=parallelcs-run"
if "%CONTENT_BUCKET%"==""  set "CONTENT_BUCKET=dmjone-parallelcs-content"
if "%VERTEX_LOCATION%"=="" set "VERTEX_LOCATION=global"
if "%GEMINI_MODEL%"==""    set "GEMINI_MODEL=gemini-2.5-flash"
if "%DOMAIN%"==""          set "DOMAIN=parallelcs.dmj.one"

set "RUNTIME_SA=%RUNTIME_SA_ID%@%GCP_PROJECT%.iam.gserviceaccount.com"
set "SOURCE_DIR=%~dp0"

echo [autoconfig] Project=%GCP_PROJECT% Region=%REGION% Service=%SERVICE%
call gcloud config set project %GCP_PROJECT% --quiet || goto :fail

echo [autoconfig] Ensuring required APIs are enabled...
call gcloud services enable run.googleapis.com aiplatform.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com storage.googleapis.com logging.googleapis.com monitoring.googleapis.com --quiet || goto :fail

echo [autoconfig] Ensuring runtime service account...
call gcloud iam service-accounts describe %RUNTIME_SA% >nul 2>&1
if errorlevel 1 (
  call gcloud iam service-accounts create %RUNTIME_SA_ID% --display-name="ParallelCS Cloud Run runtime" --description="Runtime SA for parallelcs Cloud Run service - Vertex + its content bucket only" || goto :fail
) else (
  echo [autoconfig] Runtime SA already exists.
)

echo [autoconfig] Ensuring content bucket...
call gcloud storage buckets describe gs://%CONTENT_BUCKET% >nul 2>&1
if errorlevel 1 (
  call gcloud storage buckets create gs://%CONTENT_BUCKET% --location=%REGION% --uniform-bucket-level-access --public-access-prevention || goto :fail
) else (
  echo [autoconfig] Bucket already exists.
)

echo [autoconfig] Binding least-privilege IAM...
call gcloud storage buckets add-iam-policy-binding gs://%CONTENT_BUCKET% --member="serviceAccount:%RUNTIME_SA%" --role="roles/storage.objectAdmin" >nul || goto :fail
for %%R in (roles/aiplatform.user roles/logging.logWriter roles/monitoring.metricWriter) do (
  call gcloud projects add-iam-policy-binding %GCP_PROJECT% --member="serviceAccount:%RUNTIME_SA%" --role="%%R" --condition=None >nul || goto :fail
)

for /f "delims=" %%A in ('gcloud config get-value account 2^>nul') do set "DEPLOYER=%%A"
if not "%DEPLOYER%"=="" (
  echo [autoconfig] Granting %DEPLOYER% serviceAccountUser on runtime SA...
  call gcloud iam service-accounts add-iam-policy-binding %RUNTIME_SA% --member="user:%DEPLOYER%" --role="roles/iam.serviceAccountUser" >nul || goto :fail
)

echo [autoconfig] Deploying %SERVICE% from source (Cloud Build)...
call gcloud run deploy %SERVICE% --source "%SOURCE_DIR%" --region %REGION% --service-account=%RUNTIME_SA% --min-instances=0 --max-instances=4 --cpu=1 --memory=512Mi --concurrency=80 --timeout=120 --allow-unauthenticated --set-env-vars="CONTENT_BUCKET=%CONTENT_BUCKET%,GCP_PROJECT=%GCP_PROJECT%,VERTEX_LOCATION=%VERTEX_LOCATION%,GEMINI_MODEL=%GEMINI_MODEL%,NODE_ENV=production" --quiet || goto :fail

for /f "delims=" %%U in ('gcloud run services describe %SERVICE% --region %REGION% --format^=value(status.url^)') do set "URL=%%U"
echo [autoconfig] Deployed: %URL%

echo [autoconfig] Checking %URL%/health ...
call curl -fsS --max-time 30 "%URL%/health" >nul
if errorlevel 1 (
  echo [autoconfig] WARNING: health check did not return 200 - inspect logs:
  echo   gcloud run services logs read %SERVICE% --region %REGION%
) else (
  echo [autoconfig] Health check OK.
)

echo [autoconfig] Ensuring domain mapping %DOMAIN% (best effort)...
call gcloud beta run domain-mappings describe --domain=%DOMAIN% --region=%REGION% >nul 2>&1
if errorlevel 1 (
  call gcloud beta run domain-mappings create --service=%SERVICE% --domain=%DOMAIN% --region=%REGION% --quiet || echo [autoconfig] Domain mapping not created - CNAME the *.run.app host instead.
) else (
  echo [autoconfig] Domain mapping already exists.
)

echo [autoconfig] Done. Service URL: %URL%
endlocal
exit /b 0

:fail
echo [autoconfig] FAILED - see error above.
endlocal
exit /b 1

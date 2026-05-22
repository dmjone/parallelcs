# deploy/

Infrastructure for ParallelCS. The **live** deploy uses Cloud Run from source
(`autoconfig.sh` / `autoconfig.bat` at the repo root). Everything here is either
that path's reference or future-scale IaC that is **not applied today**.

## What runs in production now

A single Cloud Run service, `parallelcs`, in `asia-south1`:

- Scales to zero (`--min-instances=0`) — **$0 when idle**.
- Default CPU throttling on — CPU billed only during request handling.
- Runs as `parallelcs-run@dmjone.iam.gserviceaccount.com`, a least-privilege SA.
- No API keys: Vertex AI + GCS authenticate via the attached SA (ADC).

Deploy or redeploy:

```sh
./autoconfig.sh        # Linux / macOS
autoconfig.bat         # Windows
```

Both are idempotent wrappers around `gcloud run deploy --source` and re-create
the SA / bucket / IAM if missing. Safe to re-run.

## Contents

| Path                    | Purpose                                                      | Used now? |
|-------------------------|--------------------------------------------------------------|-----------|
| `docker-compose.yml`    | Local / single-host run. Needs ADC for Google APIs.          | dev only  |
| `k8s/`                  | Kustomize manifests for a future GKE tier. Workload Identity. | no        |
| `terraform/`            | Terraform module: SA + IAM + bucket + Cloud Run service.     | no        |

## Future scale-up

`terraform/` reproduces today's gcloud-created environment as code. To adopt it
without recreating live resources, `terraform import` each resource first (import
commands are in `terraform/main.tf`). `k8s/` is the path if the service outgrows
Cloud Run; bind Workload Identity so pods reuse `parallelcs-run` with no key files.

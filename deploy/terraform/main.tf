# ParallelCS — Terraform module skeleton.
#
# REFERENCE ONLY. The live environment was created with gcloud (see CHANGELOG and
# autoconfig.sh). This module encodes the same resources so a future, fully
# IaC-managed environment can be stood up reproducibly. It is not applied today.
#
# To adopt it without recreating live resources, `terraform import` each block:
#   terraform import google_service_account.runtime \
#     projects/dmjone/serviceAccounts/parallelcs-run@dmjone.iam.gserviceaccount.com
#   terraform import google_storage_bucket.content dmjone-parallelcs-content
#   terraform import google_cloud_run_v2_service.parallelcs \
#     projects/dmjone/locations/asia-south1/services/parallelcs

terraform {
  required_version = ">= 1.7"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# --- runtime service account ------------------------------------------------
# Least-privilege identity the Cloud Run service runs as. No keys are ever issued;
# Cloud Run supplies ADC for this account at runtime.
resource "google_service_account" "runtime" {
  account_id   = var.runtime_sa_id
  display_name = "ParallelCS Cloud Run runtime"
  description  = "Runtime SA for parallelcs Cloud Run service - Vertex + its content bucket only"
}

# --- content bucket ---------------------------------------------------------
# Private bucket for curriculum content + self-update state. Public access is
# prevented and uniform bucket-level access is enforced.
resource "google_storage_bucket" "content" {
  name                        = var.content_bucket
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

  versioning {
    enabled = true
  }

  # Curriculum objects are small; keep history bounded.
  lifecycle_rule {
    condition {
      num_newer_versions = 30
    }
    action {
      type = "Delete"
    }
  }
}

# --- IAM: runtime SA --------------------------------------------------------
# Storage access is scoped to the content bucket ONLY (not project-wide).
resource "google_storage_bucket_iam_member" "runtime_object_admin" {
  bucket = google_storage_bucket.content.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.runtime.email}"
}

# Vertex AI has no usable resource-level scoping; granted at project level.
resource "google_project_iam_member" "runtime_aiplatform" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_project_iam_member" "runtime_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_project_iam_member" "runtime_metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

# --- Cloud Run service ------------------------------------------------------
# Scale-to-zero ($0 idle). Default CPU throttling left on, so CPU is billed
# only while a request is in flight.
resource "google_cloud_run_v2_service" "parallelcs" {
  name                = var.service_name
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.runtime.email
    timeout         = "120s"
    max_instance_request_concurrency = 80

    scaling {
      min_instance_count = 0
      max_instance_count = 4
    }

    containers {
      image = var.container_image

      resources {
        cpu_idle = true # default CPU throttling — billed only during requests
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      ports {
        container_port = 8080
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "CONTENT_BUCKET"
        value = var.content_bucket
      }
      env {
        name  = "GCP_PROJECT"
        value = var.project_id
      }
      env {
        name  = "VERTEX_LOCATION"
        value = var.vertex_location
      }
      env {
        name  = "GEMINI_MODEL"
        value = var.gemini_model
      }

      startup_probe {
        http_get {
          path = "/health"
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        failure_threshold     = 3
      }
      liveness_probe {
        http_get {
          path = "/health"
        }
        period_seconds = 30
      }
    }
  }
}

# Public, unauthenticated access to the service.
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.parallelcs.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

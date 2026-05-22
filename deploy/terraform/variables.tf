variable "project_id" {
  description = "GCP project id."
  type        = string
  default     = "dmjone"
}

variable "region" {
  description = "Region for Cloud Run, the content bucket, and Artifact Registry."
  type        = string
  default     = "asia-south1"
}

variable "service_name" {
  description = "Cloud Run service name."
  type        = string
  default     = "parallelcs"
}

variable "content_bucket" {
  description = "Globally-unique name of the curriculum/state bucket."
  type        = string
  default     = "dmjone-parallelcs-content"
}

variable "runtime_sa_id" {
  description = "Account id (local part) of the runtime service account."
  type        = string
  default     = "parallelcs-run"
}

variable "container_image" {
  description = "Fully-qualified container image for the Cloud Run service."
  type        = string
  default     = "asia-south1-docker.pkg.dev/dmjone/cloud-run-source-deploy/parallelcs:latest"
}

variable "gemini_model" {
  description = "Gemini model id used by the self-update job."
  type        = string
  default     = "gemini-2.5-flash"
}

variable "vertex_location" {
  description = "Vertex AI location for Gemini calls. `global` is the correct endpoint for Gemini 2.5 Flash with Google Search grounding."
  type        = string
  default     = "global"
}

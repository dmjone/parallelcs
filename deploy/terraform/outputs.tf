output "service_url" {
  description = "Public HTTPS URL of the Cloud Run service."
  value       = google_cloud_run_v2_service.parallelcs.uri
}

output "runtime_service_account" {
  description = "Email of the least-privilege runtime service account."
  value       = google_service_account.runtime.email
}

output "content_bucket" {
  description = "Name of the curriculum/state bucket."
  value       = google_storage_bucket.content.name
}

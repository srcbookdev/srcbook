---
'srcbook': patch
---

Added configurable network exposure for Docker deployments with secure defaults. This includes:

- Added docker-compose.yml with configurable network binding
- Default configuration restricts access to localhost (127.0.0.1) for security
- Optional network exposure via HOST_BIND environment variable
- Configured port 2150 mapping for Docker container

Users can optionally expose their Srcbook instance to other network devices by setting HOST_BIND=0.0.0.0 when running Docker.

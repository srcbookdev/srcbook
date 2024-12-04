---
'srcbook': patch
---

Added network exposure configuration to enable accessing Srcbook from other devices when running in Docker. This includes:

- Added docker-compose.yml with 0.0.0.0 binding configuration
- Configured port mapping to expose port 2150 to the network
- Set HOST environment variable for external network access

This change allows users to access their Srcbook instance from other devices on their network when running in Docker.
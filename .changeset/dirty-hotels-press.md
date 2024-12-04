---
'srcbook': patch
---

Added Docker support to enable exposing a Srcbook application running in a Docker container to other devices on the network. This includes:

- A new Dockerfile for building the application
- A docker-compose.yml configuration for easy deployment
- Support for exposing the application to external network devices via 0.0.0.0 binding

This addition allows users to run Srcbook in isolated containers and access it from other devices on their network, making it more flexible for various deployment scenarios.

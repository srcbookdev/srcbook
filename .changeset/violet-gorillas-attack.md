---
'@srcbook/components': patch
'@srcbook/api': patch
'@srcbook/web': patch
'srcbook': patch
---

This change gives Srcbook an MCP client, giving Srcbook the capability to connect to a wide array of MCP servers that provide the LLM with tools and resources. For now, this only runs in local dev: local production/Docker will be addressed in a follow-up PR.

# Project documentation

These guides describe the current repository implementation. They were checked against source and deployment files on 2026-10-29. When a guide and source disagree, source code and Firebase configuration are the authority. Product claims and old design material are not treated as proof of a deployed feature.

- [Architecture and runtime map](architecture/README.md)
- [AI request paths](architecture/ai-and-request-flows.md)
- [Data and security boundaries](architecture/data-and-security.md)
- [Feature and integration inventory](architecture/feature-inventory.md)
- [Build, configuration, and deployment](operations.md)

Update the relevant guide when changing routes, providers, Firestore/Storage access, Functions exports, build behavior, or deployment configuration. Distinguish implemented behavior from UI shells, mock integrations, and unverified external services.

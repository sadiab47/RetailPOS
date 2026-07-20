# RetailPOS

RetailPOS is a modern, full-stack point-of-sale platform for retail businesses. It combines a Next.js frontend with a NestJS backend, alongside database design, API documentation, and deployment guidance for a production-ready foundation.

## Overview

RetailPOS is designed to support the core retail workflow:
- Product and inventory management
- Authentication and role-based access
- Point-of-sale operations and billing
- Customer, supplier, and reporting modules
- Local and production deployment guidance

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: NestJS, TypeScript
- Database: MySQL / SQL schema-based design
- Documentation: Markdown-based architecture and API docs

## Repository Structure

- apps/api — NestJS backend application
- apps/web — Next.js frontend application
- database — SQL schema and seed data
- docs — architecture, requirements, API, deployment, and testing documentation

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+

### Backend
```bash
cd apps/api
npm install
npm run start:dev
```

### Frontend
```bash
cd apps/web
npm install
npm run dev
```

## Documentation

The project documentation is organized under the docs directory:
- [docs/README.md](docs/README.md)
- [docs/architecture/SYSTEM_ARCHITECTURE.md](docs/architecture/SYSTEM_ARCHITECTURE.md)
- [docs/requirements/SRS.md](docs/requirements/SRS.md)
- [docs/api/API_OVERVIEW.md](docs/api/API_OVERVIEW.md)
- [docs/deployment/LOCAL_SETUP.md](docs/deployment/LOCAL_SETUP.md)

## Contributing

Contributions are welcome. Please review [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) before opening a pull request.

## Security

Please review [SECURITY.md](SECURITY.md) for the supported reporting process and security expectations.

## License

RetailPOS is distributed under the MIT License. The full text is available in [LICENSE](LICENSE).

### What this means
- You may use, copy, modify, and distribute the software
- You may include it in commercial and non-commercial projects
- The license requires that the original copyright and permission notice remain intact

For a full legal summary, please review the license file in this repository.

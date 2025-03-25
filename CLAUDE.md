# SrcBook Development Guide

## Build & Development Commands
- **Install deps**: `pnpm install`
- **Development**: `pnpm dev`
- **Build**: `pnpm build`
- **Lint**: `pnpm lint`
- **Format check**: `pnpm check-format`
- **Format code**: `pnpm format`
- **Tests**: `pnpm test`
- **Single test**: `pnpm --filter <package> vitest run <test-file> [-t "test name"]`

## Code Style Guidelines
- **Package manager**: pnpm with workspace support
- **Structure**: Monorepo using Turborepo
- **TypeScript**: Strict typing, ES2022 target, ESNext modules
- **Formatting**: Prettier with 2-space indentation, 100 char line limit, semicolons required
- **Imports**: Group imports by external/internal, no unused imports
- **Naming**: camelCase for variables/functions, PascalCase for classes/components/types
- **Error handling**: Prefer Result types over try/catch when appropriate
- **React**: Functional components with hooks, prefer composition over inheritance
- **File extensions**: `.mts` for TypeScript modules, `.tsx` for React components
- **Testing**: Vitest for unit tests, files named `*.test.mts`
<!-- srcbook:{"language":"typescript"} -->

# Contributing to Srcbook

Thank you for your interest in contributing to Srcbook! This guide will help you get started with contributing to the project.

## Ways to Contribute

1. **Using Srcbook**
   - File issues for bugs
   - Request new features
   - Share feedback

2. **Contributing Code**
   - Fix bugs
   - Implement features
   - Improve documentation

3. **Being an Advocate**
   - Share your Srcbooks
   - Write about Srcbook
   - Present at conferences/meetups
   - Share on social media

## Development Setup

### Prerequisites

- Node.js 18 or later
- pnpm 9.5 or later
- Git

> Note: If you switch Node.js versions, run `pnpm rebuild -r` due to native bindings.

### Getting Started

1. Fork and clone the repository:

###### clone-commands.sh

```bash
git clone https://github.com/your-username/srcbook.git
cd srcbook
```

2. Install dependencies:

###### install-deps.sh

```bash
pnpm install
```

3. Start development servers:

###### dev-servers.sh

```bash
pnpm run dev
```

Visit http://localhost:5173 to see the app.

### Project Structure

The project is a monorepo with multiple packages:

###### project-structure.ts

```typescript
interface ProjectStructure {
  packages: {
    api: {
      description: "Core API and server implementation",
      technologies: ["Node.js", "Express", "WebSocket", "SQLite"]
    },
    components: {
      description: "Shared React components",
      technologies: ["React", "TypeScript", "Tailwind CSS"]
    },
    web: {
      description: "Web application frontend",
      technologies: ["React", "Vite", "TypeScript"]
    },
    shared: {
      description: "Shared types and utilities",
      technologies: ["TypeScript"]
    }
  }
}
```

## Development Workflow

### Running Scripts

Top-level scripts:

###### npm-scripts.sh

```bash
# Type checking
pnpm run check-types

# Linting
pnpm run lint

# Testing
pnpm run test

# Building
pnpm run build
```

Package-specific scripts:

###### package-scripts.sh

```bash
# Run script for specific package
pnpm run check-types --filter=@srcbook/api

# Build specific package
pnpm run build --filter=@srcbook/web
```

### Making Changes

1. Create a new branch:

###### git-branch.sh

```bash
git checkout -b feature/your-feature-name
```

2. Make your changes
3. Add a changeset:

###### changeset.sh

```bash
pnpm changeset
```

4. Commit and push:

###### git-commit.sh

```bash
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature-name
```

### Dependency Management

Adding dependencies:

###### add-deps.sh

```bash
# Add to specific package
pnpm add <dep> --filter <package>

# Add as dev dependency
pnpm add -D <dep> --filter <package>

# Add workspace package
pnpm add @srcbook/shared --workspace --filter api
```

### Database Management

SQLite database location: `~/.srcbook/srcbook.db`

Creating migrations:

1. Modify `packages/api/db/schema.mts`
2. Generate migration:

###### generate-migration.sh

```bash
pnpm run generate --name your_migration_name
```

Apply migrations:

###### apply-migration.sh

```bash
pnpm run migrate
```

## Pull Request Process

1. **Before Coding**
   - Open an issue for discussion
   - Get maintainer feedback
   - Clarify implementation details

2. **Making Changes**
   - Follow code style
   - Add tests
   - Update documentation
   - Create changeset

3. **Submitting PR**
   - Reference related issues
   - Provide clear description
   - Include screenshots if relevant
   - Ensure CI passes

4. **Review Process**
   - Address feedback
   - Keep changes focused
   - Be responsive

## Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Follow project conventions

### Communication Channels

- GitHub Issues/Discussions
- [Discord Server](https://discord.gg/shDEGBSe2d)
- Email: feedback@srcbook.com

### Documentation

Help improve documentation by:
- Fixing errors
- Adding examples
- Clarifying concepts
- Creating tutorials

### Sharing Srcbooks

Share your Srcbooks to be featured on [the hub](https://hub.srcbook.com):

1. Create useful Srcbooks
2. Test thoroughly
3. Add clear documentation
4. Email feedback@srcbook.com

## Release Process

Releases are automated using changesets:

1. Changes merged to main
2. Changesets aggregated
3. Version bumped
4. Changelog updated
5. Packages published

### Version Guidelines

- Patch: Bug fixes, documentation
- Minor: New features, improvements
- Major: Breaking changes (rare)

## Getting Help

- Check [FAQ](./FAQ.md)
- Search existing issues
- Ask on Discord
- Email maintainers

## Next Steps

- Review [Getting Started](./getting-started.src.md)
- Explore [Examples](./examples.src.md)
- Read [API Reference](./api-reference.src.md)
- Join [Discord](https://discord.gg/shDEGBSe2d)
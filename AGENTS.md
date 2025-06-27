# AGENTS.md - Development Guidelines

## Build/Lint/Test Commands

- **Dev**: `bun run dev` - Run with watch mode
- **Typecheck**: `bun run typecheck` - TypeScript type checking
- **Lint**: `bun run lint` - Lint with oxlint
- **No tests**: This project doesn't have a test suite

## Code Style Guidelines

### Language & Runtime

- **TypeScript** with strict mode enabled
- **Bun** runtime (>=1.2.15) - use Bun APIs for file operations
- **ES Modules** only (`"type": "module"`)

### Imports & Dependencies

- Use named imports: `import { foo } from "bar"`
- Prefer Bun built-in APIs over Node.js equivalents
- External deps: @clack/prompts for CLI, @google-cloud/\* for translation

### Types & Interfaces

- Export interfaces with PascalCase: `export interface Settings`
- Use strict TypeScript settings (noUncheckedIndexedAccess, etc.)
- Prefer explicit types over `any` (except for Google Cloud service accounts)

### Error Handling

- Always validate inputs before processing
- Throw descriptive Error objects with context
- Use try-catch blocks for async operations
- Handle Google Cloud API errors specifically

### Naming & Structure

- Use camelCase for functions and variables
- Use SCREAMING_SNAKE_CASE for constants
- Async functions should be clearly named and handle errors
- Keep functions focused and single-purpose

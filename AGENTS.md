# AGENTS.md

> Note: This file is the authoritative source for coding agent instructions. If
> in doubt, prefer AGENTS.md over README.md. See nested AGENTS.md files in each
> workspace for app-specific patterns.

## Commands

| Command                                                | Purpose                        |
| ------------------------------------------------------ | ------------------------------ |
| `mask --help`                                          | See all the available commands |
| `mask deps install`                                    | Install dependencies           |
| `mask deps add (package) [--dev] [--version=<string>]` | Add dependency                 |
| `mask test`                                            | Run all tests                  |
| `mask test --file test/file.test.ts`                   | Run single test file           |
| `mask lint`                                            | Lint/format with Biome         |

**Task runner:** Mask (https://github.com/jacobdeichert/mask). Consult repository `maskfile.md` files for the canonical list of tasks/flags before adding or invoking commands.

## Tech Stack

Bun 1.3+, TypeScript 5.9, Effect 4-beta, Vite 8, Vitest 4

## Code Style

- **Formatting**: Spaces (not tabs), double quotes for strings
- **Imports**: Use `@repo/domain` for shared types; Biome auto-organizes imports
- **Types**: Effect Schema for validation; `typeof Schema.Type` for inline
  types, `Schema.Schema.Type<typeof T>` for exports
- **Naming**: camelCase variables/functions, PascalCase types/classes, file-name for files
- **Effect patterns**: `Effect.gen` + `yield*` for all Effect operations; Layer
  composition for DI
- **Error handling**: Use Effect error channel; avoid try/catch

## Effect Essentials

```typescript
// Always use yield* to unwrap Effect values
Effect.gen(function* () {
    const service = yield* MyService; // Access service from Context
    const result = yield* service.method(); // Unwrap Effect result
    yield* Effect.log("done"); // Side effects
    return result;
});
```

## Structure

| Workspace      | Stack  | AGENTS.md                |
| -------------- | ------ | ------------------------ |
| `packages/cli` | Effect | `packages/cli/AGENTS.md` |

## Local Source References

When answering questions about Effect, search these
cloned source repos first. When updating dependencies, pull the latest
commits in these repos to ensure the LLM references current code:

- `.reference/effect/`

If any of the folders are missing (they are git ignored), clone them into
`reference/`:

- `https://github.com/Effect-TS/effect-smol.git` -> `.reference/effect/`

---

_This document is a living guide. Update it as the project evolves and new
patterns emerge._

# AGENTS.md

> Note: This file is the authoritative source for coding agent instructions. If
> in doubt, prefer AGENTS.md over README.md. See nested AGENTS.md files in each
> workspace for app-specific patterns.

## Commands

### Root Workspace

| Command                                         | Purpose                               |
| ----------------------------------------------- | ------------------------------------- |
| `mask --help`                                   | See all available commands            |
| `mask deps install`                             | Install all dependencies              |
| `mask deps add <pkg> [--dev] [--version=<ver>]` | Add dependency                        |
| `mask build`                                    | Build all packages                    |
| `mask lint`                                     | Lint/format with Biome (unsafe fixes) |

### packages/cli

| Command                          | Purpose                             |
| -------------------------------- | ----------------------------------- |
| `mask test`                      | Run all tests                       |
| `mask test -f test/file.test.ts` | Run single test file                |
| `mask test watch`                | Run tests in watch mode             |
| `mask test changed`              | Run tests affected by changed files |

**Task runner:** Mask (https://github.com/jacobdeichert/mask). Consult repository
`maskfile.md` files for the canonical list of tasks/flags before adding or
invoking commands.

## Tech Stack

- **Runtime:** Bun 1.3+
- **Language:** TypeScript 5.9
- **Effect System:** Effect 4-beta
- **Build Tool:** Vite 8 (for vitest)
- **Testing:** Vitest 4
- **Linting:** Biome 2
- **Package Manager:** Workspaces (Bun)

## Code Style

### Formatting

- Use **spaces** for indentation (not tabs)
- Use **double quotes** for strings
- **No comments** unless explicitly requested
- Let Biome auto-format (it handles most conventions)

### Imports

- Internal project imports within `src`: always include the file extension
    ```typescript
    import { foo } from "~/config.js"; // correct
    import { foo } from "~/config"; // incorrect
    ```
- Path aliases:
    - `~/*` → `src/*`
    - `~test/*` → `test/*`
- Biome auto-organizes imports; do not manually sort

### Types

- **Validation:** Effect Schema
- **Inline types:** `Schema.Schema.Type<typeof Schema>`
- **Export types:** `Schema.Schema.Type<typeof T>`
- **Class definitions:** Use `Schema.Class<T>("Module/Name")`
- **Opaque types:** Use `Schema.Opaque<T>()(Schema.Struct({...}))`

### Naming Conventions

| Element             | Convention | Example           |
| ------------------- | ---------- | ----------------- |
| Variables/functions | camelCase  | `parseFromCli`    |
| Types/classes       | PascalCase | `ChanteConfig`    |
| Files               | kebab-case | `config-issue.ts` |

### Effect Patterns

- **All Effect operations** use `Effect.gen` with `yield*`:
    ```typescript
    const program = Effect.gen(function* () {
        const service = yield* MyService;
        const result = yield* service.method();
        yield* Effect.log("done");
        return result;
    });
    ```
- **Named functions:** Use `Effect.fn("name")(function* () { ... })`
- **Untraced functions:** Use `Effect.fnUntraced(function* () { ... })`
- **Layer composition:** For dependency injection
- **Error handling:** Use Effect error channel; avoid try/catch
- **Service definition:** Use `ServiceMap.Service<T, I>()("name")`

### Error Handling

- Use Effect's error channel (`Effect.catchTag`)
- Never use try/catch for Effect operations
- Custom errors via `Effect.fail` or service-specific error types

### Re-exports

- Avoid barrel `index.ts` files
- Use `<folder-name>.ts` to re-export from a sibling `<folder-name>/` directory

## Structure

| Workspace      | Stack  | AGENTS.md                    |
| -------------- | ------ | ---------------------------- |
| `packages/cli` | Effect | See `packages/cli/AGENTS.md` |

## Testing

### Test Setup

- Use Vitest with the custom `test` fixture from `~test/fixtures.js`
- The fixture provides Effect scope management and cleanup
- Pattern:

    ```typescript
    import { test } from "~test/fixtures.js";

    test("description", ({ expect }) => {
        // tests here
    });
    ```

### Running Tests

```bash
mask test              # all tests
mask test -f path      # single file
mask test watch        # watch mode
mask test changed      # affected files only
```

## Local Source References

When answering Effect questions, search cloned repos first:

- `.reference/effect/`

If missing, clone:

```bash
git clone https://github.com/Effect-TS/effect-smol.git .reference/effect/
```

---

_This document is a living guide. Update it as the project evolves and new
patterns emerge._

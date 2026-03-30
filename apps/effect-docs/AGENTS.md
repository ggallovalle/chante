# AGENTS.md

> Documentation for `@kbroom/effect` library using fumadocs.

## Tech Stack

- **Framework:** Fumadocs MDX + TanStack Start
- **Runtime:** Bun 1.3+
- **UI:** React 19, Tailwind CSS 4

## Library Being Documented

`@kbroom/effect` (`packages/effect/`) — A collection of Effect utilities and integrations.

### Public Exports

| Export | Description |
| ------ |-------------|
| `@kbroom/effect/testing/vitest` | Vitest integration utilities |
| `@kbroom/effect/uwu` | Uwu utilities |
| `@kbroom/effect/uwu/bun` | Bun-specific uwu helpers |
| `@kbroom/effect/miette` | Error/diagnostic handling |
| `@kbroom/effect/kdl` | KDL parser and schema |

## Commands

| Command | Purpose |
|---------|---------|
| `mask docs dev` | Start dev server (from root) |
| `bun run dev` | Start dev server (from apps/effect-docs) |
| `bun run build` | Build for production |
| `bun run types:check` | Type check MDX content |

## Content Structure

### Directory

```
apps/effect-docs/
├── content/docs/          # MDX documentation files
│   ├── index.mdx          # → /docs/
│   ├── getting-started.mdx # → /docs/getting-started
│   └── (folder)/
│       └── page.mdx       # → /docs/page (if folder in parentheses)
├── source.config.ts       # Docs configuration
└── AGENTS.md
```

### Adding Pages

Create `.mdx` files in `content/docs/`. Use frontmatter:

```mdx
---
title: Page Title
description: Brief description shown in navigation
icon: RocketIcon
---
```

### Folder Organization

| Path | URL |
|------|-----|
| `content/docs/index.mdx` | `/docs` |
| `content/docs/guide.mdx` | `/docs/guide` |
| `content/docs/(guide)/advanced.mdx` | `/docs/advanced` (no prefix) |

### Sidebar Customization

Create `meta.json` in a folder:

```json
{
  "title": "Folder Name",
  "icon": "BookIcon",
  "defaultOpen": true,
  "pages": ["index", "intro", "---Separator---", "advanced"]
}
```

## Conventions

- Use double quotes for strings
- No comments unless requested
- Follow existing MDX patterns in `content/docs/`
- Reference source code in `packages/effect/src/`
- Test utilities: `packages/effect/test/`

# AGENTS.md

> Documentation for `@kbroom/effext` library using fumadocs.

## Tech Stack

- **Framework:** Fumadocs MDX + TanStack Start
- **Runtime:** Bun 1.3+
- **UI:** React 19, Tailwind CSS 4

## Library Being Documented

`@kbroom/effext` (`packages/effext/`) — A collection of Effect utilities and integrations.

### Public Exports

| Export | Description |
| ------ |-------------|
| `@kbroom/effext/testing/vitest` | Vitest integration utilities |
| `@kbroom/effext/uwu` | Uwu utilities |
| `@kbroom/effext/uwu/bun` | Bun-specific uwu helpers |
| `@kbroom/effext/miette` | Error/diagnostic handling |
| `@kbroom/effext/kdl` | KDL parser and schema |

## Commands

| Command | Purpose |
|---------|---------|
| `mask docs dev` | Start dev server (from root) |
| `bun run dev` | Start dev server (from apps/effext-docs) |
| `bun run build` | Build for production |
| `bun run types:check` | Type check MDX content |

## Content Structure

### Directory

```
apps/effext-docs/
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
- Reference source code in `packages/effext/src/`
- Test utilities: `packages/effext/test/`

# @kbroom/effect-schema-kdl

Effect Schema integration for [KDL](https://kdl.dev). Provides bidirectional conversion between KDL documents and Effect Schema, with Miette integration for pretty error reporting.

## Installation

```bash
bun add @kbroom/effect-schema-kdl
```

Requires `effect` and `@kbroom/effect-schema-miette` as peer dependencies:

```bash
bun add effect@beta @kbroom/effect-schema-miette
```

## Features

- **Bidirectional conversion**: Parse KDL into typed objects and encode objects back to KDL
- **Schema validation**: Use Effect Schema to validate KDL documents with full type safety
- **Miette integration**: Pretty error reporting with source spans when validation fails
- **Type-safe DSL**: Build schemas using a fluent API that mirrors KDL structure

## Examples

See `examples/` for complete examples:

- `examples/package-json.ts` - Package.json-like schema with scripts and dependencies
- `examples/niri.ts` - Niri window manager configuration schema

# kdl

Effect Schema integration for [KDL](https://kdl.dev). Provides bidirectional conversion between KDL documents and Effect Schema, with Miette integration for pretty error reporting.

## Features

- **Bidirectional conversion**: Parse KDL into typed objects and encode objects back to KDL
- **Schema validation**: Use Effect Schema to validate KDL documents with full type safety
- **Miette integration**: Pretty error reporting with source spans when validation fails
- **Type-safe DSL**: Build schemas using a fluent API that mirrors KDL structure

## Examples

See `examples/kdl/` for complete examples:

- `examples/kdl/package-json.ts` - Package.json-like schema with scripts and dependencies
- `examples/kdl/niri.ts` - Niri window manager configuration schema

# miette

Fancy error reporting for Effect, inspired by the Rust [miette](https://github.com/zkat/miette) library, with Effect Schema integration. Error code for coders!

## Features

- **Diagnostic**: Schema-based error type with labels, source code, and severity
- **SourceCode**: Read source code spans with context
- **GraphicalReportHandler**: Pretty-print errors to terminal
- **Themes**: Unicode, ASCII, and emoji themes

## Usage

```typescript
import { Effect } from "effect"
import { Diagnostic, GraphicalReportHandler, StringSourceCode } from "@kbroom/effect/miette"

const error = new Diagnostic({
  _tag: "Diagnostic",
  info: "Something went wrong",
  code: "MY_ERROR",
  severity: "error",
  labels: [{ offset: 0, text: "here", length: 5 }],
})

const handler = GraphicalReportHandler.default()

const source = new StringSourceCode("hello world")
handler.debug(error, { sourceCode: source })
```

## API

### Diagnostic

A schema-based error type that supports:
- `info`: Main error message
- `code`: Unique error code
- `severity`: "advice" | "warning" | "error"
- `labels`: Source code locations
- `related`: Related diagnostics
- `sourceCode`: The source code to reference

### SourceCode

Interface for reading spans from source:
- `StringSourceCode`: In-memory source
- `FromFileSourceCode`: File-based source

### Handlers

- `GraphicalReportHandler`: Pretty terminal output with themes

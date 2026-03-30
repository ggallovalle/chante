# uwu ✨

<p align="center">
  <b>uwu</b> — A purrfect styling library for terminal output with Effect Schema integration 💖
</p>

---

## Features 🌟

- 🎨 **Colorful Output** — Support for ANSI, CSS, and hex colors!
- 📝 **Rich Text Effects** — Bold, italic, underline, strikethrough, and more!
- 🔧 **Effect Schema Integration** — Type-safe styling with Effect Schema!
- 🦊 **Framework Agnostic** — Use anywhere, even in your Bun apps!
- 🎀 **Service-Based** — Pluggable styler architecture with Layer!

---

## Quick Start ✨

### Basic Usage 🌈

```typescript
import { Style, NoopStyler, AnsiBunStyler } from "@kbroom/effect/uwu"
import { css, ansi } from "@kbroom/effect/uwu"

// Create a colorful style ✨
const myStyle = new Style({
  fg: css("#ff69b4"),      // Pink foreground! 💕
  bg: ansi(236),           // Dark background
  bold: true,              // Make it bold!
  effects: new Set(["italic"]),
})

// Use with Bun's ANSI styler 🌸
const styler = new AnsiBunStyler()
const styled = styler.styled(myStyle)

console.log(styled.stiled("Hello, World!"))
```

### With Effect Layer 🎭

```typescript
import { Effect, Layer } from "effect"
import { Styler, AnsiBunStylerLayer } from "@kbroom/effect/uwu"

const program = Effect.gen(function* () {
  const styler = yield* Styler
  const styled = styler.styled(myStyle)
  console.log(styled.stiled("uwu"))
}).pipe(
  Effect.provide(AnsiBunStylerLayer),
)

Effect.runPromise(program)
```

---

## API Reference 📚

### Schema Types 🎀

| Type | Description |
|------|-------------|
| `TextEffect` | Literal union of text effects: `"bold"`, `"dimmed"`, `"italic"`, `"underline"`, `"blink"`, `"blinkFast"`, `"reversed"`, `"hidden"`, `"strikethrough"` |
| `Color` | Tagged union for colors: `css`, `ansi`, or `hex` |
| `Style` | Effect Schema class for styling properties |
| `Styled` | The result of applying a style to content |

### Color Functions 🌈

| Function | Description |
|----------|-------------|
| `ansi(code)` | Create an ANSI color from a code number |
| `css(value)` | Create a color from a CSS color string |
| `hex(code)` | Create a color from a hex code |

### Stylers 🖌️

| Class | Description |
|-------|-------------|
| `NoopStyler` | A styler that does nothing (no styling applied) |
| `AnsiBunStyler` | A styler that uses Bun's native `Bun.color()` API for ANSI escape sequences |

### Layers 🎭

| Layer | Description |
|-------|-------------|
| `NooopStylerLayer` | Layer providing a `NoopStyler` |
| `AnsiBunStylerLayer` | Layer providing an `AnsiBunStyler` (Bun only!) |

---

## Bun Integration 🦊

This package includes special Bun-specific functionality! 🌟

Import the Bun styler separately:

```typescript
import { AnsiBunStylerLayer } from "@kbroom/effect/uwu/bun"
```

> **Note:** The `./bun` export only works with Bun runtime due to its use of `Bun.color()`.

---

## Why "uwu"? 🤔

Because making your terminal output look adorable should be fun! 🎀

```
  ∧＿∧
（｡･ω･｡)つ━☆・*。
⊂　　 ノ 　　　・゜+.
　しーＪ　　　°。+ *´¨)
　　　　　　　　　.· ´¸.·*´¨) ¸.·*¨)
　　　　　　　　　　(¸.·´ (¸.·'* ☆
```

---

## License 📄

MIT 💖

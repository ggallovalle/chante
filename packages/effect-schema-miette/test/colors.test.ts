import { type Color, Style } from "@kbroom/effect-schema-miette/colors"
import { describe } from "vitest"
import { test } from "~test/fixtures.js"

const css = (value: string) => ({ _tag: "css", value }) satisfies Color

const reset = "\x1b[0m"

const bgFromFg = (fg: string): string => {
  if (fg.startsWith("\x1b[38;")) return `\x1b[48;${fg.slice(5)}`
  if (fg.startsWith("\x1b[")) return fg.replace("[3", "[4") // best effort for 30-37 -> 40-47
  return fg
}

describe("Style.builder", () => {
  test("baseline no style doesn't add reset", ({ expect }) => {
    const styled = Style.builder().buildAnsi().stiled("x")
    expect(styled).toBe("x")
  })

  test("foreground css color is applied", ({ expect }) => {
    const fg = Bun.color("red", "ansi") ?? ""

    const styled = Style.builder().fg(css("red")).buildAnsi().stiled("hi")

    expect(styled).toBe(`${fg}hi${reset}`)
  })

  test("foreground then background ordering and bg translation", ({
    expect,
  }) => {
    const fg = Bun.color("red", "ansi") ?? ""
    const bg = Bun.color("green", "ansi") ?? ""

    const styled = Style.builder()
      .fg(css("red"))
      .bg(css("green"))
      .buildAnsi()
      .stiled("hi")

    expect(styled).toBe(`${fg}${bgFromFg(bg)}hi${reset}`)
  })

  test("bold is emitted even when colors are skipped", ({ expect }) => {
    const styled = Style.builder()
      .fg(css("red"))
      .effect("bold")
      .buildAnsi(false) // preferColor = false
      .stiled("hi")

    expect(styled).toBe(`\x1b[1mhi${reset}`)
  })

  test("effects are emitted in defined order", ({ expect }) => {
    // order in source: dimmed, italic, underline, blink, blinkFast, reversed, hidden, strikethrough
    const styled = Style.builder()
      .effect("italic")
      .effect("underline")
      .buildAnsi()
      .stiled("hi")

    expect(styled).toBe(`\x1b[3m\x1b[4mhi${reset}`)
  })

  test("combined style concatenates colors, bold, and effects", ({
    expect,
  }) => {
    const fg = Bun.color("red", "ansi") ?? ""
    const bg = Bun.color("green", "ansi") ?? ""

    const styled = Style.builder()
      .fg(css("red"))
      .bg(css("green"))
      .effect("bold")
      .effect("italic")
      .effect("underline")
      .buildAnsi()
      .stiled("hi")

    expect(styled).toBe(`${fg}${bgFromFg(bg)}\x1b[1m\x1b[3m\x1b[4mhi${reset}`)
  })

  test("stiled converts non-string payloads", ({ expect }) => {
    const styled = Style.builder().buildAnsi().stiled(123)
    expect(styled).toBe("123")
  })
})

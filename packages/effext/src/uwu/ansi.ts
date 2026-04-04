export function effectToAnsi(effect: string): string | null {
  switch (effect) {
    case "bold":
      return "\x1b[1m"
    case "dimmed":
      return "\x1b[2m"
    case "italic":
      return "\x1b[3m"
    case "underline":
      return "\x1b[4m"
    case "blink":
      return "\x1b[5m"
    case "blinkFast":
      return "\x1b[6m"
    case "reversed":
      return "\x1b[7m"
    case "hidden":
      return "\x1b[8m"
    case "strikethrough":
      return "\x1b[9m"
    default:
      return null
  }
}

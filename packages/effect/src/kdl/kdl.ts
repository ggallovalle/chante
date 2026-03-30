export const kdl = (
  strings: TemplateStringsArray,
  ...values: unknown[]
): string => {
  let result = strings[0] ?? ""
  for (let i = 0; i < values.length; i++) {
    result += String(values[i]) + (strings[i + 1] ?? "")
  }

  const lines = result.split("\n")
  const minIndent = lines
    .filter((line) => line.trim().length > 0)
    .reduce((min, line) => {
      const match = line.match(/^(\s*)/)
      return Math.min(min, match?.[1]?.length ?? 0)
    }, Infinity)

  return lines.map((line) => line.slice(minIndent)).join("\n")
}

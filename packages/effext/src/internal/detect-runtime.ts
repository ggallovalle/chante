export function getRuntime() {
  if (globalThis.Bun) return "bun"
  if (globalThis.process?.versions?.node) return "node"
  // @ts-expect-error I know
  if (globalThis.window && globalThis.document) return "browser"
  return "unknown"
}

/**
 *  @public
 */
export function isServer() {
  return getRuntime() === "node" || getRuntime() === "bun"
}

/**
 *  @public
 */
export function isClient() {
  return getRuntime() === "browser"
}

export function isColorEnabled() {
  const runtime = getRuntime()
  if (runtime === "unknown" || runtime === "browser") {
    return false
  }

  // Environment variables
  const noColor = process.env["NO_COLOR"]
  const forceColor = process.env["FORCE_COLOR"]

  // CLI flags
  const argv = process.argv || []
  const hasColorFlag = argv.includes("--color")
  const hasNoColorFlag = argv.includes("--no-color")

  // Priority order:
  // 1. Explicit CLI flags
  if (hasNoColorFlag) return false
  if (hasColorFlag) return true

  // 2. Environment variables
  if (noColor && noColor !== "0") return false
  if (forceColor && forceColor !== "0") return true

  // 3. Default: enable if TTY
  return isTty()
}

export function isTty() {
  const runtime = getRuntime()
  if (runtime === "unknown" || runtime === "browser") {
    return false
  }

  return Boolean(process.stdout?.isTTY && process.stderr?.isTTY)
}

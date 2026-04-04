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
  const runtime = getRuntime()
  return runtime === "node" || runtime === "bun"
}

/**
 *  @public
 */
export function isClient() {
  return getRuntime() === "browser"
}

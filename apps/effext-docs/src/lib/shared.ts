export const appName = "@kbroom/effext"
export const docsRoute = "/docs"
const _docsImageRoute = "/og/docs"
export const docsContentRoute = "/llms.mdx/docs"

// fill this with your actual GitHub info, for example:
export const gitConfig = {
  user: "ggallovalle",
  repo: "chante",
  branch: "main",
  directory: "packages/effext",
  directoryDocs: "apps/effext-docs",
  get url() {
    return `https://github.com/${gitConfig.user}/${gitConfig.repo}/tree/${gitConfig.branch}/${gitConfig.directory}`
  },
  rawPath(path: string) {
    return `https://raw.githubusercontent.com/${gitConfig.user}/${gitConfig.repo}/refs/heads/${gitConfig.branch}/${gitConfig.directoryDocs}/${path}`
  },
}

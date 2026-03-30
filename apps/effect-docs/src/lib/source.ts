import { docs } from "collections/server"
import { type InferPageType, loader } from "fumadocs-core/source"
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons"
import { appName, docsContentRoute, docsRoute, gitConfig } from "./shared"

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: docsRoute,
  plugins: [lucideIconsPlugin()],
})

export function getPageMarkdownUrl(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, "content.md"]

  return {
    segments,
    url: `${docsContentRoute}/${segments.join("/")}`,
  }
}

export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = await page.data.getText("processed")
  const module = page.slugs[0] ?? ""
  const category = `${appName}/${module}`

  return `# ${category}: ${page.data.title}
URL: ${page.url}
Source: ${gitConfig.rawPath(page.data.info.fullPath)}

${page.data.description ?? ""}

${processed}`
}

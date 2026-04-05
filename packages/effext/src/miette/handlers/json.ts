import { Stream } from "effect"
import type { Diagnostic } from "../diagnostic.js"
import { type IReportHandler, TypeId } from "./handler.js"

type JsonLabel = {
  label?: string
  span: {
    offset: number
    length: number
  }
}

type JsonDiagnostic = {
  message: string
  code?: string
  severity: "error" | "warning" | "advice"
  causes: Array<string>
  url?: string
  help?: string
  filename: string
  labels: Array<JsonLabel>
  related: Array<JsonDiagnostic>
}

export class JsonReportHandler implements IReportHandler {
  public readonly [TypeId] = TypeId

  public static default() {
    return new JsonReportHandler()
  }

  public renderReport(diagnostic: Diagnostic): Stream.Stream<string> {
    const json = JSON.stringify(this.toJsonDiagnostic(diagnostic))
    return Stream.succeed(json)
  }

  private toJsonDiagnostic(diagnostic: Diagnostic): JsonDiagnostic {
    const result: JsonDiagnostic = {
      message: diagnostic.info,
      severity: diagnostic.severity ?? "error",
      causes: this.collectCauses(diagnostic),
      filename: this.filenameFromLabels(diagnostic.labels),
      labels: this.labelsToJson(diagnostic.labels),
      related: this.relatedToJson(diagnostic.related),
    }

    if (diagnostic.code !== undefined) {
      result.code = diagnostic.code
    }

    if (diagnostic.url !== undefined) {
      result.url = diagnostic.url
    }

    if (diagnostic.help !== undefined) {
      result.help = diagnostic.help
    }

    return result
  }

  private collectCauses(diagnostic: Diagnostic): Array<string> {
    const causes: Array<string> = []
    let current: Diagnostic | undefined =
      diagnostic.diagnosticSource ?? undefined
    while (current !== undefined) {
      causes.push(current.info)
      current = current.diagnosticSource ?? undefined
    }
    return causes
  }

  private filenameFromLabels(labels: Diagnostic["labels"]): string {
    if (labels === undefined || labels.length === 0) return ""
    return ""
  }

  private labelsToJson(labels: Diagnostic["labels"]): Array<JsonLabel> {
    if (labels === undefined) return []
    return labels.map((label) => {
      const jsonLabel: JsonLabel = {
        span: {
          offset: label.span.offset,
          length: label.span.length,
        },
      }
      if (label.label !== undefined) {
        jsonLabel.label = label.label
      }
      return jsonLabel
    })
  }

  private relatedToJson(related: Diagnostic["related"]): Array<JsonDiagnostic> {
    if (related === undefined) return []
    return related.map((diag) => this.toJsonDiagnostic(diag))
  }
}

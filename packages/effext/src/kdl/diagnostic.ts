import {
  type Document,
  getLocation,
  type Node,
  type Tag,
  type Value,
} from "@bgotink/kdl"
import { Option, type Schema, SchemaIssue } from "effect"
import {
  Diagnostic,
  LabeledSpan,
  META_DIAGNOSTIC,
  SourceSpan,
} from "~/miette.js"
import type { KdlComponent } from "./model.js"

const META_COMPONENT = "kdlComponent" as const

export function tagNotAllowed(tag: Tag) {
  const tagName = tag.getName()
  const message = `Expected no tag name, got "${tagName}"`
  return new SchemaIssue.InvalidValue(Option.some(tag), {
    message,
    [META_COMPONENT]: tag,
    [META_DIAGNOSTIC]: new Diagnostic({
      code: "kdl::tag_not_allowed",
      labels: labels(labeled(message, tag)),
      help: "Remove the tag",
    }),
  })
}

export function invalidValue(value: Value, cause: SchemaIssue.Issue) {
  const v = value.getValue()
  const message = findMessage(cause) ?? "Some unknown error"
  return new SchemaIssue.InvalidValue(Option.some(v), {
    message,
    [META_COMPONENT]: value,
    [META_DIAGNOSTIC]: new Diagnostic({
      code: "kdl::invalid_value",
      labels: labels(labeled(message, value)),
      help: "Use a valid value",
    }),
  })
}

export function nodeRequiresArgument(node: Node, index: number) {
  const nodeName = node.getName()
  const message = `Expected node "${nodeName}" to have argument at index ${index}`
  return new SchemaIssue.InvalidValue(Option.none(), {
    message,
    [META_COMPONENT]: node,
    [META_DIAGNOSTIC]: new Diagnostic({
      code: "kdl::node_requires_argument",
      labels: labels(labeled(message, node)),
      help: "Add the argument",
    }),
  })
}

export function nodeRequiresProperty(node: Node, property: string) {
  const nodeName = node.getName()
  const message = `Expected node "${nodeName}" to have property "${property}"`
  return new SchemaIssue.InvalidValue(Option.none(), {
    message,
    [META_COMPONENT]: node,
    [META_DIAGNOSTIC]: new Diagnostic({
      code: "kdl::node_requires_property",
      labels: labels(labeled(message, node)),
      help: "Add the property",
    }),
  })
}

export function documentRequiresNode(document: Document, name: string) {
  const message = `Expected document to have node "${name}"`
  return new SchemaIssue.InvalidValue(Option.some(document), {
    message,
    [META_COMPONENT]: document,
    [META_DIAGNOSTIC]: new Diagnostic({
      code: "kdl::document_requires_node",
      labels: labels(labeled(message, document)),
      help: `Add a node named "${name}" to the document`,
    }),
  })
}

export function nodeNameMismatch(node: Node, expected: string, actual: string) {
  const message = `Expected node to have name "${expected}", got "${actual}"`
  return new SchemaIssue.InvalidValue(Option.some(node), {
    message,
    [META_COMPONENT]: node.name,
    [META_DIAGNOSTIC]: new Diagnostic({
      code: "kdl::node_name_mismatch",
      labels: labels(labeled(message, node.name)),
      help: `Rename the node to "${expected}"`,
    }),
  })
}

export function optRequiresArgument(
  node: Node | Document,
  optName: string,
  index: number,
) {
  const message = `Expected node "${optName}" to have argument at index ${index}`
  return new SchemaIssue.InvalidValue(Option.none(), {
    message,
    [META_COMPONENT]: node,
    [META_DIAGNOSTIC]: new Diagnostic({
      code: "kdl::option_requires_argument",
      labels: labels(labeled(message, node)),
      help: `Add an argument at index ${index}`,
    }),
  })
}

export function optRequiresProperty(node: Node, name: string) {
  const nodeName = node.getName()
  const message = `Expected node "${nodeName}" to have either a child node or a property named "${name}"`
  return new SchemaIssue.InvalidValue(Option.none(), {
    message,
    [META_COMPONENT]: node,
    [META_DIAGNOSTIC]: new Diagnostic({
      code: "kdl::option_requires_property_or_child",
      labels: labels(labeled(message, node)),
      help: `Add a child node or property named "${name}"`,
    }),
  })
}

function getMessageAnnotation(
  annotations: Schema.Annotations.Annotations | undefined,
  type: "message" | "messageMissingKey" | "messageUnexpectedKey" = "message",
): string | undefined {
  const message = annotations?.[type]
  if (typeof message === "string") return message
  return undefined
}

// why is this not exported ??? or a Issue.message or something
function findMessage(issue: SchemaIssue.Issue): string | undefined {
  switch (issue._tag) {
    case "InvalidType":
    case "OneOf":
    case "Composite":
    case "AnyOf":
      return getMessageAnnotation(issue.ast.annotations) ?? issue.toString()
    case "InvalidValue":
    case "Forbidden":
      return getMessageAnnotation(issue.annotations)
    case "MissingKey":
      return getMessageAnnotation(issue.annotations, "messageMissingKey")
    case "UnexpectedKey":
      return getMessageAnnotation(issue.ast.annotations, "messageUnexpectedKey")
    case "Filter":
      return getMessageAnnotation(issue.filter.annotations)
    case "Encoding":
      return findMessage(issue.issue)
    default:
      return undefined
  }
}

export function span(component: KdlComponent | null | undefined) {
  if (component == null) return undefined
  const location = getLocation(component)
  if (location === undefined) return undefined
  return SourceSpan.fromStartEnd(location.start.offset, location.end.offset)
}

function labeled(
  message: string,
  component: KdlComponent | null | undefined,
): LabeledSpan | undefined {
  const componentSpan = span(component)
  if (componentSpan === undefined) return undefined
  return LabeledSpan.fromSpan(message, componentSpan)
}

function labels(
  ...labels: (LabeledSpan | undefined)[]
): LabeledSpan[] | undefined {
  const result = []
  for (const label of labels) {
    if (label !== undefined) {
      result.push(label)
    }
  }
  return result.length === 0 ? undefined : result
}

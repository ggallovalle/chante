import {
  type Document,
  getLocation,
  type Node,
  type Tag,
  type Value,
} from "@bgotink/kdl"
import { Option, type Schema, SchemaIssue } from "effect"
import type { KdlComponent } from "~/model.js"
import {
  Diagnostic,
  META_DIAGNOSTIC,
  META_SPAN,
  SourceSpan,
} from "../miette/index.js"

const META_COMPONENT = "kdlComponent" as const

const tagNotAllowedH = {
  code: "kdl::tag_not_allowed",
  msg: makeTemplate(["tag"]),
}

export function tagNotAllowed(tag: Tag) {
  const issue = tagNotAllowedH
  const tagName = tag.getName()
  const [template, message] = issue.msg`Expected no tag name, got "${tagName}"`
  return new SchemaIssue.InvalidValue(Option.some(tag), {
    message,
    [META_COMPONENT]: tag,
    [META_SPAN]: span(tag),
    [META_DIAGNOSTIC]: new Diagnostic({
      code: issue.code,
      info: message,
      template,
      meta: {
        tag: tagName,
      },
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
    [META_SPAN]: span(value),
    [META_DIAGNOSTIC]: new Diagnostic({
      code: "kdl::invalid_value",
      info: message,
      help: "Use a valid value",
    }),
  })
}

const nodeRequiresArgumentH = {
  code: "kdl::node_requires_argument",
  msg: makeTemplate(["node", "index"]),
}

export function nodeRequiresArgument(node: Node, index: number) {
  const issue = nodeRequiresArgumentH
  const nodeName = node.getName()
  const [template, message] =
    issue.msg`Expected node "${nodeName}" to have argument at index ${index}`
  return new SchemaIssue.InvalidValue(Option.none(), {
    message,
    [META_COMPONENT]: node,
    [META_SPAN]: span(node),
    [META_DIAGNOSTIC]: new Diagnostic({
      code: issue.code,
      info: message,
      template,
      meta: {
        node: nodeName,
        index,
      },
      help: "Add the argument",
    }),
  })
}

const nodeRequiresPropertyH = {
  code: "kdl::node_requires_property",
  msg: makeTemplate(["node", "property"]),
}

export function nodeRequiresProperty(node: Node, property: string) {
  const issue = nodeRequiresPropertyH
  const nodeName = node.getName()
  const [template, message] =
    issue.msg`Expected node "${nodeName}" to have property "${property}"`
  return new SchemaIssue.InvalidValue(Option.none(), {
    message,
    [META_COMPONENT]: node,
    [META_SPAN]: span(node),
    [META_DIAGNOSTIC]: new Diagnostic({
      code: issue.code,
      info: message,
      template,
      meta: {
        node: nodeName,
        property,
      },
      help: "Add the property",
    }),
  })
}

const documentRequiresNodeH = {
  code: "kdl::document_requires_node",
  msg: makeTemplate(["node"]),
}

export function documentRequiresNode(document: Document, name: string) {
  const issue = documentRequiresNodeH
  const [template, message] =
    issue.msg`Expected document to have node "${name}"`
  return new SchemaIssue.InvalidValue(Option.some(document), {
    message,
    [META_COMPONENT]: document,
    [META_SPAN]: span(document),
    [META_DIAGNOSTIC]: new Diagnostic({
      code: issue.code,
      info: message,
      template,
      meta: {
        name,
      },
      help: `Add a node named "${name}" to the document`,
    }),
  })
}

const nodeNameMismatchH = {
  code: "kdl::node_name_mismatch",
  msg: makeTemplate(["expected", "actual"]),
}

export function nodeNameMismatch(node: Node, expected: string, actual: string) {
  const issue = nodeNameMismatchH
  const [template, message] =
    issue.msg`Expected node to have name "${expected}", got "${actual}"`
  return new SchemaIssue.InvalidValue(Option.some(node), {
    message,
    [META_COMPONENT]: node.name,
    [META_SPAN]: span(node.name),
    [META_DIAGNOSTIC]: new Diagnostic({
      code: issue.code,
      info: message,
      template,
      meta: {
        expected,
        actual,
      },
      help: `Rename the node to "${expected}"`,
    }),
  })
}

const optRequiresArgumentH = {
  code: "kdl::option_requires_argument",
  msg: makeTemplate(["node", "index"]),
}

export function optRequiresArgument(
  node: Node | Document,
  optName: string,
  index: number,
) {
  const issue = optRequiresArgumentH
  const [template, message] =
    issue.msg`Expected node "${optName}" to have argument at index ${index}`
  return new SchemaIssue.InvalidValue(Option.none(), {
    message,
    [META_COMPONENT]: node,
    [META_SPAN]: span(node),
    [META_DIAGNOSTIC]: new Diagnostic({
      code: issue.code,
      info: message,
      template,
      meta: {
        node: optName,
        index,
      },
      help: `Add an argument at index ${index}`,
    }),
  })
}

const optRequiresPropertyH = {
  code: "kdl::option_requires_property_or_child",
  msg: makeTemplate(["node", "property"]),
}

export function optRequiresProperty(node: Node, name: string) {
  const issue = optRequiresPropertyH
  const nodeName = node.getName()
  const [template, message] =
    issue.msg`Expected node "${nodeName}" to have either a child node or a property named "${name}"`
  return new SchemaIssue.InvalidValue(Option.none(), {
    message,
    [META_COMPONENT]: node,
    [META_SPAN]: span(node),
    [META_DIAGNOSTIC]: new Diagnostic({
      code: issue.code,
      info: message,
      template,
      meta: {
        node: nodeName,
        property: name,
      },
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

function makeTemplate(names: string[]) {
  return function template(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): [string, string] {
    // Raw template with named placeholders
    // based on https://projectfluent.org/
    const rawTemplate = String.raw(strings, ...names.map((n) => `{ $${n} }`))

    // Evaluated message
    const message = String.raw(strings, ...values)

    return [rawTemplate, message]
  }
}

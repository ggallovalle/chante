import type {
  Document,
  Entry,
  Identifier,
  Tag as KdlTag,
  Value as KdlValue,
  Node,
} from "@bgotink/kdl"

import type { SourceSpan } from "~/miette.js"

export type KdlComponent =
  | KdlValue
  | KdlTag
  | Identifier
  | Entry
  | Node
  | Document

export interface Value<T> {
  readonly value: T
  readonly span: SourceSpan | undefined
  readonly tagName: string | undefined
  readonly tagSpan: SourceSpan | undefined
}

export interface EntryArgument<T> {
  readonly index: number
  readonly data: Value<T>
}

export interface EntryProperty<T> {
  readonly name: string
  readonly nameSpan: SourceSpan | undefined
  readonly data: Value<T>
  readonly span: SourceSpan | undefined
}

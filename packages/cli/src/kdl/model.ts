import type {
  Document,
  Entry,
  Identifier,
  Node as KdlNode,
  Tag as KdlTag,
  Value as KdlValue,
} from "@bgotink/kdl"

import type { SourceSpan } from "~/miette.js"

export type KdlComponent =
  | KdlValue
  | KdlTag
  | Identifier
  | Entry
  | KdlNode
  | Document

export interface Value<T> {
  readonly value: T
  readonly span: SourceSpan | undefined
  readonly tagName: string | undefined
  readonly tagSpan: SourceSpan | undefined
}

export interface EntryArgument<T> {
  readonly index: number
  readonly data: T
}

export interface EntryProperty<T> {
  readonly name: string
  readonly nameSpan: SourceSpan | undefined
  readonly data: T
  readonly span: SourceSpan | undefined
}

export interface Node<T> {
  readonly name: string
  readonly nameSpan: SourceSpan | undefined
  readonly children: T
  readonly span: SourceSpan | undefined
}

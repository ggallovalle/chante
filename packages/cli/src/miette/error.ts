import { Predicate, Schema } from "effect"

const TypeId = "~miette/MietteError"

export const isMietteError = (u: unknown): u is MietteError => Predicate.hasProperty(u, TypeId)

export type MietteError =
  | OutOfBounds
  | IoError

export class OutOfBounds extends Schema.ErrorClass(`${TypeId}/OutOfBounds`)({
  _tag: Schema.tag("OutOfBounds"),
}) {
  /**
   * @since 4.0.0
   */
  readonly [TypeId] = TypeId

  /**
   * @since 4.0.0
   */
  override get message() {
    return "The given offset is outside the bounds of its Source"
  }
}

export class IoError extends Schema.ErrorClass(`${TypeId}/IoError`)({
  _tag: Schema.tag("MietteIssue"),
  cause: Schema.Defect
}) {
  /**
   * @since 4.0.0
   */
  readonly [TypeId] = TypeId

  override get message() {
    return String(this.cause)
  }
}


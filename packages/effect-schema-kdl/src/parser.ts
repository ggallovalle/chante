import { parse } from "@bgotink/kdl"
import {
  Option as EffectOption,
  Result,
  type Schema,
  type SchemaAST,
  SchemaIssue,
  SchemaParser,
} from "effect"

export const decodeSourceResult = <S extends Schema.Decoder<unknown>>(
  schema: S,
) => {
  const componentType = schema.ast.annotations?.["kdlComponent"]
  if (typeof componentType !== "string") {
    throw new Error(
      "The schema MUST be a KDL component, either 'value', 'node' or 'document'",
    )
  }

  const parser = SchemaParser.decodeUnknownResult(schema)
  return (
    source: string,
    options?: SchemaAST.ParseOptions,
  ): Result.Result<S["Type"], SchemaIssue.Issue> => {
    try {
      const kdl = parse(source, {
        // biome-ignore lint/suspicious/noExplicitAny: I know
        as: componentType as any,
        storeLocations: true,
      })
      return parser(kdl, options)
      // biome-ignore lint/suspicious/noExplicitAny: I know
    } catch (error: any) {
      return Result.fail(
        new SchemaIssue.InvalidValue(EffectOption.some(source), {
          message: error.message,
        }),
      )
    }
  }
}

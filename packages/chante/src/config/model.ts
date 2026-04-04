import { Schema } from "effect"

class StoredLocationSchema extends Schema.Opaque<StoredLocationSchema>()(
  Schema.Struct({
    start: Schema.Struct({ line: Schema.Number, column: Schema.Number }),
    end: Schema.Struct({ line: Schema.Number, column: Schema.Number }),
  }),
) {}

class ChantePackage extends Schema.Opaque<ChantePackage>()(
  Schema.Struct({
    name: Schema.String,
    root: Schema.optional(Schema.String),
  }),
) {}

class ChanteBundle extends Schema.Opaque<ChanteBundle>()(
  Schema.Struct({
    name: Schema.String,
    requires: Schema.Array(Schema.String),
    files: Schema.Array(
      Schema.Struct({
        relativeTo: Schema.Literals(["home", "config"]),
        op: Schema.Literals(["cp", "ln", "template"]),
        source: Schema.String,
        target: Schema.String,
        location: StoredLocationSchema,
      }),
    ),
  }),
) {}

export class ChanteSettings extends Schema.Opaque<ChanteSettings>()(
  Schema.Struct({
    user: Schema.String,
    paths: Schema.Struct({
      home: Schema.String,
      config: Schema.String,
      cache: Schema.String,
      data: Schema.String,
      bin: Schema.String,
      dotfiles: Schema.String,
    }),
  }),
) {}

export class ChanteConfig extends Schema.Opaque<ChanteConfig>()(
  Schema.Struct({
    settings: ChanteSettings,
    packages: Schema.Array(ChantePackage),
    bundles: Schema.Array(ChanteBundle),
  }),
) {
  static decodeUnknown = Schema.decodeUnknownEffect(ChanteConfig)
  static encodeUnknownAsJson = Schema.encodeUnknownEffect(
    Schema.toCodecJson(ChanteConfig),
  )
}

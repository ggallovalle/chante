/** biome-ignore-all lint/suspicious/noExplicitAny: I know */
import { Cause, Effect, Exit, Ref, Schema, Scope } from "effect"
import * as FC from "effect/testing/FastCheck"
import { test as baseTest } from "vitest"

/**
 * @since 1.0.0
 */
export type Arbitraries =
  | Array<Schema.Schema<any> | FC.Arbitrary<any>>
  | { [K in string]: Schema.Schema<any> | FC.Arbitrary<any> }

export const test = baseTest
  .extend("effect", async ({}, { onCleanup }) => {
    const scope = await Effect.runPromise(Scope.make("sequential"))
    const ref = await Effect.runPromise(
      Ref.make(Exit.succeed(undefined) as Exit.Exit<unknown, unknown>),
    )

    onCleanup(async () => {
      const exit = await Effect.runPromise(Ref.get(ref))
      await Effect.runPromise(Scope.close(scope, exit))
    })

    const run: <A, E, R>(
      test: Effect.Effect<A, E, R | Scope.Scope>,
    ) => Promise<void> = async (test) => {
      const program = test.pipe(Scope.provide(scope))
      const exit = await Effect.runPromiseExit(program as any)
      await Effect.runPromise(Ref.set(ref, exit))
      if (Exit.isFailure(exit)) {
        const defect = Cause.prettyErrors(exit.cause)
        throw defect
      }
    }

    return run
  })
  .extend("prop", ({}, {}) => {
    const effect = Effect.runPromise
    const prop = <const Arbs extends Arbitraries, A, E, R>(
      arbitraries: Arbs,
      test: (
        properties: {
          [K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T>
            ? T
            : Arbs[K] extends Schema.Schema<infer T>
              ? T
              : never
        },
      ) => Effect.Effect<A, E, R | Scope.Scope>,
    ): FC.IAsyncProperty<any> => {
      if (Array.isArray(arbitraries)) {
        const arbs = arbitraries.map((arbitrary) => {
          if (Schema.isSchema(arbitrary)) {
            return Schema.toArbitrary(arbitrary)
          }
          return arbitrary as FC.Arbitrary<any>
        })
        // @ts-expect-error I Know
        return FC.asyncProperty(...arbs, (...as) => effect(test(as)))
      }

      const objArb = Object.keys(arbitraries).reduce(
        (result, key) => {
          const arb: any = arbitraries[key]
          if (Schema.isSchema(arb)) {
            result[key] = Schema.toArbitrary(arb)
          } else {
            result[key] = arb
          }
          return result
        },
        {} as Record<string, FC.Arbitrary<any>>,
      )

      const arbs = FC.record(objArb)

      // @ts-expect-error I know
      return FC.asyncProperty(arbs, (as) => effect(test(as)))
    }

    return prop
  })

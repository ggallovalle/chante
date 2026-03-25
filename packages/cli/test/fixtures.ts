import { Cause, Effect, Exit, Ref, Scope } from "effect"
import { test as baseTest } from "vitest"

export const test = baseTest.extend("effect", async ({}, { onCleanup }) => {
  const scope = await Effect.runPromise(Scope.make("sequential"))
  const ref = await Effect.runPromise(
    Ref.make(Exit.succeed(undefined) as Exit.Exit<unknown, unknown>),
  )

  onCleanup(async () => {
    const exit = await Effect.runPromise(Ref.get(ref))
    await Effect.runPromise(Scope.close(scope, exit))
  })

  const run: (
    test: Effect.Effect<unknown, unknown, Scope.Scope>,
  ) => Promise<void> = async (test) => {
    const program = test.pipe(
      Scope.provide(scope),
      // Effect.provide(TestEnv)
    )
    const exit = await Effect.runPromiseExit(program)
    await Effect.runPromise(Ref.set(ref, exit))
    if (Exit.isFailure(exit)) {
      const defect = Cause.prettyErrors(exit.cause)
      throw defect
    }
  }

  return run
})

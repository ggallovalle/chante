# testing/vitest

A Vitest fixture for testing Effect-based code with proper scope management.

## Usage

Import the `test` function and use it like regular Vitest:

```typescript
import { test, Effect } from "@kbroom/effect/testing/vitest"

test("my effect test", ({ effect, expect }) =>
  effect(
    Effect.gen(function* () {
      const result = yield* Effect.succeed(42)
      expect(result).toBe(42)
    }),
  ),
)
```

The fixture automatically:
- Creates a fresh `Scope` for each test
- Provides the scope to your effect via `Scope.provide`
- Captures the test exit status
- Properly closes the scope on cleanup with the captured exit
- Reports defects (uncaught errors) as test failures

## API

### `test`

Vitest test function extended with an `effect` function in the test context.

#### Context

- `effect(effect)`: Runs an `Effect` with the test's scope. Throws if the effect fails (defects are pretty-printed).

## Why?

Effect's `Scope` is powerful but requires manual management. This fixture:
- Creates a sequential scope per test
- Ensures all fibers spawned in the test are terminated before the next test
- Properly closes the scope with the test's exit status (success or failure)
- Makes defect errors readable in test output

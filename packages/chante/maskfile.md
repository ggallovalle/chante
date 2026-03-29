# Tasks

## showcase-config-errors

> Run all the examples of common config errors

```bash

for file in examples/errors/*.kdl; do
  echo "=============================="
  echo "Running doctor check on: $file"
  echo "=============================="

  bun run src/cli.ts -- doctor -c "$file"
done
```


## test

> Run tests

**OPTIONS**
* file
    * flags: -f --file
    * type: string
    * desc: Only run tests from a specific filename
    
```bash
if [[ -z "$file" ]]; then
    # Run all tests by default
    bunx --bun vitest run
else
    bunx --bun vitest run "$file"
fi
```

### test watch

> Run tests in watch mode

```bash
bunx --bun vitest watch
```

### test changed

> Run tests that are affected by the changed files

```bash
bunx --bun vitest run --changed
```

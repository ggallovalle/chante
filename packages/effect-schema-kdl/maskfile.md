# Tasks

## test

> Run tests

**OPTIONS**
* file
    * flags: -f --file
    * type: string
    * desc: Only run tests from a specific filename
    
```bash
if [[ -z "$file" ]]; then
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

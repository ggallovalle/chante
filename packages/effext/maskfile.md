# Tasks

## test

> Run tests

**OPTIONS**

- file
    - flags: -f --file
    - type: string
    - desc: Only run tests from a specific filename
- debug
    - flags: --debug
    - desc: Start in debug mode

```bash
if [[ "$debug" == "true" ]]; then
    if [[ -z "$file" ]]; then
        # cant use --bun because of this issue
        # https://github.com/oven-sh/bun/issues/2445
        bunx vitest --inspect-brk --no-file-parallelism run
    else
        bunx vitest --inspect-brk --no-file-parallelism run "$file"
    fi
elif [[ -z "$file" ]]; then
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

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

```bash
bun run test
```


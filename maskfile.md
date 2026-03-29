# Tasks

Development tasks for `chante`

## deps
> Commands related to manage dependencies

### deps install

> Install all dependencies

```bash
bun install
```

### deps add (package)

> Add dependency

**OPTIONS**
* dev
    * flags: --dev
    * desc: Dev dependency
* version
    * flags: --version
    * type: string
    * desc: Package version

```bash
spec="$package"
if [[ -n "$version" ]]; then
    spec="${package}@${version}"
fi

if [[ "$dev" == "true" ]]; then
    bun add --dev "$spec"
else
    bun add "$spec"
fi
```

## build
> Build all packages with turbo

```bash
bunx turbo run build
```

## check
> Type check all packages with turbo

```bash
bunx turbo run check
```

## test
> Test all packages with turbo

```bash
bunx turbo run test
```

## lint
> Run Biome lint/format with unsafe fixes

```bash
bunx --bun @biomejs/biome check --write --unsafe
```

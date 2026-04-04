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

- dev
    - flags: --dev
    - desc: Dev dependency
- version
    - flags: --version
    - type: string
    - desc: Package version

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
bunx --bun turbo run build
```

## test

> Test all packages with turbo

```bash
bunx --bun turbo run test
```

## lint

> Run biome, knip and tsgo check

```bash
bunx --bun @biomejs/biome check --write --unsafe
bunx knip --max-show-issues 5
bunx --bun turbo run check --affected
```

## system

> System and environment information

### info

> Output environment info as JSON

```bash
ver() {
  local result=$($1 2>/dev/null | head -n 1)
  result="${result#NVIM }"
  result="${result#Nvim }"
  result="${result#v}"
  result="${result#V}"
  if [[ -n "$result" ]]; then echo "\"$result\""; else echo "null"; fi
}

node_ver=$(ver "node --version")
npm_ver=$(ver "npm --version")
bun_ver=$(ver "bun --version")
zed_ver=$(ver "zed --version")
nvim_ver=$(ver "nvim --version")
vscode_ver=$(ver "code --version")

OS_NAME=$(uname -s)
OS_KERNEL=$(uname -r)
OS_ARCH=$(uname -m)

cat <<EOF
{
  "os": {
    "name": "$OS_NAME",
    "kernel": "$OS_KERNEL",
    "arch": "$OS_ARCH"
  },
  "runtime": {
    "node": $node_ver,
    "npm": $npm_ver,
    "bun": $bun_ver
  },
  "editor": {
    "zed": $zed_ver,
    "nvim": $nvim_ver,
    "vscode": $vscode_ver
  },
  "timestamp": "$(date -Iseconds)"
}
EOF
```

## docs

> Development tasks for documentation websites

### dev

> Start the dev server for docs/effect

```bash
cd apps/effext-docs && bun --bun run dev
```

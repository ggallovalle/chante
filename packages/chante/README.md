# @kbroom/chante

A dotfiles manager built with Effect.

## Installation

```bash
bun add -g @kbroom/chante
```

## Features

- **KDL Configuration**: Define your dotfiles configuration using KDL (Killer Document Language)
- **Schema Validation**: Validate your config with Effect Schema
- **Pretty Errors**: Beautiful error reporting powered by Miette

## Usage

```bash
# Check your configuration
chante doctor

# Apply your dotfiles
chante up

# Tear down your dotfiles
chante down
```

## Configuration

Create a `chante.kdl` file in your home directory:

```kdl
dotfiles {
  files [
    ".bashrc"
    ".zshrc"
    ".vimrc"
  ]
}
```

## Development

```bash
# Build
mask build

# Test
mask test
```

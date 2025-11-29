# @drawink/prettier-config

Excalidraw's [Prettier](https://prettier.io) config.

## Usage

### Install

```bash
yarn add --dev @drawink/prettier-config prettier
```

### Edit `package.json`

```jsonc
{
  // ...
  "prettier": "@drawink/prettier-config"
}
```

## What you get

```json
{
  "proseWrap": "never",
  "trailingComma": "all",
  "overrides": [
    {
      "files": ["*.json"],
      "options": {
        "printWidth": 256
      }
    }
  ]
}
```

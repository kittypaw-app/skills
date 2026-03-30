# KittyPaw Skill Registry

Community skill packages for [KittyPaw](https://kittypaw.app).

## How to add a skill

1. Fork this repo
2. Create `packages/your-skill-name/package.toml` + `main.js`
3. Add an entry to `index.json`
4. Open a PR

## Package format

```
packages/your-skill/
  package.toml   # Metadata, config schema, permissions
  main.js        # Skill code (runs in QuickJS sandbox)
  README.md      # Optional documentation
```

See existing packages for examples.

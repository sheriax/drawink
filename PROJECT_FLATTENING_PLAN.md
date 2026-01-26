# Drawink Project Flattening Plan (COMPLETE & UPDATED)

**Date:** 2026-01-26  
**Status:** ⚠️ PARTIALLY COMPLETE - Resuming Migration  
**Time Remaining:** 3-4 hours  
**Risk Level:** Medium

---

## ⚠️ CURRENT STATE

**Files Already Copied to src/lib/ (DUPLICATES):**
- src/lib/common/ - 17 files  
- src/lib/elements/ - 44 files (Scene.ts differs!)  
- src/lib/math/ - 15 files  
- src/lib/utils/ - 6 files  
- src/lib/types/ - 10 files  

**NOT Done:**
- ❌ packages/drawink/ (371 files) - NOT moved
- ❌ All imports still use @drawink/*  
- ❌ Configs still point to packages/

**Decision:** Delete src/lib/* duplicates, use packages/ as source of truth, complete migration

---

## Quick Start

```bash
# 1. Backup
git checkout -b backup/pre-flatten-$(date +%Y%m%d)
git push origin backup/pre-flatten-$(date +%Y%m%d)

# 2. New branch
git checkout master && git checkout -b refactor/flatten-complete

# 3. Clean duplicates
rm -rf src/lib/common src/lib/elements src/lib/math src/lib/utils src/lib/types

# 4. Move packages to src
rsync -av --exclude='node_modules' --exclude='dist' --exclude='package.json' packages/drawink/ src/core/
rsync -av --exclude='node_modules' packages/common/src/ src/lib/common/
rsync -av --exclude='node_modules' packages/element/src/ src/lib/elements/
rsync -av --exclude='node_modules' packages/math/src/ src/lib/math/
rsync -av --exclude='node_modules' packages/utils/src/ src/lib/utils/
rsync -av --exclude='node_modules' packages/types/src/ src/lib/types/
rsync -av --exclude='node_modules' packages/trpc/src/ src/api/
rsync -av --exclude='node_modules' packages/ui/src/ src/ui/primitives/
rsync -av --exclude='node_modules' packages/config/ config/

# 5. Update imports (create script first)
node scripts/migrate-imports.mjs

# 6. Update configs
# Edit tsconfig.json - change paths to "@/*": ["src/*"]
# Edit vite.config.ts - change alias to "@": "src"
# Edit package.json - remove workspace deps

# 7. Install fresh
rm -rf node_modules bun.lockb
bun install

# 8. Test
bun run build
bun run dev

# 9. Delete packages
rm -rf packages/

# 10. Commit
git add -A && git commit -m "refactor: flatten monorepo to single src/ directory"
```

---

## Migration Script

Create `scripts/migrate-imports.mjs`:

```javascript
#!/usr/bin/env node
import fs from 'fs';
import { glob } from 'glob';

const mapping = {
  '@drawink/drawink': '@/core',
  '@drawink/element': '@/lib/elements',
  '@drawink/common': '@/lib/common',
  '@drawink/math': '@/lib/math',
  '@drawink/utils': '@/lib/utils',
  '@drawink/types': '@/lib/types',
  '@drawink/trpc': '@/api',
  '@drawink/ui': '@/ui/primitives',
};

const files = await glob('src/**/*.{ts,tsx}');
let total = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  for (const [old, neu] of Object.entries(mapping)) {
    const regex = new RegExp(`(from\\s+["'])${old.replace(/\//g, '\\/')}(\\/[^"']*)?["']`, 'g');
    if (content.match(regex)) {
      content = content.replace(regex, (_, p, sub) => `${p}${neu}${sub || '"}"`);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, content);
    total++;
    console.log(`✓ ${file}`);
  }
}

console.log(`\n✅ Updated ${total} files`);
```

---

## Config Changes

### tsconfig.json
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*", "vite-env.d.ts", "global.d.ts"],
  "exclude": ["node_modules", "dist", "config", "packages"]
}
```

### vite.config.ts
```typescript
resolve: {
  alias: {
    "@": path.resolve(__dirname, "src"),
  },
}
```

### package.json
Remove:
```json
"workspaces": ["packages/*"],
"dependencies": {
  "@drawink/drawink": "workspace:*",
  ...all workspace deps
}
```

---

## Testing Checklist

**After migration:**
- [ ] `bun run typecheck` - Errors reduced  
- [ ] `bun run build` - Succeeds  
- [ ] `bun run dev` - App loads  
- [ ] Canvas renders  
- [ ] Drawing works  
- [ ] Selection works  
- [ ] No console errors  

**If ANY fails, check:**
1. Import paths correct?  
2. Configs updated?  
3. node_modules reinstalled?  

---

## Rollback

```bash
git checkout backup/pre-flatten-$(date +%Y%m%d)
```

---

## Success Metrics

| Metric | Before | Target |
|--------|--------|--------|
| TS Errors | 168 | <100 |
| Build Time | 30s | <35s |
| Packages | 11 | 1 |
| Duplicates | 92 | 0 |

---

**Ready? Start with Quick Start section above.**

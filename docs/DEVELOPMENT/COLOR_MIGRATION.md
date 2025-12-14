# Color Migration Guide

## Overview

This guide explains how to migrate hardcoded colors to theme colors in ELARO for consistent light/dark mode support.

## Quick Start

- Dry run

```bash
npm run migrate-colors:dry
```

- Apply fixes

```bash
npm run migrate-colors:fix
```

- Show statistics

```bash
npm run migrate-colors:stats
```

## Mapped Colors (examples)

- `#007AFF` → `COLORS.primary`
- `#FFFFFF` → `COLORS.white`
- `#333333` → `COLORS.textPrimary`
- `#666666` → `COLORS.textSecondary`
- `#FF3B30` → `COLORS.error`
- `#34C759` → `COLORS.success`
- `#FF9500` → `COLORS.warning`
- `#f8f9fa` → `COLORS.backgroundSecondary`

## Manual Fix Patterns

Before:

```ts
color: '#333333';
```

After:

```ts
color: COLORS.textPrimary;
```

Before:

```ts
backgroundColor: '#FFFFFF';
```

After:

```ts
backgroundColor: COLORS.white;
```

## Theme-aware Usage

```ts
const { theme } = useTheme();
<View style={{ backgroundColor: theme.background }} />
<Text style={{ color: theme.text }} />
```

## Troubleshooting

- Shadow colors: keep `shadowOpacity`/`shadowRadius`, replace `#000` with `COLORS.black`.
- Unmapped colors: add to mappings in `src/utils/colorMigration.ts`.

---

Status: Ready

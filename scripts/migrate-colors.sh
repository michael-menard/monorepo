#!/bin/bash

# Color Migration Script - Cyberpunk to Nature-Inspired Theme
# Replaces hardcoded sky/slate/amber colors with design system tokens

set -e

echo "🎨 Migrating colors from Cyberpunk to Nature-Inspired theme..."

# Define the target directory
TARGET_DIR="apps/web/main-app/src"

# Perform replacements using simple sed commands
echo "  Replacing sky-500 -> primary..."
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/bg-sky-500/bg-primary/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/text-sky-500/text-primary/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/text-sky-600/text-primary/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/border-sky-500/border-primary/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/from-sky-500/from-primary/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/to-sky-500/to-primary/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/hover:text-sky-500/hover:text-primary/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/focus:border-sky-500/focus:border-primary/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/focus:ring-sky-500/focus:ring-primary/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/data-\[state=checked\]:bg-sky-500/data-[state=checked]:bg-primary/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/data-\[state=checked\]:border-sky-500/data-[state=checked]:border-primary/g' {} +

echo "  Replacing sky-50/950 -> background/muted..."
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/bg-sky-50/bg-muted/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/from-sky-50/from-background/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/to-sky-50/to-muted/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/to-sky-950/to-background/g' {} +

echo "  Replacing slate-950 -> background/card..."
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/bg-slate-950/bg-background/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/from-slate-950/from-background/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:from-slate-950/dark:from-background/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:to-sky-950/dark:to-background/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:via-slate-900/dark:via-card/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:hover:bg-slate-950/dark:hover:bg-card/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:focus:bg-slate-950/dark:focus:bg-card/g' {} +

echo "  Replacing slate text colors..."
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/text-slate-300/text-muted-foreground/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:hover:text-slate-300/dark:hover:text-foreground/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:focus:text-slate-300/dark:focus:text-foreground/g' {} +

echo "  Replacing slate borders..."
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/border-slate-200/border-input/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/border-slate-300/border-input/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/from-slate-50/from-background/g' {} +

echo "  Replacing amber -> warning..."
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/bg-amber-500/bg-warning/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/text-amber-500/text-warning/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/border-amber-500/border-warning/g' {} +

echo "  Replacing remaining sky colors..."
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/from-sky-600/from-primary/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/to-teal-600/to-accent/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/text-sky-700/text-primary/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/text-sky-300/text-primary-foreground/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/hover:text-sky-700/hover:text-primary/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/focus:text-sky-700/focus:text-primary/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/bg-sky-100/bg-primary\/10/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/border-sky-200/border-primary\/20/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/ring-sky-200/ring-primary\/20/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:bg-sky-900/dark:bg-primary\/20/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:border-sky-800/dark:border-primary\/30/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:from-sky-950/dark:from-background/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:to-teal-950/dark:to-card/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/to-teal-50/to-accent\/10/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:hover:bg-sky-950/dark:hover:bg-primary\/10/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:focus:bg-sky-950/dark:focus:bg-primary\/10/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:hover:text-sky-300/dark:hover:text-primary-foreground/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:focus:text-sky-300/dark:focus:text-primary-foreground/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/hover:from-sky-600/hover:from-primary/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/hover:to-teal-600/hover:to-accent/g' {} +

echo "  Replacing remaining slate colors..."
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/hover:bg-slate-100/hover:bg-muted/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:hover:bg-slate-800/dark:hover:bg-muted/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/hover:bg-slate-50/hover:bg-muted/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/focus:bg-slate-50/focus:bg-muted/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/text-slate-700/text-foreground/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/text-slate-800/text-foreground/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/text-slate-600/text-muted-foreground/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/text-slate-400/text-muted-foreground/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/text-slate-500/text-muted-foreground/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/hover:text-slate-700/hover:text-foreground/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/hover:text-slate-600/hover:text-foreground/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/hover:text-slate-900/hover:text-foreground/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/focus:text-slate-700/focus:text-foreground/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/focus:ring-slate-200/focus:ring-primary\/20/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/bg-slate-100/bg-muted/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:bg-slate-900/dark:bg-card/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:border-slate-800/dark:border-border/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/bg-white/bg-card/g' {} +

echo "  Replacing dark mode slate variants..."
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:border-slate-700/dark:border-border/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:bg-slate-800/dark:bg-card/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:bg-slate-700/dark:bg-muted/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:hover:bg-slate-700/dark:hover:bg-muted/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:text-slate-100/dark:text-foreground/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/text-slate-900/text-foreground/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:border-slate-600/dark:border-border/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/fill-slate-800/fill-foreground/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/bg-slate-200/bg-muted/g' {} +

echo "  Replacing dark mode sky variants..."
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/dark:text-sky-400/dark:text-primary-foreground/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/text-\[#1877F2\]/text-primary/g' {} +

echo "  Replacing SVG illustration colors..."
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/fill-sky-500/fill-primary/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/fill-sky-400/fill-primary\/70/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/fill-amber-500/fill-warning/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/fill-amber-700/fill-warning/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/to-amber-500/to-warning/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/to-amber-600/to-warning/g' {} +
find "$TARGET_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/hover:to-amber-600/hover:to-warning/g' {} +

echo "✅ Color migration complete!"
echo ""
echo "📊 Remaining old colors:"
grep -r "sky-\|slate-950\|amber-" "$TARGET_DIR" --include="*.tsx" --include="*.ts" | wc -l || echo "0"


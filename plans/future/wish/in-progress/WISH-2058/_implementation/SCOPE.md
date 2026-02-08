# Scope - WISH-2058

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | false | No API changes - WebP format is already accepted by S3 |
| frontend | true | imageCompression.ts config change, toast message update, filename extension handling |
| infra | false | No infrastructure changes required |

## Scope Summary

This story changes the image compression output format from JPEG to WebP by updating the `fileType` configuration in `imageCompression.ts`. The change affects compression presets, toast notifications, and filename extensions while maintaining the existing compression quality of 0.8.

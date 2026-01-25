# Token Tracking Standard

## For Workers
End output with:
```
## Tokens
- In: ~X (bytes read / 4)
- Out: ~Y (bytes written / 4)
```

## For Leaders
Before completion signal:
```
/token-log STORY-XXX <phase-name> <input> <output>
```

Phase names: `dev-fix-setup`, `dev-fix`, `dev-fix-verification`, `dev-fix-documentation`

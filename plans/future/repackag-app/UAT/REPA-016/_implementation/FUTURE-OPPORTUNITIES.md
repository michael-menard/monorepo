# Future Opportunities - REPA-016

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Schema alignment between form and API layers | Medium | Medium | Consider aligning validation rules between form.ts and api.ts for fields that appear in both (e.g., Designer, Dimensions). Currently form uses strict validation while API uses nullable - this is intentional but could cause confusion. |
| 2 | No shared sub-schema exports | Low | Low | Sub-schemas like DesignerSchema, DimensionsSchema are defined in both form.ts and api.ts with different validation. Consider extracting truly shared sub-schemas to utils.ts or a shared.ts file to enforce DRY principle. |
| 3 | Helper function coverage | Low | Low | Current helpers (normalizeTags, createEmpty*, isFormValidForFinalize, getFormErrors) are MOC-specific. Consider adding Set-specific helpers if Set forms are actively used. |
| 4 | Test coverage for utils.ts | Medium | Low | When extracting helper functions to utils.ts, ensure test coverage includes these utilities separately. Current tests are integrated with form validation. |
| 5 | No validation for form.ts vs api.ts schema drift | Medium | Medium | Over time, form.ts and api.ts may drift apart. Consider adding a test that validates certain fields remain aligned (e.g., required fields, enum values). |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Storybook documentation for schemas | High | Medium | Add Storybook stories demonstrating form.ts vs api.ts usage patterns. Show when to use each, and document the key differences (strict vs lenient validation). |
| 2 | Schema validation performance | Low | Low | Current form validation runs on every field blur. Consider debouncing or optimizing validation for large forms with many fields. Not needed for MVP but useful for UX polish. |
| 3 | Export individual sub-schemas | Medium | Low | Currently all sub-schemas are bundled in form.ts. Consider re-exporting them individually from index.ts for flexibility: `export { DesignerSchema, DimensionsSchema } from './form'`. Allows consumers to compose custom schemas. |
| 4 | TypeScript strict mode alignment | Low | Low | Verify that schemas work correctly with strict TypeScript mode across all consuming apps. Currently main-app and app-instructions-gallery may have different tsconfig settings. |
| 5 | Zod error message customization | Medium | Medium | Form schemas have custom error messages ("Title is required"). Consider extracting error messages to a constants file for i18n support in the future. |
| 6 | Form schema versioning | Low | High | If form schemas evolve significantly, consider versioning (e.g., form-v1.ts, form-v2.ts) to support migration paths. Not needed now but useful for backward compatibility. |
| 7 | Documentation for discriminated union pattern | Medium | Low | MocInstructionFormSchema uses discriminated union (MOC vs Set). Document this pattern in architecture docs as a reusable approach for other domain entities. |
| 8 | Consolidate with @repo/api-types | Medium | High | Long-term opportunity: Evaluate whether @repo/api-types/moc (961 lines, backend domain) and @repo/api-client/schemas/instructions/form.ts could share more code. May require significant refactoring to align backend and frontend schemas. |
| 9 | Add runtime schema validation helpers | Low | Medium | Consider adding utilities like `validatePartial(schema, data)` for partial form validation during multi-step forms. Useful for future features like draft auto-save. |
| 10 | Schema composition utilities | Low | Medium | For complex forms, add utilities to compose schemas dynamically (e.g., conditional fields based on MOC vs Set type). Would improve form flexibility. |

## Categories

### Edge Cases
- **Validation edge cases:** Form schemas handle empty strings with `.or(z.literal(''))` pattern. Consider adding tests for other edge cases like very long strings, unicode characters, special characters in URLs.
- **Error message edge cases:** Current error messages are English-only. Consider edge cases for localization.

### UX Polish
- **Inline error messages:** Form validation provides field-level errors. Consider adding field-level success indicators for completed sections.
- **Progressive disclosure:** For complex forms with many fields, consider progressive disclosure pattern (only show relevant fields based on previous inputs).
- **Validation debouncing:** Add debouncing to field validation to reduce unnecessary validation calls during rapid typing.

### Performance
- **Schema parsing optimization:** Zod schemas are parsed on every validation. Consider caching parsed schemas for large forms.
- **Lazy loading for large schemas:** If form.ts grows significantly, consider code-splitting utilities and sub-schemas.

### Observability
- **Validation analytics:** Track which fields most commonly fail validation to identify UX issues.
- **Schema usage metrics:** Track which schemas are most frequently used (MOC vs Set) to prioritize future enhancements.

### Integrations
- **Form library integration guides:** Document how to use these schemas with react-hook-form, Formik, and other popular form libraries.
- **API client integration:** Provide examples of using form.ts schemas with api.ts responses (e.g., pre-filling forms from API data).

### Testing Improvements
- **Property-based testing:** Add property-based tests using libraries like fast-check to validate schemas against randomly generated data.
- **Schema snapshot testing:** Add snapshot tests for schema structure to catch unintended breaking changes.
- **Cross-browser validation:** Ensure schema validation works consistently across different browsers (especially URL validation).

### Documentation Opportunities
- **Migration guide:** Create a guide for future schema migrations (lessons learned from REPA-016).
- **Schema decision tree:** Document when to use form.ts vs api.ts vs @repo/api-types/moc.
- **Best practices doc:** Document schema organization patterns for other domains (wishlist, sets, inspiration).

---

## Long-Term Vision

### Schema Organization Evolution

**Current state (post-REPA-016):**
```
@repo/api-client/schemas/instructions/
  ├── api.ts      # API response schemas
  ├── form.ts     # Form validation schemas
  ├── utils.ts    # Helper functions
  └── index.ts    # Re-exports
```

**Future state (aspirational):**
```
@repo/api-client/schemas/instructions/
  ├── api/
  │   ├── responses.ts   # GET response schemas
  │   ├── mutations.ts   # POST/PUT/PATCH input schemas
  │   └── index.ts
  ├── form/
  │   ├── moc.ts         # MOC-specific form schemas
  │   ├── set.ts         # Set-specific form schemas
  │   ├── shared.ts      # Shared sub-schemas
  │   └── index.ts
  ├── utils/
  │   ├── validation.ts  # Validation utilities
  │   ├── helpers.ts     # Helper functions
  │   └── index.ts
  └── index.ts           # Top-level re-exports
```

This would provide even clearer separation of concerns but is not needed for MVP.

### Integration with @repo/api-types

Currently there are THREE schema locations for MOC/Instructions:

1. **@repo/api-client/schemas/instructions/form.ts** - Client-side form validation (327 lines)
2. **@repo/api-client/schemas/instructions/api.ts** - Client-side API validation (377 lines)
3. **@repo/api-types/src/moc/index.ts** - Backend/frontend shared domain (961 lines)

**Future opportunity:** Evaluate consolidation strategy:
- Keep form.ts separate (form-specific validation)
- Merge api.ts into @repo/api-types with frontend-specific extensions?
- Or keep separate for clear client/server boundary?

This is a larger architectural question beyond REPA-016 scope.

---

## Notes

- All opportunities listed here are NON-BLOCKING for MVP
- Prioritize based on actual usage patterns after migration is complete
- Consider user feedback on form validation UX before investing in enhancements
- Schema consolidation (form.ts, api.ts, @repo/api-types) is a long-term architectural decision that requires broader team discussion

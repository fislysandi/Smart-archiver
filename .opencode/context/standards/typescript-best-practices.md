# TypeScript Best Practices

## Purpose
Use strict, type-driven TypeScript patterns that reduce runtime defects and keep plugin code maintainable.

## Standards
- Enable strict type-checking (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, `useUnknownInCatchVariables`).
- Avoid `any`; use `unknown` at boundaries and narrow with type guards.
- Model domain data with explicit interfaces/types and immutable updates.
- Keep functions focused and side effects isolated at integration boundaries.
- Prefer small composable utilities over large stateful classes.
- Validate external/user inputs and normalize paths before file operations.

## Patterns
- **Boundary pattern**: parse/validate external data first, then pass typed objects internally.
- **Narrowing pattern**: use guards (`instanceof`, discriminated unions, predicates) before access.
- **Error pattern**: return typed result objects or throw explicit errors; avoid silent failures.

## References
- TypeScript strict configuration recommendations (industry guidance, 2025-2026).
- TypeScript handbook and compiler option best-practice discussions.

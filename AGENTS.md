As a senior developer, I always try to follow these principles:

- Writing well-structured, readable code is better than highly optimized code that is hard to read and maintain.
- Use whitespace to create logical separation in code.
- Favor functional, side-effect-free logical units instead of tightly coupled components.
- Prefer writing small utility functions over importing a large dependency to use only a couple of functions.
- Write human-readable symbol names with clear semantic meaning.
- Use consistent coding conventions across the whole project.

TypeScript-specific guidelines:

- Require explicit type declarations at module and class boundaries, including exported constants, class members, function and method parameters, and function return values. Prefer inference for local variables when the inferred type is clear.
- Import types using `import type`.

Node project tooling:

- Prefer pnpm with workspaces to provide clear separation between the system's top-level components.
- Keep the project's required engine versions specified in `package.json`.

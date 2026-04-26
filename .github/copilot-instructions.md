# Battery Visualiser Project Instructions

## Project Goal
Build a Home Assistant custom Lovelace card that visualises battery entities with a clear, configurable UI.

## Core Scope
- Implement a custom card that auto-discovers battery entities by default.
- Display a list/grid row per battery showing, in order:
  1. Device area
  2. Device friendly name
  3. Entity name
  4. Percentage value
- Render a progress bar for each battery using CSS-first styling.
- Add explicit handling for unknown/unavailable/non-numeric values.
- Include a visual configuration editor for the card.

## Technical Architecture
- Use a web component custom element for the card.
- Use semantic HTML where practical.
- Prefer progressive enhancement:
  - Card should provide meaningful fallback text when data is missing.
  - Avoid fragile rendering assumptions about entity attributes.
- Keep the visual structure easy to iterate:
  - Author markup as Handlebars templates in source files.
  - Build step compiles templates and styles into distributable JS.

## Expected Source Layout
- src/templates/
  - card.hbs
  - battery-row.hbs
  - battery-progress.hbs
- src/styles/
  - main.scss
  - component partials as needed
- src/
  - battery-card.js
  - battery-card-editor.js
- dist/
  - battery-card.js (release artifact)

## HTML and CSS Conventions
- Use semantic table elements for tabular battery data:
  - table/thead/tbody/tr/th/td for the battery list.
- Use CSS Grid for row layout so fields can be repositioned later.
- Keep visible row columns in this order: device area, device friendly name, entity name, percentage.
- Keep HTML intentionally minimal:
  - Avoid long, overly explicit class names.
  - Prefer lightweight structural classes and data attributes for targeting.
  - Prefer hierarchical SCSS selectors under parent containers.
- Prefer CSS custom properties for values and theming hooks.
- Keep color/state logic primarily in CSS using data attributes.
- Define a state for unknown/unavailable data (for example data-level="unknown").
- Pseudo-elements are allowed for supportive labels and decoration, but do not rely on ::before/::after for primary data values that must remain accessible.
- Keep primary content in real DOM text nodes (area, device, entity, percentage/state text) for accessibility and reliable copy/select behavior.
- Prefer a single-element progress track when practical (for example gradient background driven by a CSS variable), rather than unnecessary nested markup.

## Data and Discovery Rules
- Default behavior should include all relevant battery entities.
- Treat include/exclude filters as configurable extensions.
- Use entity attributes safely:
  - Prefer friendly_name when present.
  - Fall back to entity_id-derived labels when needed.
- Normalize state values before rendering.

## Visual Editor Requirements
- Provide getConfigElement and a custom editor element.
- Expose baseline options first (title, entity filters once added).
- Keep editor UX simple and incremental.

## Build and Release Expectations
- Vite build must produce a distributable card bundle in dist/.
- Keep runtime dependencies minimal.
- Ensure generated/output files stay out of git unless explicitly intended.
- Maintain two GitHub Actions workflows:
  - .github/workflows/validate.yml for validation checks.
  - .github/workflows/release.yml for release publishing.

## Build Strategy
- **Template Precompilation**: Handlebars templates (.hbs files) are precompiled at build time via a custom Vite plugin, not compiled at runtime. This reduces bundle size significantly and improves performance.
- **SCSS Bundling**: Styles are compiled to CSS and inlined into the final card JS output as a single-file distributable.
- **No Runtime Handlebars**: The card uses only Handlebars runtime (`handlebars.runtime.js`), not the full compiler.
- **Build Output**: Single file at dist/battery-card.js (~67 kB uncompressed, ~17 kB gzipped).

## Development Tasks
- `npm run dev` — Start Vite dev server for local preview with HMR. Use this during development; open test/preview.html and refresh after changes.
- `npm run build` — Build the card bundle and SCSS into dist/battery-card.js.
- `npm run build:release` — Alias for build (matches release workflow script).

## Scripts and Tools
- **.vscode/tasks.json** — Defines VS Code tasks for Build, Build Release, and Dev Server.

## Coding Quality
- Remove unused code and imports.
- Keep functions small and focused.
- Add concise comments only for non-obvious logic.
- Maintain consistent naming and formatting.

## Definition of Done for Early Milestones
- Card loads in Home Assistant resources and renders without runtime errors.
- Rows show device area, friendly name, entity name, and percentage.
- Unknown/unavailable values are visibly distinct and non-breaking.
- Visual editor appears in Lovelace card configuration UI.
- Project builds successfully and outputs dist artifacts.

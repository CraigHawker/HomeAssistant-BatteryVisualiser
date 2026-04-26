---
applyTo: "src/battery-card.ts"
description: "Use when changing entity normalization, area mapping, sorting, or Home Assistant data access in the card runtime."
---

# Home Assistant Registry Mapping Rules

- Keep runtime code TypeScript-first with explicit types for entity/device/area access.
- Do not use `any`; add or refine interfaces/type guards when registry shapes evolve.

- Treat Home Assistant runtime data as partially available at all times.
- Never assume entity attributes include area metadata.
- Resolve area in this order:
  1. Entity attribute area_name/area
  2. Entity registry area_id via hass.entities
  3. Device registry area_id via hass.devices
  4. Fallback string Unknown
- Guard every deep data read with optional chaining or equivalent null-safe checks.
- Keep normalization deterministic and side-effect free.
- Pass context explicitly into normalizers/helpers instead of relying on hidden globals.
- Distinguish Unknown vs Unavailable in user-facing text.
- One malformed entity must never break rendering for the full table.

# Required Verification

- Confirm at least one "Use device area" entity resolves to the device area label.
- Confirm an entity with no area mapping still renders as Unknown.
- Confirm sorting remains stable when rows include mixed area resolution sources.
- Run the build after mapping changes.

export type BatteryLevelState = "unknown" | "low" | "medium" | "high";

export interface HomeAssistantStateEntity {
  entity_id: string;
  state: string;
  attributes?: Record<string, unknown>;
}

export interface EntityRegistryEntry {
  area_id?: string;
  device_id?: string;
}

export interface DeviceRegistryEntry {
  area_id?: string;
}

export interface AreaRegistryEntry {
  name?: string;
}

export interface HomeAssistantLike {
  states?: Record<string, HomeAssistantStateEntity>;
  entities?: Record<string, EntityRegistryEntry>;
  devices?: Record<string, DeviceRegistryEntry>;
  areas?: Record<string, AreaRegistryEntry>;
}

export interface BatteryRow {
  entityId: string;
  areaName: string;
  deviceName: string;
  entityName: string;
  isNumeric: boolean;
  percentage: number | null;
  levelState: BatteryLevelState;
  stateLabel: string;
}

/**
 * Extracts the object id portion from an entity id.
 * @param entityId Home Assistant entity id (for example sensor.phone_battery).
 * @returns Entity object id when valid, otherwise the original value.
 */
export const toEntityName = (entityId: string): string => {
  const [domain, objectId] = entityId.split(".");
  if (!domain || !objectId) {
    return entityId;
  }
  return objectId;
};

/**
 * Converts underscored values into title-cased display labels.
 * @param value Source value to format.
 * @returns Human-friendly label.
 */
export const toDisplayLabel = (value: string): string => {
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Clamps a numeric value to the 0-100 battery percentage range.
 * @param value Numeric battery value.
 * @returns Clamped percentage.
 */
export const clampPercent = (value: number): number => {
  return Math.max(0, Math.min(100, value));
};

/**
 * Maps a percentage to a visual level bucket.
 * @param percent Rounded battery percentage.
 * @returns Level token used by the UI.
 */
export const levelFromPercent = (percent: number): BatteryLevelState => {
  if (!Number.isFinite(percent)) {
    return "unknown";
  }
  if (percent <= 20) {
    return "low";
  }
  if (percent <= 55) {
    return "medium";
  }
  return "high";
};

const getStringAttribute = (
  attributes: Record<string, unknown>,
  key: string
): string | undefined => {
  const value = attributes[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

/**
 * Determines whether a Home Assistant state object represents a battery entity.
 * @param entity State object.
 * @returns True when entity should be included in the battery table.
 */
export const isBatteryEntity = (entity: HomeAssistantStateEntity): boolean => {
  const attrs = entity.attributes ?? {};
  const hasBatteryClass = attrs.device_class === "battery";
  const hasPercentUnit = attrs.unit_of_measurement === "%";
  const nameHint = entity.entity_id.toLowerCase().includes("battery");
  return hasBatteryClass || (hasPercentUnit && nameHint);
};

/**
 * Resolves an area name using defensive fallback order across HA registries.
 * @param entity State object.
 * @param hass Home Assistant runtime object.
 * @returns Resolved area label, or Unknown when no mapping exists.
 */
export const resolveAreaName = (
  entity: HomeAssistantStateEntity,
  hass?: HomeAssistantLike
): string => {
  const attrs = entity.attributes ?? {};

  const attributeAreaName =
    getStringAttribute(attrs, "area_name") ?? getStringAttribute(attrs, "area");
  if (attributeAreaName) {
    return attributeAreaName;
  }

  const entityRegistry = hass?.entities?.[entity.entity_id];
  const areaRegistry = hass?.areas;
  const deviceRegistry = hass?.devices;

  const entityAreaName =
    entityRegistry?.area_id ? areaRegistry?.[entityRegistry.area_id]?.name : undefined;
  if (entityAreaName) {
    return entityAreaName;
  }

  const deviceId = entityRegistry?.device_id;
  const deviceAreaId = deviceId ? deviceRegistry?.[deviceId]?.area_id : undefined;
  const deviceAreaName = deviceAreaId ? areaRegistry?.[deviceAreaId]?.name : undefined;
  if (deviceAreaName) {
    return deviceAreaName;
  }

  return "Unknown";
};

/**
 * Normalizes raw Home Assistant state data into a render-safe battery row model.
 * @param entity State object.
 * @param hass Home Assistant runtime object.
 * @returns Render model consumed by templates.
 */
export const normalizeBatteryRow = (
  entity: HomeAssistantStateEntity,
  hass?: HomeAssistantLike
): BatteryRow => {
  const attrs = entity.attributes ?? {};
  const rawState = entity.state;
  const numeric = Number.parseFloat(rawState);
  const isNumeric = Number.isFinite(numeric);
  const roundedPercent = isNumeric ? Math.round(clampPercent(numeric)) : null;

  const fallbackFriendly = toDisplayLabel(toEntityName(entity.entity_id));
  const deviceName =
    getStringAttribute(attrs, "device_name") ??
    getStringAttribute(attrs, "friendly_name") ??
    fallbackFriendly;
  const safePercent = roundedPercent ?? 0;

  return {
    entityId: entity.entity_id,
    areaName: resolveAreaName(entity, hass),
    deviceName,
    entityName: toEntityName(entity.entity_id),
    isNumeric,
    percentage: roundedPercent,
    levelState: isNumeric ? levelFromPercent(safePercent) : "unknown",
    stateLabel: isNumeric
      ? `${safePercent}%`
      : rawState === "unavailable"
        ? "Unavailable"
        : rawState === "unknown"
          ? "Unknown"
          : "Invalid"
  };
};

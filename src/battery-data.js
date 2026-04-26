/**
 * Extracts the object id portion from an entity id.
 * @param {string} entityId Home Assistant entity id (for example sensor.phone_battery).
 * @returns {string} Entity object id when valid, otherwise the original value.
 */
export const toEntityName = (entityId) => {
  const [domain, objectId] = entityId.split(".");
  if (!domain || !objectId) {
    return entityId;
  }
  return objectId;
};

/**
 * Converts underscored values into title-cased display labels.
 * @param {string} value Source value to format.
 * @returns {string} Human-friendly label.
 */
export const toDisplayLabel = (value) => {
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Clamps a numeric value to the 0-100 battery percentage range.
 * @param {number} value Numeric battery value.
 * @returns {number} Clamped percentage.
 */
export const clampPercent = (value) => {
  return Math.max(0, Math.min(100, value));
};

/**
 * Maps a percentage to a visual level bucket.
 * @param {number} percent Rounded battery percentage.
 * @returns {"unknown"|"low"|"medium"|"high"} Level token used by the UI.
 */
export const levelFromPercent = (percent) => {
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

/**
 * Determines whether a Home Assistant state object represents a battery entity.
 * @param {{ entity_id: string, attributes?: Record<string, unknown> }} entity State object.
 * @returns {boolean} True when entity should be included in the battery table.
 */
export const isBatteryEntity = (entity) => {
  const attrs = entity.attributes || {};
  const hasBatteryClass = attrs.device_class === "battery";
  const hasPercentUnit = attrs.unit_of_measurement === "%";
  const nameHint = entity.entity_id.toLowerCase().includes("battery");
  return hasBatteryClass || (hasPercentUnit && nameHint);
};

/**
 * Resolves an area name using defensive fallback order across HA registries.
 * @param {{ entity_id: string, attributes?: Record<string, unknown> }} entity State object.
 * @param {{ entities?: Record<string, any>, devices?: Record<string, any>, areas?: Record<string, any> } | undefined} hass Home Assistant runtime object.
 * @returns {string} Resolved area label, or Unknown when no mapping exists.
 */
export const resolveAreaName = (entity, hass) => {
  const attrs = entity.attributes || {};

  if (attrs.area_name || attrs.area) {
    return attrs.area_name || attrs.area;
  }

  const entityRegistry = hass?.entities?.[entity.entity_id];
  const areaRegistry = hass?.areas;
  const deviceRegistry = hass?.devices;

  if (entityRegistry?.area_id && areaRegistry?.[entityRegistry.area_id]?.name) {
    return areaRegistry[entityRegistry.area_id].name;
  }

  const deviceId = entityRegistry?.device_id;
  const deviceAreaId = deviceId ? deviceRegistry?.[deviceId]?.area_id : null;
  if (deviceAreaId && areaRegistry?.[deviceAreaId]?.name) {
    return areaRegistry[deviceAreaId].name;
  }

  return "Unknown";
};

/**
 * Normalizes raw Home Assistant state data into a render-safe battery row model.
 * @param {{ entity_id: string, state: string, attributes?: Record<string, unknown> }} entity State object.
 * @param {{ entities?: Record<string, any>, devices?: Record<string, any>, areas?: Record<string, any> } | undefined} hass Home Assistant runtime object.
 * @returns {{
 *   entityId: string,
 *   areaName: string,
 *   deviceName: string,
 *   entityName: string,
 *   isNumeric: boolean,
 *   percentage: number | null,
 *   levelState: "unknown"|"low"|"medium"|"high",
 *   stateLabel: string
 * }} Render model consumed by templates.
 */
export const normalizeBatteryRow = (entity, hass) => {
  const attrs = entity.attributes || {};
  const rawState = entity.state;
  const numeric = Number.parseFloat(rawState);
  const isNumeric = Number.isFinite(numeric);
  const roundedPercent = isNumeric ? Math.round(clampPercent(numeric)) : null;

  const fallbackFriendly = toDisplayLabel(toEntityName(entity.entity_id));
  const deviceName = attrs.device_name || attrs.friendly_name || fallbackFriendly;

  return {
    entityId: entity.entity_id,
    areaName: resolveAreaName(entity, hass),
    deviceName,
    entityName: toEntityName(entity.entity_id),
    isNumeric,
    percentage: roundedPercent,
    levelState: isNumeric ? levelFromPercent(roundedPercent) : "unknown",
    stateLabel: isNumeric
      ? `${roundedPercent}%`
      : rawState === "unavailable"
        ? "Unavailable"
        : rawState === "unknown"
          ? "Unknown"
          : "Invalid"
  };
};

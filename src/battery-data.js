export const toEntityName = (entityId) => {
  const [domain, objectId] = entityId.split(".");
  if (!domain || !objectId) {
    return entityId;
  }
  return objectId;
};

export const toDisplayLabel = (value) => {
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const clampPercent = (value) => {
  return Math.max(0, Math.min(100, value));
};

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

export const isBatteryEntity = (entity) => {
  const attrs = entity.attributes || {};
  const hasBatteryClass = attrs.device_class === "battery";
  const hasPercentUnit = attrs.unit_of_measurement === "%";
  const nameHint = entity.entity_id.toLowerCase().includes("battery");
  return hasBatteryClass || (hasPercentUnit && nameHint);
};

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

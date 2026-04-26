import Handlebars from "handlebars/dist/handlebars.runtime.js";
import styles from "./styles/main.scss?inline";
import renderCardTemplate from "./templates/card.hbs";
import batteryRowTemplate from "./templates/battery-row.hbs";
import batteryProgressTemplate from "./templates/battery-progress.hbs";
import "./battery-card-editor.js";

const DEFAULT_TITLE = "Batteries";
const DEFAULT_EMPTY_MESSAGE = "No battery entities found.";

Handlebars.registerPartial("battery-row", batteryRowTemplate);
Handlebars.registerPartial("battery-progress", batteryProgressTemplate);

const toEntityName = (entityId) => {
  const [domain, objectId] = entityId.split(".");
  if (!domain || !objectId) {
    return entityId;
  }
  return objectId;
};

const toDisplayLabel = (value) => {
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const parseEntityList = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const clampPercent = (value) => {
  return Math.max(0, Math.min(100, value));
};

const levelFromPercent = (percent) => {
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

const isBatteryEntity = (entity) => {
  const attrs = entity.attributes || {};
  const hasBatteryClass = attrs.device_class === "battery";
  const hasPercentUnit = attrs.unit_of_measurement === "%";
  const nameHint = entity.entity_id.toLowerCase().includes("battery");
  return hasBatteryClass || (hasPercentUnit && nameHint);
};

const normalizeBatteryRow = (entity) => {
  const attrs = entity.attributes || {};
  const rawState = entity.state;
  const numeric = Number.parseFloat(rawState);
  const isNumeric = Number.isFinite(numeric);
  const roundedPercent = isNumeric ? Math.round(clampPercent(numeric)) : null;

  const fallbackFriendly = toDisplayLabel(toEntityName(entity.entity_id));
  const deviceName = attrs.device_name || attrs.friendly_name || fallbackFriendly;

  return {
    entityId: entity.entity_id,
    areaName: attrs.area_name || attrs.area || "Unknown",
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



class BatteryVisualiserCard extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
    this.attachShadow({ mode: "open" });
  }

  static getConfigElement() {
    return document.createElement("battery-visualiser-card-editor");
  }

  static getStubConfig() {
    return {
      title: DEFAULT_TITLE
    };
  }

  setConfig(config) {
    if (!config || typeof config !== "object") {
      throw new Error("Invalid configuration");
    }

    this._config = {
      title: DEFAULT_TITLE,
      subtitle: "",
      include: [],
      exclude: [],
      ...config
    };

    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getCardSize() {
    return 4;
  }

  render() {
    if (!this.shadowRoot) {
      return;
    }

    const states = this._hass?.states ? Object.values(this._hass.states) : [];
    const include = new Set(parseEntityList(this._config.include));
    const exclude = new Set(parseEntityList(this._config.exclude));

    const rows = states
      .filter(isBatteryEntity)
      .filter((entity) => include.size === 0 || include.has(entity.entity_id))
      .filter((entity) => !exclude.has(entity.entity_id))
      .map(normalizeBatteryRow)
      .sort((a, b) => {
        return (
          a.areaName.localeCompare(b.areaName) ||
          a.deviceName.localeCompare(b.deviceName) ||
          a.entityName.localeCompare(b.entityName)
        );
      });

    const html = renderCardTemplate({
      title: this._config.title || DEFAULT_TITLE,
      subtitle: this._config.subtitle || "",
      hasBatteries: rows.length > 0,
      rows,
      emptyMessage: DEFAULT_EMPTY_MESSAGE
    });

    this.shadowRoot.innerHTML = `<style>${styles}</style>${html}`;
  }
}

customElements.define("battery-visualiser-card", BatteryVisualiserCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "battery-visualiser-card",
  name: "Battery Visualiser",
  description: "Displays discovered battery entities in a configurable table card."
});

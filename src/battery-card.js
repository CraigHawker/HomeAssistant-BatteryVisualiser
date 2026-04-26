import Handlebars from "handlebars/dist/handlebars.runtime.js";
import styles from "./styles/main.scss?inline";
import renderCardTemplate from "./templates/card.hbs";
import batteryRowTemplate from "./templates/battery-row.hbs";
import batteryProgressTemplate from "./templates/battery-progress.hbs";
import { isBatteryEntity, normalizeBatteryRow } from "./battery-data.js";
import "./battery-card-editor.js";

const DEFAULT_TITLE = "Batteries";
const DEFAULT_EMPTY_MESSAGE = "No battery entities found.";

Handlebars.registerPartial("battery-row", batteryRowTemplate);
Handlebars.registerPartial("battery-progress", batteryProgressTemplate);

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
      .map((entity) => normalizeBatteryRow(entity, this._hass))
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

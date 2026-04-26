import Handlebars from "handlebars/dist/handlebars.runtime.js";
import styles from "./styles/main.scss?inline";
import renderCardTemplate from "./templates/card.hbs";
import batteryRowTemplate from "./templates/battery-row.hbs";
import batteryProgressTemplate from "./templates/battery-progress.hbs";
import {
  isBatteryEntity,
  normalizeBatteryRow,
  type HomeAssistantLike
} from "./battery-data";
import "./battery-card-editor";

interface CardConfig {
  title: string;
  subtitle: string;
  include: string[] | string;
  exclude: string[] | string;
}

type CardConfigInput = Partial<CardConfig>;

interface CustomCardDefinition {
  type: string;
  name: string;
  description: string;
}

const DEFAULT_TITLE = "Batteries";
const DEFAULT_EMPTY_MESSAGE = "No battery entities found.";

Handlebars.registerPartial("battery-row", batteryRowTemplate);
Handlebars.registerPartial("battery-progress", batteryProgressTemplate);

/**
 * Parses include/exclude config values from array or comma-delimited string.
 * @param value User-provided entity list.
 * @returns Normalized entity ids.
 */
const parseEntityList = (value: string[] | string | undefined): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entityId) => entityId.length > 0);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
};

class BatteryVisualiserCard extends HTMLElement {
  private _config: CardConfig;
  private _hass: HomeAssistantLike | null;

  constructor() {
    super();
    this._config = {
      title: DEFAULT_TITLE,
      subtitle: "",
      include: [],
      exclude: []
    };
    this._hass = null;
    this.attachShadow({ mode: "open" });
  }

  static getConfigElement(): HTMLElement {
    return document.createElement("battery-visualiser-card-editor");
  }

  static getStubConfig(): CardConfigInput {
    return {
      title: DEFAULT_TITLE
    };
  }

  setConfig(config: CardConfigInput): void {
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

  set hass(hass: HomeAssistantLike | null) {
    this._hass = hass;
    this.render();
  }

  getCardSize(): number {
    return 4;
  }

  render(): void {
    // Keep rendering resilient even when Home Assistant data is partially available.
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
      .map((entity) => normalizeBatteryRow(entity, this._hass ?? undefined))
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

declare global {
  interface Window {
    customCards?: CustomCardDefinition[];
  }
}

if (!customElements.get("battery-visualiser-card")) {
  customElements.define("battery-visualiser-card", BatteryVisualiserCard);
}

// Register the card so it appears in Home Assistant's custom card picker.
window.customCards = window.customCards || [];
window.customCards.push({
  type: "battery-visualiser-card",
  name: "Battery Visualiser",
  description: "Displays discovered battery entities in a configurable table card."
});

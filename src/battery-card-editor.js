const parseListValue = (value) => {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

class BatteryVisualiserCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
  }

  setConfig(config) {
    this._config = {
      title: "",
      subtitle: "",
      include: [],
      exclude: [],
      ...config
    };
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    if (!this.isConnected) {
      return;
    }

    const includeValue = Array.isArray(this._config.include)
      ? this._config.include.join(", ")
      : "";
    const excludeValue = Array.isArray(this._config.exclude)
      ? this._config.exclude.join(", ")
      : "";

    this.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 8px 0;
        }

        .field {
          display: grid;
          gap: 4px;
          margin-bottom: 12px;
        }

        label {
          font-size: 0.85rem;
          font-weight: 600;
        }

        input {
          padding: 8px;
          font: inherit;
        }

        .help {
          margin: 0;
          font-size: 0.75rem;
          color: var(--secondary-text-color, #666);
        }
      </style>

      <div class="field">
        <label for="title">Card title</label>
        <input id="title" data-key="title" type="text" value="${this._config.title || ""}" />
      </div>

      <div class="field">
        <label for="subtitle">Subtitle</label>
        <input id="subtitle" data-key="subtitle" type="text" value="${this._config.subtitle || ""}" />
      </div>

      <div class="field">
        <label for="include">Include entities</label>
        <input id="include" data-key="include" type="text" value="${includeValue}" placeholder="sensor.phone_battery, sensor.tablet_battery" />
        <p class="help">Comma-separated entity IDs. Leave empty to include all battery entities.</p>
      </div>

      <div class="field">
        <label for="exclude">Exclude entities</label>
        <input id="exclude" data-key="exclude" type="text" value="${excludeValue}" placeholder="sensor.watch_battery" />
      </div>
    `;

    this.querySelectorAll("input[data-key]").forEach((input) => {
      input.addEventListener("input", this._handleInput);
    });
  }

  _handleInput = (event) => {
    const input = event.currentTarget;
    const key = input.dataset.key;
    const rawValue = input.value || "";

    const nextConfig = {
      ...this._config
    };

    if (key === "include" || key === "exclude") {
      nextConfig[key] = parseListValue(rawValue);
    } else {
      nextConfig[key] = rawValue;
    }

    this._config = nextConfig;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: nextConfig },
        bubbles: true,
        composed: true
      })
    );
  };
}

customElements.define("battery-visualiser-card-editor", BatteryVisualiserCardEditor);

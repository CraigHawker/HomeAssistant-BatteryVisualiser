interface EditorConfig {
  title: string;
  subtitle: string;
  include: string[];
  exclude: string[];
}

type EditorConfigInput = Partial<EditorConfig>;

type EditorConfigKey = keyof EditorConfig;

const parseListValue = (value: string): string[] => {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const isEditorConfigKey = (value: string): value is EditorConfigKey => {
  return ["title", "subtitle", "include", "exclude"].includes(value);
};

class BatteryVisualiserCardEditor extends HTMLElement {
  private _config: EditorConfig;

  constructor() {
    super();
    this._config = {
      title: "",
      subtitle: "",
      include: [],
      exclude: []
    };
  }

  setConfig(config: EditorConfigInput): void {
    this._config = {
      title: "",
      subtitle: "",
      include: [],
      exclude: [],
      ...config
    };
    this.render();
  }

  connectedCallback(): void {
    this.render();
  }

  render(): void {
    if (!this.isConnected) {
      return;
    }

    const includeValue = this._config.include.join(", ");
    const excludeValue = this._config.exclude.join(", ");

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

  private _handleInput = (event: Event): void => {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const key = input.dataset.key;
    if (!key || !isEditorConfigKey(key)) {
      return;
    }

    const rawValue = input.value || "";

    const nextConfig: EditorConfig = {
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

if (!customElements.get("battery-visualiser-card-editor")) {
  customElements.define("battery-visualiser-card-editor", BatteryVisualiserCardEditor);
}

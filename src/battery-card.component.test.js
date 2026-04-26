/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it } from "vitest";
import "./battery-card.js";

const buildEntity = (entityId, state = "50", attributes = {}) => ({
  entity_id: entityId,
  state,
  attributes: {
    device_class: "battery",
    unit_of_measurement: "%",
    ...attributes
  }
});

const mountCard = ({ config = {}, hass = {} } = {}) => {
  const card = document.createElement("battery-visualiser-card");
  document.body.appendChild(card);
  card.setConfig({ title: "Batteries", ...config });
  card.hass = hass;
  return card;
};

describe("battery-visualiser-card component", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders rows with area resolution from mixed registry sources", () => {
    const hass = {
      states: {
        "sensor.attr_area_battery": buildEntity("sensor.attr_area_battery", "80", {
          friendly_name: "Attribute Sensor",
          area_name: "Kitchen"
        }),
        "sensor.entity_area_battery": buildEntity("sensor.entity_area_battery", "70", {
          friendly_name: "Entity Registry Sensor"
        }),
        "sensor.device_area_battery": buildEntity("sensor.device_area_battery", "60", {
          friendly_name: "Device Registry Sensor"
        }),
        "sensor.unknown_area_battery": buildEntity("sensor.unknown_area_battery", "50", {
          friendly_name: "Unknown Area Sensor"
        })
      },
      entities: {
        "sensor.entity_area_battery": {
          area_id: "area_office"
        },
        "sensor.device_area_battery": {
          device_id: "device_bathroom"
        }
      },
      devices: {
        device_bathroom: {
          area_id: "area_bathroom"
        }
      },
      areas: {
        area_office: {
          name: "Office"
        },
        area_bathroom: {
          name: "Bathroom"
        }
      }
    };

    const card = mountCard({ hass });
    const rows = Array.from(card.shadowRoot.querySelectorAll("tbody tr"));
    expect(rows.length).toBe(4);

    const areaByEntity = new Map(
      rows.map((row) => [
        row.getAttribute("data-entity-id"),
        row.querySelector('td[data-col="area"]')?.textContent?.trim()
      ])
    );

    expect(areaByEntity.get("sensor.attr_area_battery")).toBe("Kitchen");
    expect(areaByEntity.get("sensor.entity_area_battery")).toBe("Office");
    expect(areaByEntity.get("sensor.device_area_battery")).toBe("Bathroom");
    expect(areaByEntity.get("sensor.unknown_area_battery")).toBe("Unknown");
  });

  it("renders state labels for unavailable and unknown values", () => {
    const hass = {
      states: {
        "sensor.unavailable_battery": buildEntity("sensor.unavailable_battery", "unavailable", {
          friendly_name: "Unavailable Sensor"
        }),
        "sensor.unknown_battery": buildEntity("sensor.unknown_battery", "unknown", {
          friendly_name: "Unknown Sensor"
        })
      }
    };

    const card = mountCard({ hass });
    const values = Array.from(card.shadowRoot.querySelectorAll("tbody td[data-col='percent'] .value")).map(
      (node) => node.textContent?.trim()
    );

    expect(values).toContain("Unavailable");
    expect(values).toContain("Unknown");
  });

  it("renders configured title and subtitle", () => {
    const hass = {
      states: {
        "sensor.phone_battery": buildEntity("sensor.phone_battery", "92", {
          friendly_name: "Phone"
        })
      }
    };

    const card = mountCard({
      config: {
        title: "Battery Status",
        subtitle: "All tracked devices"
      },
      hass
    });

    expect(card.shadowRoot.querySelector("h2")?.textContent?.trim()).toBe("Battery Status");
    expect(card.shadowRoot.querySelector("header p")?.textContent?.trim()).toBe("All tracked devices");
  });

  it("shows empty message when no battery entities are present", () => {
    const hass = {
      states: {
        "sensor.kitchen_temperature": {
          entity_id: "sensor.kitchen_temperature",
          state: "21",
          attributes: {
            unit_of_measurement: "C",
            friendly_name: "Kitchen Temperature"
          }
        }
      }
    };

    const card = mountCard({ hass });

    const emptyNode = card.shadowRoot.querySelector(".battery-empty");
    expect(emptyNode).toBeTruthy();
    expect(emptyNode?.textContent?.trim()).toBe("No battery entities found.");
  });
});

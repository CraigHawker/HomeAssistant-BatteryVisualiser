import { describe, expect, it } from "vitest";
import { isBatteryEntity, normalizeBatteryRow } from "./battery-data.js";

const batteryEntity = (entityId, state = "50", attributes = {}) => ({
  entity_id: entityId,
  state,
  attributes: {
    device_class: "battery",
    unit_of_measurement: "%",
    ...attributes
  }
});

describe("isBatteryEntity", () => {
  it("detects battery device class", () => {
    expect(isBatteryEntity(batteryEntity("sensor.phone_level"))).toBe(true);
  });

  it("detects percent battery by name hint", () => {
    expect(
      isBatteryEntity({
        entity_id: "sensor.kitchen_battery_level",
        state: "70",
        attributes: { unit_of_measurement: "%" }
      })
    ).toBe(true);
  });

  it("rejects unrelated percent sensors", () => {
    expect(
      isBatteryEntity({
        entity_id: "sensor.humidity",
        state: "70",
        attributes: { unit_of_measurement: "%" }
      })
    ).toBe(false);
  });
});

describe("normalizeBatteryRow area resolution", () => {
  const hassFixture = {
    entities: {
      "sensor.entity_area_battery": { area_id: "area_office" },
      "sensor.device_area_battery": { device_id: "device_bathroom" }
    },
    devices: {
      device_bathroom: { area_id: "area_bathroom" }
    },
    areas: {
      area_office: { name: "Office" },
      area_bathroom: { name: "Bathroom" }
    }
  };

  it("uses area attribute first", () => {
    const row = normalizeBatteryRow(
      batteryEntity("sensor.attr_area_battery", "88", { area_name: "Kitchen" }),
      hassFixture
    );
    expect(row.areaName).toBe("Kitchen");
  });

  it("falls back to entity registry area", () => {
    const row = normalizeBatteryRow(
      batteryEntity("sensor.entity_area_battery", "71"),
      hassFixture
    );
    expect(row.areaName).toBe("Office");
  });

  it("falls back to device registry area", () => {
    const row = normalizeBatteryRow(
      batteryEntity("sensor.device_area_battery", "64"),
      hassFixture
    );
    expect(row.areaName).toBe("Bathroom");
  });

  it("returns Unknown when mapping is missing", () => {
    const row = normalizeBatteryRow(
      batteryEntity("sensor.unmapped_battery", "44"),
      hassFixture
    );
    expect(row.areaName).toBe("Unknown");
  });

  it("returns Unknown when registries are missing", () => {
    const row = normalizeBatteryRow(
      batteryEntity("sensor.no_registry_battery", "44"),
      undefined
    );
    expect(row.areaName).toBe("Unknown");
  });
});

describe("normalizeBatteryRow state handling", () => {
  it("clamps and rounds numeric percentage", () => {
    const row = normalizeBatteryRow(batteryEntity("sensor.clamp_battery", "103.7"));
    expect(row.percentage).toBe(100);
    expect(row.stateLabel).toBe("100%");
    expect(row.levelState).toBe("high");
  });

  it("maps unavailable and unknown states distinctly", () => {
    const unavailable = normalizeBatteryRow(
      batteryEntity("sensor.unavailable_battery", "unavailable")
    );
    const unknown = normalizeBatteryRow(batteryEntity("sensor.unknown_battery", "unknown"));

    expect(unavailable.stateLabel).toBe("Unavailable");
    expect(unknown.stateLabel).toBe("Unknown");
  });

  it("labels unexpected non-numeric states as Invalid", () => {
    const row = normalizeBatteryRow(batteryEntity("sensor.weird_battery", "n/a"));
    expect(row.stateLabel).toBe("Invalid");
    expect(row.levelState).toBe("unknown");
  });
});

describe("sorting behavior", () => {
  it("supports deterministic sorting across mixed area sources", () => {
    const hassFixture = {
      entities: {
        "sensor.alpha_battery": { area_id: "area_b" },
        "sensor.beta_battery": { area_id: "area_a" }
      },
      areas: {
        area_a: { name: "Area A" },
        area_b: { name: "Area B" }
      }
    };

    const rows = [
      normalizeBatteryRow(batteryEntity("sensor.alpha_battery", "30", { friendly_name: "Alpha" }), hassFixture),
      normalizeBatteryRow(batteryEntity("sensor.gamma_battery", "30", { area_name: "Area A", friendly_name: "Gamma" }), hassFixture),
      normalizeBatteryRow(batteryEntity("sensor.beta_battery", "30", { friendly_name: "Beta" }), hassFixture)
    ].sort((a, b) => {
      return (
        a.areaName.localeCompare(b.areaName) ||
        a.deviceName.localeCompare(b.deviceName) ||
        a.entityName.localeCompare(b.entityName)
      );
    });

    expect(rows.map((row) => row.entityId)).toEqual([
      "sensor.beta_battery",
      "sensor.gamma_battery",
      "sensor.alpha_battery"
    ]);
  });
});

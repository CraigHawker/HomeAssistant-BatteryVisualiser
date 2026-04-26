import { resolve } from "node:path";
import { defineConfig } from "vite";
import Handlebars from "handlebars";

function handlebarsPlugin() {
  return {
    name: "vite-plugin-handlebars-precompile",
    resolveId(id) {
      if (id.endsWith(".hbs")) {
        return id;
      }
    },
    async load(id) {
      if (!id.endsWith(".hbs")) {
        return null;
      }

      const fs = await import("node:fs");
      const path = await import("node:path");
      const filepath = id.split("?")[0];
      const source = fs.readFileSync(filepath, "utf-8");
      const compiled = Handlebars.precompile(source, {
        strict: false,
        noEscape: false
      });

      const templateName = path
        .basename(filepath, ".hbs")
        .replace(/-/g, "_");

      return `
        import Handlebars from "handlebars/dist/handlebars.runtime.js";
        const template = Handlebars.template(${compiled});
        export default template;
        export const ${templateName} = template;
      `;
    }
  };
}

export default defineConfig({
  plugins: [handlebarsPlugin()],
  root: process.env.NODE_ENV === "development" ? "dev" : ".",
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{js,ts}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/battery-card.ts", "src/battery-data.ts"],
      thresholds: {
        lines: 85,
        functions: 80,
        statements: 85,
        branches: 75
      }
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    codeSplitting: false,
    lib: {
      entry: resolve(__dirname, "src/battery-card.ts"),
      formats: ["es"],
      fileName: () => "battery-card.js"
    },
    rollupOptions: {
      output: {
        generatedCode: {
          preset: "es2015"
        }
      }
    }
  }
});

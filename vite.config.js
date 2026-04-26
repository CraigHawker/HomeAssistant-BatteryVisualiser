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
  build: {
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, "src/battery-card.js"),
      formats: ["es"],
      fileName: () => "battery-card.js"
    },
    rollupOptions: {
      output: {
        generatedCode: {
          preset: "es2015"
        },
        inlineDynamicImports: true
      }
    }
  }
});

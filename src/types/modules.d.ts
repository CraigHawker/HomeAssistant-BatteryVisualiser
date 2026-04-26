declare module "handlebars/dist/handlebars.runtime.js" {
  import Handlebars from "handlebars";
  export default Handlebars;
}

declare module "*.hbs" {
  import type { TemplateDelegate } from "handlebars";

  const template: TemplateDelegate;
  export default template;
}

declare module "*.scss?inline" {
  const styles: string;
  export default styles;
}

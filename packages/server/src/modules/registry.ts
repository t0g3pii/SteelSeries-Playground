import type { DisplayModule, DisplayModuleInfo } from "./types.js";
import { IpModule } from "./ip-module.js";
import { MediaModule } from "./media-module.js";
import { TemplateModule } from "./template-module.js";

export class ModuleRegistry {
  private readonly modules = new Map<string, DisplayModule>();

  constructor() {
    this.register(new IpModule());
    this.register(new MediaModule());
    this.register(new TemplateModule());
  }

  register(module: DisplayModule): void {
    this.modules.set(module.id, module);
  }

  get(id: string): DisplayModule | undefined {
    return this.modules.get(id);
  }

  getDefault(): DisplayModule {
    const ip = this.modules.get("ip");
    if (!ip) {
      throw new Error("Kein Standard-Modul registriert");
    }
    return ip;
  }

  list(): DisplayModuleInfo[] {
    return [...this.modules.values()].map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      supportsRotation: m.supportsRotation,
      rotationEvents: m.rotationEvents,
    }));
  }
}

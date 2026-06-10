import type { DisplayModule } from "./types.js";
import { IpModule } from "./ip-module.js";

export class ModuleRegistry {
  private readonly modules = new Map<string, DisplayModule>();

  constructor() {
    this.register(new IpModule());
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

  list(): Array<{ id: string; name: string }> {
    return [...this.modules.values()].map((m) => ({
      id: m.id,
      name: m.name,
    }));
  }
}

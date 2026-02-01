export class App {}

export class Plugin {
  app: App;
  manifest: any;

  constructor(app: App, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }

  addCommand(): void {}
  addSettingTab(): void {}
  async loadData(): Promise<Record<string, unknown>> {
    return {};
  }
  async saveData(): Promise<void> {}
}

export class Modal {
  app: App;
  contentEl: HTMLElement;

  constructor(app: App) {
    this.app = app;
    this.contentEl = document.createElement("div");
  }

  open(): void {}
  close(): void {}
  onOpen(): void {}
  onClose(): void {}
}

export class Notice {
  constructor(_message: string) {}
}

export class PluginSettingTab {
  app: App;
  plugin: any;
  containerEl: HTMLElement;

  constructor(app: App, plugin: any) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement("div");
  }

  display(): void {}
}

export class Setting {
  constructor(_containerEl: HTMLElement) {}

  setName(_name: string): this {
    return this;
  }

  setDesc(_desc: string): this {
    return this;
  }

  addText(cb: (text: { setValue: (v: string) => { onChange: (fn: (v: string) => void) => void }; onChange: (fn: (v: string) => void) => void }) => void): this {
    cb({
      setValue: () => ({
        onChange: (_fn: (v: string) => void): void => undefined
      }),
      onChange: (_fn: (v: string) => void): void => undefined
    });
    return this;
  }

  addSlider(cb: (slider: { setLimits: (min: number, max: number, step: number) => { setValue: (v: number) => { setDynamicTooltip: () => { onChange: (fn: (v: number) => void) => void } } }; setValue: (v: number) => { setDynamicTooltip: () => { onChange: (fn: (v: number) => void) => void } }; setDynamicTooltip: () => { onChange: (fn: (v: number) => void) => void }; onChange: (fn: (v: number) => void) => void }) => void): this {
    cb({
      setLimits: () => ({
        setValue: () => ({
          setDynamicTooltip: () => ({
            onChange: (_fn: (v: number) => void): void => undefined
          })
        })
      }),
      setValue: () => ({
        setDynamicTooltip: () => ({
          onChange: (_fn: (v: number) => void): void => undefined
        })
      }),
      setDynamicTooltip: () => ({
        onChange: (_fn: (v: number) => void): void => undefined
      }),
      onChange: (_fn: (v: number) => void): void => undefined
    });
    return this;
  }

  addToggle(cb: (toggle: { setValue: (v: boolean) => { onChange: (fn: (v: boolean) => void) => void }; onChange: (fn: (v: boolean) => void) => void }) => void): this {
    cb({
      setValue: () => ({
        onChange: (_fn: (v: boolean) => void): void => undefined
      }),
      onChange: (_fn: (v: boolean) => void): void => undefined
    });
    return this;
  }
}

export class Vault {
  adapter: { exists: (path: string) => Promise<boolean> } = {
    exists: async () => true
  };

  async createFolder(_path: string): Promise<void> {}
  async create(_path: string, _content: string): Promise<Record<string, unknown>> {
    return {};
  }
  async read(_file: any): Promise<string> {
    return "";
  }
  async modify(_file: any, _content: string): Promise<void> {}
  getAbstractFileByPath(_path: string): any | null {
    return null;
  }
  getMarkdownFiles(): any[] {
    return [];
  }
}

export class TFile {
  path: string;
  basename: string;

  constructor(path: string) {
    this.path = path;
    this.basename = path.split("/").pop() ?? path;
  }
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

export async function requestUrl(_opts: { url: string }) {
  return { text: "" };
}

/// <reference lib="deno.ns" />

declare global {
  const Deno: {
    readonly env: {
      get(key: string): string | undefined;
      set(key: string, value: string): void;
      has(key: string): boolean;
      delete(key: string): void;
      toObject(): Record<string, string>;
    };
  };
}

export {};

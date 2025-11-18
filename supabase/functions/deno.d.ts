/// <reference lib="deno.ns" />

// Deno global namespace declarations for TypeScript
declare const Deno: {
  readonly env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    has(key: string): boolean;
    delete(key: string): void;
    toObject(): Record<string, string>;
  };
  readonly version: {
    deno: string;
    v8: string;
    typescript: string;
  };
  readonly build: {
    target: string;
    arch: string;
    os: string;
    vendor: string;
  };
  readonly args: string[];
  readonly pid: number;
  readonly ppid: number;
  readonly cwd: () => string;
  readonly chdir: (directory: string) => void;
  readonly exit: (code?: number) => never;
  readonly isatty: (rid: number) => boolean;
  readonly mainModule: string;
  readonly noColor: boolean;
  readonly stdin: {
    readonly rid: number;
    readonly readable: ReadableStream<Uint8Array>;
    readonly writable: WritableStream<Uint8Array>;
  };
  readonly stdout: {
    readonly rid: number;
    readonly writable: WritableStream<Uint8Array>;
  };
  readonly stderr: {
    readonly rid: number;
    readonly writable: WritableStream<Uint8Array>;
  };
};


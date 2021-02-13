import { Dispatcher, Session } from "./deps.ts";
import {
  isDedicatedWorkerGlobalScope,
  WorkerReader,
  WorkerWriter,
} from "./worker.ts";

/**
 * A denops host (Vim/Neovim) interface.
 */
export class Denops {
  #session: Session;

  constructor(
    dispatcher: Dispatcher,
    reader?: Deno.Reader & Deno.Closer,
    writer?: Deno.Writer,
  ) {
    if (!reader) {
      if (!isDedicatedWorkerGlobalScope(self)) {
        throw new Error(
          "'reader' cannot be omitted when Denops is constructed on non Worker thread.",
        );
      }
      reader = new WorkerReader(self);
    }
    if (!writer) {
      if (!isDedicatedWorkerGlobalScope(self)) {
        throw new Error(
          "'writer' cannot be omitted when Denops is constructed on non Worker thread.",
        );
      }
      writer = new WorkerWriter(self);
    }
    this.#session = new Session(reader, writer, dispatcher);
  }

  /**
   * Plugin name
   */
  get name(): string {
    // deno-lint-ignore no-explicit-any
    return (self as any).name ?? "unknown";
  }

  /**
   * Execute a command (expr) on the host.
   */
  async command(expr: string): Promise<void> {
    await this.#session.notify("command", expr);
  }

  /**
   * Evaluate an expression (expr) on the host and return the result.
   */
  async eval(expr: string): Promise<unknown> {
    return await this.#session.call("eval", expr);
  }

  /**
   * Call a function on the host and return the result.
   */
  async call(method: string, params: unknown[]): Promise<unknown> {
    return await this.#session.call("call", method, params);
  }

  /**
   * Echo text on the host.
   */
  async echo(text: string): Promise<void> {
    await this.#session.call("echo", [text]);
  }

  /**
   * Echo text on the host.
   */
  async echomsg(text: string): Promise<void> {
    await this.#session.call("echomsg", [text]);
  }

  /**
   * Start main event-loop of the plugin
   */
  start(main: () => Promise<void>): void {
    const waiter = Promise.all([this.#session.listen(), main()]);
    waiter.catch((e) => {
      console.warn("Unexpected error:", e);
    });
  }
}

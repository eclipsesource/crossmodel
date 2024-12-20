/******************************************************************************
 * Copyright (C) 2018 TypeFox and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
 ******************************************************************************/
//
// Based on
// - https://github.com/eclipse-theia/theia/blob/master/packages/core/src/common/messaging/proxy-factory.ts
// - https://github.com/eclipse-theia/theia/blob/master/packages/core/src/common/application-error.ts
//

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { CancellationToken, Event, MessageConnection } from 'vscode-jsonrpc';
import { Emitter, ResponseError } from 'vscode-jsonrpc';

export interface ApplicationError<C extends number, D> extends Error {
  readonly code: C;
  readonly data: D;
  toJson(): ApplicationError.Literal<D>;
}
export namespace ApplicationError {
  export interface Literal<D> {
    message: string;
    data: D;
    stack?: string;
  }

  export interface Constructor<C extends number, D> {
    (...args: any[]): ApplicationError<C, D>;
    code: C;
    is(arg: object | undefined): arg is ApplicationError<C, D>;
  }

  const codes = new Set<number>();
  export function declare<C extends number, D>(code: C, factory: (...args: any[]) => Literal<D>): Constructor<C, D> {
    if (codes.has(code)) {
      throw new Error(`An application error for '${code}' code is already declared`);
    }
    codes.add(code);
    const constructorOpt = Object.assign((...args: any[]) => new Impl(code, factory(...args), constructorOpt), {
      code,
      is(arg: object | undefined): arg is ApplicationError<C, D> {
        return arg instanceof Impl && arg.code === code;
      }
    });
    return constructorOpt;
  }

  export function is<C extends number, D>(arg: object | undefined): arg is ApplicationError<C, D> {
    return arg instanceof Impl;
  }

  export function fromJson<C extends number, D>(code: C, raw: Literal<D>): ApplicationError<C, D> {
    return new Impl(code, raw);
  }

  class Impl<C extends number, D> extends Error implements ApplicationError<C, D> {
    readonly data: D;

    // eslint-disable-next-line @typescript-eslint/ban-types
    constructor(readonly code: C, raw: ApplicationError.Literal<D>, constructorOpt?: Function) {
      super(raw.message);
      this.data = raw.data;
      Object.setPrototypeOf(this, Impl.prototype);
      if (raw.stack) {
        this.stack = raw.stack;
      } else if (Error.captureStackTrace && constructorOpt) {
        Error.captureStackTrace(this, constructorOpt);
      }
    }

    toJson(): ApplicationError.Literal<D> {
      const { message, data, stack } = this;
      return { message, data, stack };
    }
  }
}

export interface JsonRpcConnectionEventEmitter {
  readonly onDidOpenConnection: Event<void>;
  readonly onDidCloseConnection: Event<void>;
}
export type JsonRpcProxy<T> = T & JsonRpcConnectionEventEmitter;

export class ConnectionForwarder {
  protected readonly onDidOpenConnectionEmitter = new Emitter<void>();
  protected readonly onDidCloseConnectionEmitter = new Emitter<void>();

  protected connectionPromiseResolve: (connection: MessageConnection) => void;
  protected connectionPromise: Promise<MessageConnection>;

  /**
   * Build a new JsonRpcProxyFactory.
   *
   * @param target - The object to expose to JSON-RPC methods calls.  If this
   *   is omitted, the proxy won't be able to handle requests, only send them.
   */
  constructor(public target?: any) {
    this.waitForConnection();
  }

  protected waitForConnection(): void {
    this.connectionPromise = new Promise(resolve => (this.connectionPromiseResolve = resolve));
    this.connectionPromise.then(connection => {
      connection.onClose(() => this.onDidCloseConnectionEmitter.fire(undefined));
      this.onDidOpenConnectionEmitter.fire(undefined);
    });
  }

  listen(connection: MessageConnection): void {
    connection.onRequest((prop: string, args: object | any[] | undefined, _token: CancellationToken) => this.onRequest(prop, args));
    connection.onNotification((prop: string, ...args: any[]) => this.onNotification(prop, ...args));
    connection.onDispose(() => this.waitForConnection());
    connection.listen();
    this.connectionPromiseResolve(connection);
  }

  protected onNotification(method: string, ...args: any[]): void {
    if (this.target) {
      this.target[method](...args);
    }
  }

  protected async onRequest(method: string, args: object | any[] | undefined): Promise<any> {
    const fixedArgs = Array.isArray(args) ? args : args === undefined ? undefined : [args];
    try {
      if (this.target) {
        if (fixedArgs) {
          return await this.target[method](...fixedArgs);
        }
        return await this.target[method]();
      } else {
        throw new Error(`no target was set to handle ${method}`);
      }
    } catch (error) {
      const e = this.serializeError(error);
      if (e instanceof ResponseError) {
        throw e;
      }
      const reason = e.message || '';
      const stack = e.stack || '';
      console.error(`Request ${method} failed with error: ${reason}`, stack);
      throw e;
    }
  }

  protected serializeError(e: any): any {
    if (ApplicationError.is(e)) {
      return new ResponseError(e.code, '', { kind: 'application', ...e.toJson() });
    }
    return e;
  }
}

export class JsonRpcProxyFactory<T extends object> extends ConnectionForwarder implements ProxyHandler<T> {
  createProxy(): JsonRpcProxy<T> {
    const result = new Proxy<T>(this as any, this);
    return result as any;
  }

  get(_target: T, p: PropertyKey, _receiver: any): any {
    if (p === 'setClient') {
      return (client: any) => {
        this.target = client;
      };
    }
    if (p === 'getClient') {
      return () => this.target;
    }
    if (p === 'onDidOpenConnection') {
      return this.onDidOpenConnectionEmitter.event;
    }
    if (p === 'onDidCloseConnection') {
      return this.onDidCloseConnectionEmitter.event;
    }
    const isNotify = this.isNotification(p);
    return (...args: any[]) => {
      const method = p.toString();
      const capturedError = new Error(`Request '${method}' failed`);
      return this.connectionPromise.then(
        connection =>
          new Promise<void>((resolve, reject) => {
            try {
              if (isNotify) {
                connection.sendNotification(method, ...args);
                resolve(undefined);
              } else {
                const resultPromise = connection.sendRequest(method, ...args) as Promise<any>;
                resultPromise.catch((err: any) => reject(this.deserializeError(capturedError, err))).then((result: any) => resolve(result));
              }
            } catch (err) {
              reject(err);
            }
          })
      );
    };
  }

  protected isNotification(p: PropertyKey): boolean {
    return p.toString().startsWith('notify') || p.toString().startsWith('on');
  }

  protected deserializeError(capturedError: Error, e: any): any {
    if (e instanceof ResponseError) {
      const capturedStack = capturedError.stack || '';
      if (e.data && e.data.kind === 'application') {
        const { stack, data, message } = e.data;
        return ApplicationError.fromJson(e.code, {
          message: message || capturedError.message,
          data,
          stack: `${capturedStack}\nCaused by: ${stack}`
        });
      }
      e.stack = capturedStack;
    }
    return e;
  }
}

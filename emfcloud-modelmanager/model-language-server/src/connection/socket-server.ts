/********************************************************************************
 * Copyright (c) 2023 EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0, or the MIT License which is
 * available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: EPL-2.0 OR MIT
 ********************************************************************************/
import * as net from 'net';
import { Disposable } from 'vscode-jsonrpc';
import * as rpc from 'vscode-jsonrpc/lib/node/main.js';

export interface SocketServerOptions extends net.ListenOptions {
  name: string;
}

export abstract class SocketServer implements Disposable {
  protected clientConnections: rpc.MessageConnection[] = [];
  protected serverDisposable?: Disposable;
  protected port?: number;

  constructor(protected options: SocketServerOptions) {
    this.port = options.port;
  }

  async start(): Promise<void> {
    return this.createServer();
  }

  protected createServer(): Promise<void> {
    const netServer = net.createServer(socket => this.createClientConnection(socket));
    this.serverDisposable = Disposable.create(() => this.close(netServer));
    netServer.listen(this.options);
    netServer.on('listening', () => {
      const addressInfo = netServer.address();
      if (!addressInfo) {
        console.error(`Could not resolve ${this.options.name} address info. Shutting down.`);
        this.close(netServer);
        return;
      } else if (typeof addressInfo === 'string') {
        console.error(`${this.options.name} is unexpectedly listening to pipe or domain socket "${addressInfo}". Shutting down.`);
        this.close(netServer);
        return;
      }
      this.port = addressInfo.port;
      console.log(`${this.options.name} is ready to accept new client requests on port: ${this.port}`);
    });
    netServer.on('error', err => {
      console.error(`${this.options.name} experienced error`, err);
      this.close(netServer);
    });
    return new Promise((resolve, reject) => {
      netServer.on('close', () => resolve(undefined));
      netServer.on('error', error => reject(error));
    });
  }

  protected createConnection(socket: net.Socket): rpc.MessageConnection {
    return rpc.createMessageConnection(new rpc.SocketMessageReader(socket), new rpc.SocketMessageWriter(socket), console);
  }

  protected async createClientConnection(socket: net.Socket): Promise<void> {
    console.info(`Connecting ${this.options.name} to client: '${socket.localAddress}'`);

    const connection = this.createConnection(socket);
    this.clientConnections.push(connection);

    const clientServer = await this.connectClientServer(connection);
    connection.onDispose(() => clientServer.dispose());
    socket.on('close', () => clientServer.dispose());

    return new Promise((resolve, rejects) => {
      connection.onClose(() => resolve(undefined));
      connection.onError(error => rejects(error));
    });
  }

  protected abstract connectClientServer(connection: rpc.MessageConnection): Promise<Disposable>;

  protected close(netServer: net.Server): void {
    netServer.close();
  }

  dispose(): void {
    this.serverDisposable?.dispose();
    this.clientConnections.forEach(connection => connection.dispose());
  }
}

/********************************************************************************
 * Copyright (c) 2023 logi.cals GmbH.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0, or the MIT License which is
 * available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: EPL-2.0 OR MIT
 ********************************************************************************/
import { Channel, Disposable, DisposableCollection, ILogger } from '@theia/core';
import { RpcMessage, RpcMessageType } from '@theia/core/lib/common/message-rpc/rpc-message-encoder';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { MessagingService } from '@theia/core/lib/node/messaging/messaging-service';
import { inject, injectable, interfaces } from '@theia/core/shared/inversify';
import * as net from 'net';
import * as rpc from 'vscode-jsonrpc/node';
import { SocketConnection, forwardToChannel, forwardToSocket, getId, listen, sendErrorResponse, sendMessageToSocket } from './rpc-util';
import { unbindConnectionHandler } from './unbind-helper';

export function bindChannelToSocketForwarder(bind: interfaces.Bind, options: ChannelToSocketForwarderOptions): void {
  bind(MessagingService.Contribution).toDynamicValue(ctx => createChannelToSocketForwarder(ctx.container, options));
}

export function createChannelToSocketForwarder(
  parent: interfaces.Container,
  options: ChannelToSocketForwarderOptions
): ChannelToSocketForwarder {
  unbindConnectionHandler(parent, options.path);

  const child = parent.createChild();
  child.bind(ChannelToSocketForwarderOptions).toConstantValue(options);
  if (!parent.isBound(ChannelToSocketForwarder)) {
    child.bind(ChannelToSocketForwarder).toSelf().inSingletonScope();
  }
  return child.get(ChannelToSocketForwarder);
}

export const ChannelToSocketForwarderOptions = Symbol('ChannelToSocketForwarderOptions');
export interface ChannelToSocketForwarderOptions {
  path: string;
  socketOptions: net.SocketConnectOpts;
  name: string;
  errorResponseOnClosedSocket?: boolean;
}

@injectable()
export class ChannelToSocketForwarder implements MessagingService.Contribution {
  @inject(ILogger) protected readonly logger: ILogger;
  @inject(ChannelToSocketForwarderOptions) protected readonly options: ChannelToSocketForwarderOptions;

  async configure(service: MessagingService): Promise<void> {
    try {
      this.connectToChannel(service);
    } catch (error) {
      this.logger.error(`Error while connecting backend to ${this.options.name} for ${this.options.path}.`, error);
    }
  }

  protected connectToChannel(service: MessagingService): void {
    try {
      service.registerChannelHandler(this.options.path, async (_, channel) => {
        try {
          this.logger.info(`Forwarding ${this.options.path} to  ${this.options.name}.`);
          const socketConnected = new Deferred<net.Socket>();
          const socket = this.createSocket(socketConnected);
          this.forwardConnection(socket, channel, socketConnected);
          socket.connect(this.options.socketOptions);
        } catch (error) {
          this.handleStartError(error, channel);
          this.logger.error(`Error while forwarding backend to ${this.options.name}.`, error);
        }
      });
    } catch (error) {
      this.logger.error(`Error while connecting backend to ${this.options.name} for ${this.options.path}.`, error);
    }
  }

  createSocket(socketConnected: Deferred<net.Socket>): net.Socket {
    const socket = new net.Socket();

    let connected = false;
    let reconnectInterval: any;

    const tryToReconnect = (): void => {
      clearInterval(reconnectInterval);
      reconnectInterval = setInterval(() => {
        if (connected) {
          clearInterval(reconnectInterval);
        } else if (!socket.connecting) {
          this.logger.info(`Connecting to ${this.options.name}`, this.options.socketOptions);
          socket.connect(this.options.socketOptions);
        }
      }, 1000);
    };

    socket.addListener('close', () => {
      this.handleSocketClosed();
      tryToReconnect();
    });

    socket.addListener('end', () => {
      connected = false;
      this.logger.info(`Connection closed for ${this.options.name}`);
    });

    socket.addListener('error', error => {
      connected = false;
      this.logger.info(`Connection Error for ${this.options.name}`, error);
    });

    socket.addListener('connect', () => {
      connected = true;
      this.logger.info(`Connected to ${this.options.name}`, this.options.socketOptions);
      socketConnected.resolve(socket);
    });
    return socket;
  }

  protected forwardConnection(socket: net.Socket, channel: Channel, socketConnected: Deferred<net.Socket>): Disposable {
    const socketConn = this.createSocketConnection(socket);
    const forwarding = this.forward(channel, socketConn, socketConnected);
    return new DisposableCollection(socketConn, forwarding);
  }

  protected createSocketConnection(socket: net.Socket): SocketConnection {
    return new SocketConnection(socket);
  }

  protected forward(channel: Channel, socketConn: SocketConnection, socketConnected: Deferred<net.Socket>): Disposable {
    const disposable = new DisposableCollection();

    let pendingMessages: RpcMessage[] = [];
    if (!this.options.errorResponseOnClosedSocket) {
      this.logger.info(`Collect pending messages for ${this.options.name}`);
      socketConnected.promise.then(() => {
        this.logger.info(`Sending pending ${pendingMessages.length} messages to ${this.options.name}`);
        pendingMessages.forEach(message => sendMessageToSocket(socketConn, message));
        pendingMessages = [];
      });
    }

    // do not use 'forward' from 'vscode-ws-jsonrpc/lib/server' as this also closes the connection when the socketConnection is closed
    disposable.push(
      forwardToSocket(channel, socketConn, message => {
        if (this.options.errorResponseOnClosedSocket) {
          this.logger.info(`No connection to ${this.options.name}. Send error response.`);
          this.sendErrorResponse(message, channel);
        } else {
          pendingMessages.push(message);
        }
      })
    );
    disposable.push(forwardToChannel(socketConn, channel));
    disposable.push(
      channel.onClose(() => {
        socketConn.dispose();
        socketConn.socket.destroy();
      })
    );
    return disposable;
  }

  protected sendErrorResponse(message: rpc.Message | RpcMessage, channel: Channel): void {
    let id: number | undefined;
    if ('jsonrpc' in message && rpc.Message.isRequest(message)) {
      id = getId(message);
    } else if ('type' in message && message.type === RpcMessageType.Request) {
      id = message.id;
    }
    if (id !== undefined) {
      const error = this.createErrorResponse();
      sendErrorResponse(channel, id, error);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected handleStartError(_cause: any, channel: Channel): void {
    listen(channel, message => {
      this.sendErrorResponse(message, channel);
    });
  }

  protected handleSocketClosed(): void {
    this.logger.info(`Could not connect to ${this.options.name}`, this.options.socketOptions);
  }

  protected createErrorResponse(): Error {
    return new rpc.ResponseError<string>(rpc.ErrorCodes.jsonrpcReservedErrorRangeStart, `No Connection to ${this.options.name}`);
  }
}

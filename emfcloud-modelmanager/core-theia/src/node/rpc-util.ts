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

import { Channel, Disposable } from '@theia/core';
import {
  CancelMessage,
  MsgPackMessageDecoder,
  MsgPackMessageEncoder,
  NotificationMessage,
  ReplyErrMessage,
  ReplyMessage,
  RequestMessage,
  RpcMessage,
  RpcMessageType
} from '@theia/core/lib/common/message-rpc/rpc-message-encoder';
import { Socket } from 'net';
import * as rpc from 'vscode-jsonrpc/node';

const jsonrpc = '2.0';
const cancelNotificationMethod = '$/cancelRequest';

export class SocketConnection implements Disposable {
  constructor(
    public socket: Socket,
    public reader: rpc.SocketMessageReader = new rpc.SocketMessageReader(socket),
    public writer: rpc.SocketMessageWriter = new rpc.SocketMessageWriter(socket)
  ) {}

  dispose(): void {
    this.reader.dispose();
    this.writer.dispose();
  }
}

export function listen(channel: Channel, cb: (msg: RpcMessage) => void, messageDecoder = new MsgPackMessageDecoder()): Disposable {
  return channel.onMessage(msg => {
    const message = messageDecoder.decode<RpcMessage>(msg());
    cb(message);
  });
}

export function forwardToChannel(connection: SocketConnection, channel: Channel): Disposable {
  return connection.reader.listen(message => {
    if (rpc.Message.isNotification(message)) {
      if (message.method === cancelNotificationMethod) {
        const id = getArgs(message)[0].id;
        return sendCancel(channel, id);
      }
      return sendNotification(channel, message.method, getArgs(message));
    }
    if (rpc.Message.isRequest(message)) {
      return sendRequest(channel, message.method, getId(message), getArgs(message));
    }
    if (rpc.Message.isResponse(message)) {
      if (message.error) {
        return sendErrorResponse(channel, getId(message), message.error);
      }
      return sendResponse(channel, getId(message), message.result);
    }
    return Promise.resolve();
  });
}

export function forwardToSocket(
  channel: Channel,
  connection: SocketConnection,
  onSocketDestroyed?: (message: RpcMessage) => void
): Disposable {
  return listen(channel, message => {
    if (connection.socket.destroyed) {
      return onSocketDestroyed?.(message);
    }
    return sendMessageToSocket(connection, message);
  });
}

export function sendMessageToSocket(connection: SocketConnection, message: RpcMessage): Promise<void> {
  switch (message.type) {
    case RpcMessageType.Cancel:
      return sendCancel(connection.writer, message.id);
    case RpcMessageType.Notification:
      return sendNotification(connection.writer, message.method, message.args);
    case RpcMessageType.Request:
      return sendRequest(connection.writer, message.method, message.id, message.args);
    case RpcMessageType.ReplyErr:
      return sendErrorResponse(connection.writer, message.id, message.err);
    case RpcMessageType.Reply: {
      return sendResponse(connection.writer, message.id, message.res);
    }
  }
}

export function sendrpcMessage<M extends rpc.Message>(writer: rpc.MessageWriter, message: M): Promise<void> {
  return writer.write(message);
}

export async function sendTheiaRpcMessage<M extends RpcMessage>(
  channel: Channel,
  message: M,
  messageEncoder = new MsgPackMessageEncoder()
): Promise<void> {
  const output = channel.getWriteBuffer();
  messageEncoder.encode(output, message);
  output.commit();
}

export function sendRequest(target: Channel | rpc.MessageWriter, method: string, id: number, args: any[]): Promise<void> {
  if (rpc.MessageWriter.is(target)) {
    return sendrpcMessage<rpc.RequestMessage>(target, {
      jsonrpc,
      id,
      method,
      params: toParams(args)
    });
  }
  return sendTheiaRpcMessage<RequestMessage>(target, { type: RpcMessageType.Request, args, id, method });
}

export function sendNotification(target: Channel | rpc.MessageWriter, method: string, args: any[]): Promise<void> {
  if (rpc.MessageWriter.is(target)) {
    return sendrpcMessage<rpc.NotificationMessage>(target, {
      jsonrpc,
      method,
      params: toParams(args)
    });
  }
  return sendTheiaRpcMessage<NotificationMessage>(target, { type: RpcMessageType.Notification, args, method, id: 0 });
}

export function sendResponse(target: Channel | rpc.MessageWriter, id: number, result: any): Promise<void> {
  if (rpc.MessageWriter.is(target)) {
    return sendrpcMessage<rpc.ResponseMessage>(target, {
      jsonrpc,
      id,
      result
    });
  }
  return sendTheiaRpcMessage<ReplyMessage>(target, { type: RpcMessageType.Reply, res: result, id });
}

export function sendErrorResponse(target: Channel | rpc.MessageWriter, id: number, error: any): Promise<void> {
  if (rpc.MessageWriter.is(target)) {
    return sendrpcMessage<rpc.ResponseMessage>(target, {
      jsonrpc,
      id,
      error
    });
  }
  return sendTheiaRpcMessage<ReplyErrMessage>(target, { type: RpcMessageType.ReplyErr, err: error, id });
}

export function sendCancel(target: Channel | rpc.MessageWriter, id: number): Promise<void> {
  if (rpc.MessageWriter.is(target)) {
    return sendrpcMessage<rpc.NotificationMessage>(target, {
      jsonrpc,
      method: cancelNotificationMethod,
      params: { id }
    });
  }
  return sendTheiaRpcMessage<CancelMessage>(target, { type: RpcMessageType.Cancel, id });
}

export function getId(message: rpc.RequestMessage | rpc.ResponseMessage): number {
  // eslint-disable-next-line no-null/no-null
  if (message.id === null) {
    const errorMsg = 'Could not forward request message. Id not defined';
    console.error(errorMsg, message);
    throw new Error(errorMsg);
  }
  return Number.parseInt(message.id.toString(), 10);
}

export function getArgs(message: rpc.RequestMessage | rpc.NotificationMessage): any[] {
  if (!message.params) {
    return [];
  }
  return Array.isArray(message.params) ? message.params : [message.params];
}

export function toParams(args: any[]): undefined | object | any[] {
  if (args.length === 0) {
    return undefined;
  }
  if (args.length === 1) {
    return args[0];
  }
  return args;
}

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
import { DefaultLanguageServer } from 'langium';
import { TextDocumentSyncKind, type InitializeParams, type InitializeResult } from 'vscode-languageserver-protocol';

export class ModelLanguageServer extends DefaultLanguageServer {
  override async initialize(params: InitializeParams): Promise<InitializeResult> {
    const result = await super.initialize(params);
    result.capabilities.textDocumentSync = TextDocumentSyncKind.Full;
    return result;
  }
}

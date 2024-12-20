/********************************************************************************
 * Copyright (c) 2023 CrossBreeze and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0, or the MIT License which is
 * available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: EPL-2.0 OR MIT
 ********************************************************************************/

import * as fs from 'fs';
import type { AstNode, FileSystemProvider, LangiumDocuments } from 'langium';
import { URI } from 'langium';
import type { Disposable } from 'vscode-languageserver';
import { TextDocumentIdentifier, TextDocumentItem, VersionedTextDocumentIdentifier } from 'vscode-languageserver-protocol';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { ModelLanguagesSharedServices } from './model-language-modules.js';
import type { OpenTextDocuments } from './open-text-documents.js';

/**
 * A manager class that supports handling documents with a simple open-update-save/close lifecycle.
 *
 * The manager wraps the services exposed by Langium and acts as a small language client on behalf of the caller.
 */
export interface TextDocumentManager {
  /**
   * Opens the document with the given URI for modification.
   *
   * @param uri document URI
   * @param languageId
   */
  open(uri: string): Promise<void>;
  isOpen(uri: string): boolean;
  isOpenInTextEditor(uri: string): boolean;
  close(uri: string): Promise<void>;
  update(uri: string, version: number, text: string): Promise<void>;
  save(uri: string, text: string): Promise<void>;
  onSave<T extends AstNode>(uri: string, listener: (model: T) => void): Disposable;
}

export class ModelTextDocumentManager implements TextDocumentManager {
  protected textDocuments: OpenTextDocuments<TextDocument>;
  protected fileSystemProvider: FileSystemProvider;
  protected langiumDocs: LangiumDocuments;

  /** Normalized URIs of open documents */
  protected openDocuments: string[] = [];

  constructor(protected services: ModelLanguagesSharedServices) {
    this.textDocuments = services.workspace.TextDocuments;
    this.fileSystemProvider = services.workspace.FileSystemProvider;
    this.langiumDocs = services.workspace.LangiumDocuments;

    this.textDocuments.onDidOpen(event => this.open(event.document.uri, event.document.languageId));
    this.textDocuments.onDidClose(event => this.close(event.document.uri));
  }

  /**
   * Subscribe to the onsave of the textdocuments.
   *
   * @param uri Uri of the document to listen to. The callback only gets called when this URI and the URI of the saved document
   * are equal.
   * @param listener Callback to be called
   * @returns Disposable object
   */
  onSave<T extends AstNode>(uri: string, listener: (model: T) => void): Disposable {
    return this.textDocuments.onDidSave(e => {
      const documentURI = URI.parse(e.document.uri);

      // Check if the uri of the saved document and the uri of the listener are equal.
      if (e.document.uri === uri && documentURI !== undefined && this.langiumDocs.hasDocument(documentURI)) {
        const document = this.langiumDocs.getOrCreateDocument(documentURI);
        const root = document.parseResult.value;
        return listener(root as T);
      }

      return undefined;
    });
  }

  async open(uri: string, languageId?: string): Promise<void> {
    if (this.isOpen(uri)) {
      return;
    }
    this.openDocuments.push(this.normalizedUri(uri));
    const textDocument = await this.readFromFilesystem(uri, languageId);
    this.textDocuments.notifyDidOpenTextDocument({ textDocument }, false);
  }

  async close(uri: string): Promise<void> {
    if (!this.isOpen(uri)) {
      return;
    }
    this.removeFromOpenedDocuments(uri);
    this.textDocuments.notifyDidCloseTextDocument({ textDocument: TextDocumentIdentifier.create(uri) });
  }

  async update(uri: string, version: number, text: string): Promise<void> {
    if (!this.isOpen(uri)) {
      throw new Error(`Document ${uri} hasn't been opened for updating yet`);
    }
    this.textDocuments.notifyDidChangeTextDocument({
      textDocument: VersionedTextDocumentIdentifier.create(uri, version),
      contentChanges: [{ text }]
    });
  }

  async save(uri: string, text: string): Promise<void> {
    const vscUri = URI.parse(uri);
    fs.writeFileSync(vscUri.fsPath, text);
    this.textDocuments.notifyDidSaveTextDocument({ textDocument: TextDocumentIdentifier.create(uri) });
  }

  isOpen(uri: string): boolean {
    return this.openDocuments.includes(this.normalizedUri(uri));
  }

  isOpenInTextEditor(uri: string): boolean {
    return this.textDocuments.isOpenInTextEditor(this.normalizedUri(uri));
  }

  protected removeFromOpenedDocuments(uri: string): void {
    this.openDocuments.splice(this.openDocuments.indexOf(this.normalizedUri(uri)));
  }

  protected async readFromFilesystem(
    uri: string,
    languageId = this.services.ServiceRegistry.getServices(URI.parse(uri)).LanguageMetaData.languageId
  ): Promise<TextDocumentItem> {
    const vscUri = URI.parse(uri);
    const content = this.fileSystemProvider.readFileSync(vscUri);
    return TextDocumentItem.create(vscUri.toString(), languageId, 1, content.toString());
  }

  protected normalizedUri(uri: string): string {
    return URI.parse(uri).toString();
  }
}

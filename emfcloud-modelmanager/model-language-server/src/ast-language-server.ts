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

import type { AstNode, AstNodeDescription, AstNodeLocator } from 'langium';
import { DocumentState, URI, isAstNode } from 'langium';
import type { Disposable } from 'vscode-languageserver';
import { OptionalVersionedTextDocumentIdentifier, Range, TextDocumentEdit, TextEdit } from 'vscode-languageserver-types';
import type { ModelLanguageServices, ModelLanguagesSharedServices } from './model-language-modules.js';
import { TextDocumentSerializer } from './text-document-serializer.js';

/**
 * This servers serves as a facade to access and update semantic models from the Langium language server as a non-LSP client.
 * It provides a simple open-request-update-save/close lifecycle for documents and their semantic model.
 */
export class AstLanguageServer {
  constructor(
    protected shared: ModelLanguagesSharedServices,
    protected documentManager = shared.workspace.TextDocumentManager,
    protected documents = shared.workspace.LangiumDocuments,
    protected documentBuilder = shared.workspace.DocumentBuilder
  ) {}

  protected getLanguageServices(uri: URI): ModelLanguageServices;
  protected getLanguageServices(uri?: URI): ModelLanguageServices | undefined;
  protected getLanguageServices(uri?: URI): ModelLanguageServices | undefined {
    return !uri ? undefined : (this.shared.ServiceRegistry.getServices(uri) as ModelLanguageServices);
  }

  protected getAstNodeLocator(uri: URI): AstNodeLocator;
  protected getAstNodeLocator(uri?: URI): AstNodeLocator | undefined;
  protected getAstNodeLocator(uri?: URI): AstNodeLocator | undefined {
    return this.getLanguageServices(uri)?.workspace.AstNodeLocator;
  }

  protected getTextDocumentSerializer(uri: URI): TextDocumentSerializer;
  protected getTextDocumentSerializer(uri?: URI): TextDocumentSerializer | undefined;
  protected getTextDocumentSerializer(uri?: URI): TextDocumentSerializer | undefined {
    return this.getLanguageServices(uri)?.serializer.TextDocumentSerializer;
  }

  /**
   * Opens the document with the given URI for modification.
   *
   * @param uri document URI
   */
  async open(uri: string): Promise<void> {
    return this.documentManager.open(uri);
  }

  /**
   * Closes the document with the given URI for modification.
   *
   * @param uri document URI
   */
  async close(uri: string): Promise<void> {
    return this.documentManager.close(uri);
  }

  /**
   * Requests the semantic model stored in the document with the given URI.
   * If the document was not already open for modification, it will be opened automatically.
   *
   * @param uri document URI
   */
  request(uri: string): Promise<AstNode | undefined>;
  /**
   * Requests the semantic model stored in the document with the given URI if it matches the given guard function.
   * If the document was not already open for modification, it will be opened automatically.
   *
   * @param uri document URI
   * @param guard guard function to ensure a certain type of semantic model
   */
  request<T extends AstNode>(uri: string, guard: (item: unknown) => item is T): Promise<T | undefined>;
  async request<T extends AstNode>(uri: string, guard?: (item: unknown) => item is T): Promise<AstNode | T | undefined> {
    this.open(uri);
    const document = this.documents.getOrCreateDocument(URI.parse(uri));
    const root = document.parseResult.value;
    const check = guard ?? isAstNode;
    return check(root) ? root : undefined;
  }

  /**
   * Updates the semantic model stored in the document with the given model or textual representation of a model.
   * Any previous content will be overridden.
   * If the document was not already open for modification, it will be opened automatically.
   *
   * @param uri document URI
   * @param model semantic model or textual representation of it
   * @returns the stored semantic model
   */
  async update<T extends AstNode>(uri: string, model: T | string): Promise<T> {
    await this.open(uri);
    const parsedURI = URI.parse(uri);
    const document = this.documents.getOrCreateDocument(parsedURI);
    const root = document.parseResult.value;
    if (!isAstNode(root)) {
      throw new Error(`No AST node to update exists in '${uri}'`);
    }

    // replace complete text in text document and document storage
    const text = typeof model === 'string' ? model : this.getTextDocumentSerializer(parsedURI).serialize(model);
    const textDocument = document.textDocument;

    if (this.documentManager.isOpenInTextEditor(uri)) {
      // we only want to apply a text edit if the editor is already open
      // applying a workspace edit also opens the Monaco editor
      // unless you activate 'Auto Save' with a short delay, cf. https://github.com/microsoft/vscode/issues/112109
      await this.shared.lsp.Connection?.workspace.applyEdit({
        label: 'Update Model',
        documentChanges: [
          // we use a null version to indicate that the version is known
          // eslint-disable-next-line no-null/no-null
          TextDocumentEdit.create(OptionalVersionedTextDocumentIdentifier.create(textDocument.uri, null), [
            TextEdit.replace(Range.create(textDocument.positionAt(0), textDocument.positionAt(textDocument.getText().length)), text)
          ])
        ]
      });
    }

    await this.documentManager.update(uri, textDocument.version + 1, text);

    // re-build
    await this.documentBuilder.update([parsedURI], []);

    const newRoot = document.parseResult.value as T;
    return newRoot;
  }

  onUpdate<T extends AstNode>(uri: string, listener: (model: T) => void): Disposable {
    return this.documentBuilder.onBuildPhase(DocumentState.Validated, (allChangedDocuments, _token) => {
      const changedDocument = allChangedDocuments.find(document => document.uri.toString() === uri);
      if (changedDocument) {
        listener(changedDocument.parseResult.value as T);
      }
    });
  }

  onSave<T extends AstNode>(uri: string, listener: (model: T) => void): Disposable {
    return this.documentManager.onSave(uri, listener);
  }

  /**
   * Overrides the document with the given URI with the given semantic model or text.
   *
   * @param uri document uri
   * @param model semantic model or text
   */
  async save(uri: string, model: AstNode | string): Promise<void> {
    // sync: implicit update of internal data structure to match file system (similar to workspace initialization)
    await this.update(uri, model);

    const text = typeof model === 'string' ? model : this.getTextDocumentSerializer(URI.parse(uri)).serialize(model);
    return this.documentManager.save(uri, text);
  }

  async resolveNode(documentUri: string, path: string): Promise<AstNode | undefined> {
    const uri = URI.parse(documentUri);
    const parent = this.documents.getOrCreateDocument(uri).parseResult.value;
    return this.getAstNodeLocator(uri).getAstNode(parent, path);
  }

  async queryAll(nodeType: string): Promise<AstNode[]> {
    return this.shared.workspace.IndexManager.allElements(nodeType)
      .map(description => this.resolveDescription(description))
      .nonNullable()
      .toArray();
  }

  protected resolveDescription(description: AstNodeDescription): AstNode | undefined {
    const document = this.documents.getOrCreateDocument(description.documentUri);
    return this.getAstNodeLocator(description.documentUri).getAstNode(document.parseResult.value, description.path);
  }
}

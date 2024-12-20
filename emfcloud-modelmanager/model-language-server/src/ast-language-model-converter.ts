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
import * as client from '@eclipse-emfcloud/model-index';
import type { AstNode, AstNodeLocator, GenericAstNode, LangiumDocuments, LangiumSharedServices, Mutable, Reference } from 'langium';
import { URI, getDocument, isAstNode, isReference } from 'langium';
import * as lodash from 'lodash';

/**
 * Converter between the Langium-based AST model and the serializable client model.
 */
export const AstLanguageModelConverter = Symbol('AstLanguageModelConverter');
export interface AstLanguageModelConverter {
  astToLanguageModel(ast: undefined): undefined;
  astToLanguageModel<T>(ast: AstNode): T;
  astToLanguageModel<T>(ast?: AstNode): T | undefined;
  languageModelToAst<T extends client.NodeInfo>(client: T): AstNode;

  astToLanguageModelString(ast: AstNode): string;
  languageModelStringToAst(client: string): AstNode;
}

/**
 * Default implementation for the client model conversion.
 *
 * By default, we create a JSON based on the AST model with focus on the semantic model.
 * Cross references between semantic elements are custom serialized as described in the generic client model (ReferenceInfo).
 */
export class DefaultAstLanguageModelConverter implements AstLanguageModelConverter {
  private ignoredClientProperties = new Set(['$container', '$containerProperty', '$containerIndex', '$document', '$cstNode']);
  private readonly documents: LangiumDocuments;

  constructor(protected services: LangiumSharedServices) {
    this.documents = services.workspace.LangiumDocuments;
  }

  protected getAstNodeLocator(uri: URI): AstNodeLocator;
  protected getAstNodeLocator(uri?: URI): AstNodeLocator | undefined;
  protected getAstNodeLocator(uri?: URI): AstNodeLocator | undefined {
    return !uri ? undefined : this.services.ServiceRegistry.getServices(uri).workspace.AstNodeLocator;
  }

  astToLanguageModel<T>(ast: undefined): T;
  astToLanguageModel<T>(ast: AstNode): T;
  astToLanguageModel<T>(node?: AstNode): T | undefined {
    if (!node) {
      return undefined;
    }
    const clientString = this.astToLanguageModelString(node);
    return JSON.parse(clientString);
  }

  astToLanguageModelString(node: AstNode): string {
    return JSON.stringify(node, (key, value) => this.replacer(node, key, value));
  }

  languageModelStringToAst(clientString: string): AstNode {
    const clientModel = JSON.parse(clientString);
    return this.languageModelToAst(clientModel);
  }

  languageModelToAst<T extends client.NodeInfo>(clientModel: T): AstNode {
    // create a copy as we do not want to modify the original model
    const copy = lodash.default.cloneDeep(clientModel);
    this.reviveAstModel(copy, copy);
    return copy;
  }

  protected replacer(_source: AstNode, key: string, value: unknown): unknown {
    if (this.ignoredClientProperties.has(key)) {
      return undefined;
    }
    if (isReference(value)) {
      return this.replaceReference(value);
    }
    if (isAstNode(value)) {
      return this.replaceAstNode(value);
    }
    return value;
  }

  protected replaceReference(value: Reference<AstNode>): client.ReferenceInfo {
    return value.$nodeDescription && value.ref
      ? {
          $documentUri: getDocument(value.ref).uri.toString(),
          $name: value.$nodeDescription.name,
          $path: value.$nodeDescription.path,
          $type: value.$nodeDescription.type
        }
      : {
          $refText: value.$refText,
          $error: value.error?.message ?? 'Could not resolve reference: ' + value.$refText
        };
  }

  protected replaceAstNode(value: AstNode): AstNode {
    const document = getDocument(value);
    // add node info for client, non-client properties will be filtered in the replacer method
    (value as client.NodeInfo).$documentUri = document.uri.toString();
    (value as client.NodeInfo).$path = this.getAstNodeLocator(document.uri).getAstNodePath(value);
    (value as client.NodeInfo).$type = value.$type;
    return value;
  }

  protected reviveAstModel(
    node: GenericAstNode,
    root: AstNode,
    container?: AstNode,
    containerProperty?: string,
    containerIndex?: number
  ): void {
    for (const [propertyName, item] of Object.entries(node)) {
      if (Array.isArray(item)) {
        for (let index = 0; index < item.length; index++) {
          const element = item[index];
          if (client.isReferenceInfo(element)) {
            item[index] = this.reviveClientReference(node, propertyName, element);
          } else if (isAstNode(element)) {
            this.reviveAstModel(element as GenericAstNode, root, node, propertyName, index);
          }
        }
      } else if (client.isReferenceInfo(item)) {
        node[propertyName] = this.reviveClientReference(node, propertyName, item);
      } else if (isAstNode(item)) {
        this.reviveAstModel(item as GenericAstNode, root, node, propertyName);
      }
    }
    const mutable = node as Mutable<GenericAstNode>;
    mutable.$container = container;
    mutable.$containerProperty = containerProperty;
    mutable.$containerIndex = containerIndex;
  }

  protected reviveClientReference(container: AstNode, property: string, reference: client.ReferenceInfo): Reference | undefined {
    return client.isReferenceError(reference)
      ? this.reviveReferenceError(container, property, reference)
      : this.reviveNodeReference(container, reference);
  }

  protected reviveReferenceError(container: AstNode, property: string, referenceError: client.ReferenceError): Reference {
    const ref: Mutable<Reference> = { $refText: referenceError.$refText };
    ref.error = {
      container,
      property,
      message: referenceError.$error,
      reference: ref
    };
    return ref;
  }

  protected reviveNodeReference(container: AstNode, reference: client.NodeReferenceInfo): Reference {
    const node = this.resolveClientReference(container, reference);
    return {
      $refText: reference.$name,
      $nodeDescription: {
        documentUri: URI.parse(reference.$documentUri),
        name: reference.$name,
        path: reference.$path,
        type: reference.$type
      },
      $refNode: node?.$cstNode
    };
  }

  protected resolveClientReference(container: AstNode, reference: client.NodeReferenceInfo): AstNode | undefined {
    const uri = URI.parse(reference.$documentUri);
    const root = uri ? this.documents.getOrCreateDocument(uri).parseResult.value : container;
    return this.getAstNodeLocator(root.$document?.uri)?.getAstNode(root, reference.$path);
  }
}

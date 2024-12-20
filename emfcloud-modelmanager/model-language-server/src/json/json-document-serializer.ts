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

import type { AstNode, GenericAstNode } from 'langium';
import { isAstNode, isReference } from 'langium';
import type { GrammarReflection } from '../grammar-reflection.js';
import type { ModelLanguageServices } from '../model-language-modules.js';
import type { TextDocumentSerializer } from '../text-document-serializer.js';

export class JsonDocumentSerializer implements TextDocumentSerializer {
  private readonly grammarReflection: GrammarReflection;

  constructor(services: ModelLanguageServices) {
    this.grammarReflection = services.GrammarReflection;
  }

  serialize(node: AstNode): string {
    return JSON.stringify(node, (key, value) => this.replacer(node, key, value), 2);
  }

  protected replacer(_source: AstNode, key: string, value: unknown): unknown {
    if (key.startsWith('$')) {
      return undefined;
    }
    if (isReference(value)) {
      return value.$nodeDescription?.name;
    }
    if (isAstNode(value)) {
      // replace ast node with plain object containing the properties specified in the grammar in the correct order
      const properties = this.grammarReflection.getPropertyNames(value.$type);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sortedPlainObject = properties.reduce((sorted: any, astKey: string) => {
        sorted[astKey] = (value as GenericAstNode)[astKey];
        return sorted;
      }, {});
      return sortedPlainObject;
    }
    return value;
  }
}

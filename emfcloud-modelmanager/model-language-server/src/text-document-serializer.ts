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

import type { AstNode } from 'langium';

export const TextDocumentSerializer = Symbol('TextDocumentSerializer');

/**
 * A serializer to create a grammar-conform string for a given AST.
 */
export interface TextDocumentSerializer {
  /**
   * Serializes the given AST node into a grammar-conform string that can be written in a file.
   *
   * @param node AST to be serialized
   */
  serialize(node: AstNode): string;
}

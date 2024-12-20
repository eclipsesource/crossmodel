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

import type { AstNode, CstNode, NameProvider } from 'langium';
import { findNodeForProperty } from 'langium';

export const ID_PROPERTY = 'id';

export type IdentifiedAstNode = AstNode & {
  [ID_PROPERTY]: string;
};

export function hasId(node?: AstNode): node is IdentifiedAstNode {
  return !!node && ID_PROPERTY in node && typeof node[ID_PROPERTY] === 'string';
}

export function getId(node?: AstNode): string | undefined {
  return hasId(node) ? node[ID_PROPERTY] : undefined;
}

export interface IdProvider extends NameProvider {
  getId(node?: AstNode): string | undefined;
}

/**
 * A name provider that returns the fully qualified id of a node by default but also exposes methods to get other names:
 * - The local id is just the id of the node itself if it has an id.
 * - The qualified id / document-local name is the name of the node itself plus all it's named parents within the document
 */
export class QualifiedIdProvider implements NameProvider {
  /**
   * Returns the direct name of the node if it has one.
   *
   * @param node node
   * @returns direct, local name of the node if available
   */
  getLocalId(node?: AstNode): string | undefined {
    return getId(node);
  }

  /**
   * Returns the qualified name / document-local name, i.e., the local name of the node plus the local name of all it's named
   * parents within the document.
   *
   * @param node node
   * @returns qualified, document-local name
   */
  getQualifiedId(node?: AstNode): string | undefined {
    if (!node) {
      return undefined;
    }
    let id = getId(node);
    if (!id) {
      return undefined;
    }
    let parent = node.$container;
    while (parent) {
      const parentId = getId(parent);
      if (parentId) {
        id = parentId + '.' + id;
      }
      parent = parent.$container;
    }
    return id;
  }

  getId(node?: AstNode): string | undefined {
    return node ? this.getQualifiedId(node) : undefined;
  }

  getName(node?: AstNode): string | undefined {
    return this.getId(node);
  }

  getNameNode(node: AstNode): CstNode | undefined {
    return findNodeForProperty(node.$cstNode, ID_PROPERTY);
  }
}

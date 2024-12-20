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
import type { AstNode, AstNodeDescription, LangiumDocument } from 'langium';
import { DefaultScopeComputation, streamAllContents } from 'langium';
import type { CancellationToken } from 'vscode-jsonrpc';

/**
 * Traverse the whole document hierarchy, i.e., all nodes and their direct and indirect children, to compute exports.
 * By default only the direct children of nodes are visited in Langium but for modelling languages it is more common to visit all elements.
 */
export class DeepScopeComputation extends DefaultScopeComputation {
  override computeExportsForNode(
    parentNode: AstNode,
    document: LangiumDocument<AstNode>,
    _children?: ((root: AstNode) => Iterable<AstNode>) | undefined,
    cancelToken?: CancellationToken | undefined
  ): Promise<AstNodeDescription[]> {
    // always streamAllContents for exporting nodes independent from hierarchy
    return super.computeExportsForNode(parentNode, document, streamAllContents, cancelToken);
  }
}

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

import type { AstNode, ValidationAcceptor, ValidationRegistry } from 'langium';
import type { ModelLanguageServices } from './model-language-modules.js';
import type { ValidationContribution } from './validation.js';

/**
 * Validation to ensure that all elements have a unique Id according to the configured @link{IdProvider}.
 */
export class IdValidator implements ValidationContribution {
  constructor(protected services: ModelLanguageServices) {}

  checkUniqueId(element: AstNode, accept: ValidationAcceptor, errorMessage = 'IDs must be unique.'): void {
    const elementName = this.services.references.IdProvider.getId(element);
    if (!elementName) {
      return;
    }
    const allElements = this.services.shared.workspace.IndexManager.allElements();
    const duplicates = allElements.filter(description => description.name === elementName).toArray();
    if (duplicates.length > 1) {
      accept('error', errorMessage, { node: element, property: 'id' });
    }
  }

  register(registry: ValidationRegistry): void {
    registry.register(
      {
        AstNode: (node, acceptor) => this.checkUniqueId(node, acceptor)
      },
      this
    );
  }
}

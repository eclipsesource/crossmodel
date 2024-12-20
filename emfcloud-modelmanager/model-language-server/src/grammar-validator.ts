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
 * Validator to ensure that all mandatory properties of an AST node are set according to the grammar.
 * Typically the parser already takes care of these errors but a custom handling can be done here.
 */
export class GrammarValidator implements ValidationContribution {
  constructor(protected services: ModelLanguageServices) {}

  checkMandatoryProperties(element: AstNode, accept: ValidationAcceptor): void {
    const mandatoryProps = this.services.GrammarReflection.getPropertyNames(element.$type, 'mandatory');
    const specifiedProps = Object.keys(element);
    mandatoryProps.forEach(mandatory => {
      if (!specifiedProps.includes(mandatory)) {
        if (mandatory === 'type') {
          // handle 'type' specially as this is a rule that we use to distinguish elements and otherwise the first type is chosen by default
          accept('error', 'Need to specify ' + mandatory + ' for element.', { node: element });
        } else {
          accept('error', 'Need to specify ' + mandatory + ' for ' + element.$type + '.', { node: element });
        }
      }
    });
  }

  register(registry: ValidationRegistry): void {
    registry.register(
      {
        AstNode: (node, acceptor) => this.checkMandatoryProperties(node, acceptor)
      },
      this
    );
  }
}

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
import { ValidationRegistry } from 'langium';
import type { ModelLanguageServices } from './model-language-modules.js';

/**
 * Allows to contribute validation checks to the validation registry.
 */
export interface ValidationContribution {
  /**
   * Registers validation check in the validation registry.
   *
   * @param registry validation registry
   */
  register(registry: ValidationRegistry): void;
}

/**
 * A validation registry that initializes the set of validation checks with DI-configured contributions.
 */
export class ValidationContributionRegistry extends ValidationRegistry {
  constructor(services: ModelLanguageServices) {
    super(services);
    services.validation.ValidationContributions.forEach(contribution => contribution.register(this));
  }
}

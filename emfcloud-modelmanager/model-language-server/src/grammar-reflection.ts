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
import type { Grammar } from 'langium';
import { collectAst } from 'langium/types';

/**
 * Meta information about the grammar of the language.
 */
export interface GrammarReflection {
  /**
   * Returns a list of all property names for the given element type in the order in which they are specified in the grammar.
   *
   * @param elementType element type ($type attribute)
   * @param kind the properties that should be returned (default: all)
   */
  getPropertyNames(elementType: string, kind?: 'all' | 'mandatory' | 'optional'): string[];
}

export class DefaultGrammarReflection implements GrammarReflection {
  private propertyCache = new Map<string, string[]>();

  constructor(public grammar: Grammar, public astTypes = collectAst(grammar)) {}

  getPropertyNames(elementType: string, kind: 'all' | 'mandatory' | 'optional' = 'all'): string[] {
    const key = elementType + '$' + kind;
    let cachedProperties = this.propertyCache.get(key);
    if (!cachedProperties) {
      cachedProperties = this.calcProperties(elementType, kind);
      this.propertyCache.set(key, cachedProperties);
    }
    return cachedProperties;
  }

  protected calcProperties(elementType: string, kind: 'all' | 'mandatory' | 'optional'): string[] {
    const interfaceType = this.astTypes.interfaces.find(type => type.name === elementType);
    return !interfaceType
      ? []
      : kind === 'all'
      ? interfaceType.allProperties.map(prop => prop.name)
      : kind === 'optional'
      ? interfaceType.allProperties.filter(prop => prop.optional).map(prop => prop.name)
      : interfaceType.allProperties.filter(prop => !prop.optional).map(prop => prop.name);
  }
}

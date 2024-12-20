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
import type { CstNode, ValueType} from 'langium';
import { DefaultValueConverter, GrammarAST as ast, convertString } from 'langium';
import { getExplicitRuleType } from 'langium/internal';

export class JsonLanguageValueConverter extends DefaultValueConverter {
  protected override runConverter(rule: ast.AbstractRule, input: string, cstNode: CstNode): ValueType {
    // JSON only allows boolean, number, and strings
    // In JSON-based grammars values need to be surrounded with double quotes but in AST model we want regular strings without quotes
    // If the rule is STRING then this conversion is already handled by the default converter
    return this.isStringTypeRule(rule) ? convertString(input) : super.runConverter(rule, input, cstNode);
  }

  protected isStringTypeRule(rule: ast.AbstractRule): boolean {
    return this.getRuleType(rule)?.toLowerCase() === 'string';
  }

  protected getRuleType(rule: ast.AbstractRule): string {
    if (ast.isTerminalRule(rule)) {
      return rule.type?.name ?? 'string';
    }
    const explicitType = getExplicitRuleType(rule);
    return explicitType ?? rule.name;
  }
}

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
import type { CompletionAcceptor, CompletionContext, CompletionValueItem, MaybePromise, NextFeature } from 'langium';
import { DefaultCompletionProvider, GrammarAST as ast, getContainerOfType } from 'langium';
import { getExplicitRuleType } from 'langium/internal';
import { v4 as uuid } from 'uuid';
import type { Range } from 'vscode-languageserver-types';
import { CompletionItemKind, InsertTextFormat } from 'vscode-languageserver-types';
import { doubleQuote } from './json-util.js';

export class JsonLanguageCompletionProvider extends DefaultCompletionProvider {
  protected override completionFor(
    context: CompletionContext,
    next: NextFeature<ast.AbstractElement>,
    acceptor: CompletionAcceptor
  ): MaybePromise<void> {
    const assignment = getContainerOfType(next.feature, ast.isAssignment);
    if (!ast.isCrossReference(next.feature) && assignment) {
      return this.completionForAssignment(context, assignment, acceptor);
    } else {
      return super.completionFor(context, next, acceptor);
    }
  }

  protected completionForAssignment(
    context: CompletionContext,
    assignment: ast.Assignment,
    acceptor: CompletionAcceptor
  ): MaybePromise<void> {
    if (assignment.feature === 'id') {
      return this.completionForId(context, assignment, acceptor);
    }
    if (ast.isRuleCall(assignment.terminal) && assignment.terminal.rule.ref) {
      const type = this.getRuleType(assignment.terminal.rule.ref);
      switch (type) {
        case 'string':
          return this.completionForString(context, assignment, acceptor);
        case 'number':
          return this.completionForNumber(context, assignment, acceptor);
        case 'boolean':
          return this.completionForBoolean(context, assignment, acceptor);
      }
    }
  }

  protected getRuleType(rule: ast.AbstractRule): string | undefined {
    if (ast.isTerminalRule(rule)) {
      return rule.type?.name ?? 'string';
    }
    const explicitType = getExplicitRuleType(rule);
    return explicitType ?? rule.name;
  }

  protected completionForId(context: CompletionContext, _assignment: ast.Assignment, acceptor: CompletionAcceptor): MaybePromise<void> {
    const generatedId = uuid();
    acceptor(context, {
      label: 'Generated ID: ' + generatedId,
      textEdit: {
        newText: doubleQuote(generatedId),
        range: this.getCompletionRange(context)
      },
      kind: CompletionItemKind.Value,
      sortText: '0'
    });
  }

  protected completionForString(context: CompletionContext, _assignment: ast.Assignment, acceptor: CompletionAcceptor): MaybePromise<void> {
    acceptor(context, {
      label: 'String Value',
      textEdit: {
        newText: doubleQuote('${1:text}'),
        range: this.getCompletionRange(context)
      },
      insertTextFormat: InsertTextFormat.Snippet,
      kind: CompletionItemKind.Snippet,
      sortText: '0'
    });
  }

  protected completionForNumber(context: CompletionContext, _assignment: ast.Assignment, acceptor: CompletionAcceptor): MaybePromise<void> {
    acceptor(context, {
      label: 'Number Value',
      textEdit: {
        newText: '${1:0}',
        range: this.getCompletionRange(context)
      },
      insertTextFormat: InsertTextFormat.Snippet,
      kind: CompletionItemKind.Snippet,
      sortText: '0'
    });
  }

  protected completionForBoolean(
    context: CompletionContext,
    _assignment: ast.Assignment,
    acceptor: CompletionAcceptor
  ): MaybePromise<void> {
    acceptor(context, {
      label: 'Boolean Value',
      textEdit: {
        newText: '${true:0}',
        range: this.getCompletionRange(context)
      },
      insertTextFormat: InsertTextFormat.Snippet,
      kind: CompletionItemKind.Snippet,
      sortText: '0'
    });
  }

  protected override completionForCrossReference(
    context: CompletionContext,
    crossRef: NextFeature<ast.CrossReference>,
    acceptor: CompletionAcceptor
  ): MaybePromise<void> {
    return super.completionForCrossReference(context, crossRef, (ctx, value) => this.accept(ctx, value, acceptor));
  }

  protected accept(context: CompletionContext, value: CompletionValueItem, defaultAcceptor: CompletionAcceptor): void {
    if ('nodeDescription' in value) {
      // we reference elements through String IDs so we need to surrounding quotes
      value.label = value.nodeDescription.name;
      value.insertText = doubleQuote(value.label);
    }
    defaultAcceptor(context, value);
  }

  protected getCompletionRange(context: CompletionContext): Range {
    const text = context.textDocument.getText();
    const existingText = text.substring(context.tokenOffset, context.offset);
    let range: Range = {
      start: context.position,
      end: context.position
    };
    if (existingText.length > 0) {
      // FIXME: Completely replace the current token
      const start = context.textDocument.positionAt(context.tokenOffset + 1);
      const end = context.textDocument.positionAt(context.tokenEndOffset - 1);
      range = {
        start,
        end
      };
    }
    return range;
  }
}

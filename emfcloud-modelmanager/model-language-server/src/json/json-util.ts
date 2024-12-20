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

export function doubleQuote(text: undefined): undefined;
export function doubleQuote(text: string): string;
export function doubleQuote(text?: string): string | undefined {
  if (!text) {
    return undefined;
  }
  return text.startsWith('"') && text.endsWith('"') ? text : '"' + text + '"';
}

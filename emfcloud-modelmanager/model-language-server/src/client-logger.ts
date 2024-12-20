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

import type { LangiumDefaultSharedServices } from 'langium';

/**
 * Custom class to ease and centralize logging on the client console.
 */
export class ClientLogger {
  constructor(protected services: LangiumDefaultSharedServices) {}

  /**
   * Show an error message.
   *
   * @param message The message to show.
   */
  error(message?: string): void {
    if (message) {
      this.services.lsp.Connection?.console.error(message);
    }
  }

  /**
   * Show a warning message.
   *
   * @param message The message to show.
   */
  warn(message?: string): void {
    if (message) {
      this.services.lsp.Connection?.console.warn(message);
    }
  }

  /**
   * Show an information message.
   *
   * @param message The message to show.
   */
  info(message?: string): void {
    if (message) {
      this.services.lsp.Connection?.console.info(message);
    }
  }

  /**
   * Log a message.
   *
   * @param message The message to log.
   */
  log(message?: string): void {
    if (message) {
      this.services.lsp.Connection?.console.log(message);
    }
  }
}

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

import { DefaultWorkspaceManager } from 'langium';
import type { CancellationToken, Event, WorkspaceFolder } from 'vscode-languageserver';
import { Emitter } from 'vscode-languageserver';
import type { ModelLanguagesSharedServices } from './model-language-modules.js';

/**
 * A workspace manager that provides some extensions for integration with other model services
 */
export class ModelLanguageWorkspaceManager extends DefaultWorkspaceManager {
  protected onWorkspaceInitializedEmitter = new Emitter<void>();

  constructor(protected services: ModelLanguagesSharedServices, protected logger = services.logger.ClientLogger) {
    super(services);
    this.initialBuildOptions.validation = true; // validate all documents on initial build
  }

  get onWorkspaceInitialized(): Event<void> {
    return this.onWorkspaceInitializedEmitter.event;
  }

  override async initializeWorkspace(folders: WorkspaceFolder[], cancelToken?: CancellationToken | undefined): Promise<void> {
    await super.initializeWorkspace(folders, cancelToken);

    // fire event when workspace was initialized so other services that depend on an initialized workspace can start their work
    this.logger.info('Workspace Initialized');
    this.onWorkspaceInitializedEmitter.fire();
  }
}

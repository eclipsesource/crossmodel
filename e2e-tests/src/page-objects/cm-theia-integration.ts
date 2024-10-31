/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { ContextMenuIntegration, Integration, IntegrationArgs, TheiaIntegrationOptions } from '@eclipse-glsp/glsp-playwright';
import { Locator, Page } from '@playwright/test';
import { TheiaAppFactory, TheiaAppLoader } from '@theia/playwright';
import { CrossModelApp } from './crossmodel-app';
import { CrossModelWorkspace } from './crossmodel-workspace';

export class CMTheiaIntegration extends Integration implements ContextMenuIntegration {
   protected theiaApp: CrossModelApp;

   override get page(): Page {
      return this.theiaApp.page;
   }

   get app(): CrossModelApp {
      return this.theiaApp;
   }

   get contextMenuLocator(): Locator {
      return this.page.locator('body > .p-Widget.p-Menu');
   }

   constructor(
      args: IntegrationArgs,
      protected readonly options: TheiaIntegrationOptions
   ) {
      super(args, 'Theia');
   }

   protected override async launch(): Promise<void> {
      const ws = new CrossModelWorkspace(this.options.workspace ? [this.options.workspace] : undefined);
      this.theiaApp = await TheiaAppLoader.load(this.args, ws, CrossModelApp as TheiaAppFactory<CrossModelApp>);
      this.theiaApp.integration = this;
      this.theiaApp.initialize(this.options);
   }
}

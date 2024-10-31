/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { IntegrationArgs } from '@eclipse-glsp/glsp-playwright';
import { test as base } from '@playwright/test';
import { CMTheiaIntegration } from '../page-objects/cm-theia-integration';
import { CrossModelApp } from '../page-objects/crossmodel-app';
import { CrossModelExplorerView } from '../page-objects/crossmodel-explorer-view';

interface CMFixture {
   workspaceUrl: string;
   app: CrossModelApp;
   integration: CMTheiaIntegration;
   explorer: CrossModelExplorerView;
}

const test = base.extend<CMFixture>({
   workspaceUrl: 'src/resources/sample-workspace', // default workspace can be overridden
   integration: async ({ browser, playwright, page, workspaceUrl, baseURL }, use) => {
      const args: IntegrationArgs = {
         playwright,
         browser,
         page
      };

      const integration = new CMTheiaIntegration(args, {
         type: 'Theia',
         workspace: workspaceUrl,
         widgetId: '',
         url: baseURL ?? 'http://localhost:3000'
      });

      await integration.initialize();
      await integration.start();
      await use(integration);
      await integration.close();
   },
   app: async ({ integration }, use) => {
      await use(integration.app);
   },
   explorer: async ({ app }, use) => {
      const explorer = await app.openView(CrossModelExplorerView);
      await explorer.waitForVisibleFileNodes();
      await use(explorer);
   }
});

export default test;

/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { IntegrationArgs, TheiaGLSPApp } from '@eclipse-glsp/glsp-playwright';
import { TheiaEditor } from '@theia/playwright';
import { CMTheiaIntegration } from './cm-theia-integration';
import { CrossModelExplorerView } from './crossmodel-explorer-view';

export interface CMAppArgs extends Omit<IntegrationArgs, 'page'> {
   workspaceUrl?: string;
   baseUrl?: string;
}
export class CrossModelApp extends TheiaGLSPApp {
   public static async load(args: CMAppArgs): Promise<CrossModelApp> {
      const integration = new CMTheiaIntegration(
         { browser: args.browser, page: {} as any, playwright: args.playwright },
         {
            type: 'Theia',
            workspace: args.workspaceUrl ?? 'src/resources/sample-workspace',
            widgetId: '',
            url: args.baseUrl ?? 'http://localhost:3000'
         }
      );
      await integration.initialize();
      await integration.start();
      return integration.app;
   }

   protected _integration: CMTheiaIntegration;

   set integration(integration: CMTheiaIntegration) {
      if (!this._integration) {
         this._integration = integration;
      } else {
         console.warn('Integration already set');
      }
   }

   get integration(): CMTheiaIntegration {
      return this._integration;
   }

   async openExplorerView(): Promise<CrossModelExplorerView> {
      const explorer = await this.openView(CrossModelExplorerView);
      await explorer.waitForVisibleFileNodes();
      return explorer;
   }

   override openEditor<T extends TheiaEditor>(
      filePath: string,
      editorFactory: new (editorFilePath: string, app: CrossModelApp) => T,
      editorName?: string | undefined,
      expectFileNodes?: boolean | undefined
   ): Promise<T> {
      return super.openEditor(filePath, editorFactory as new (f: string, a: TheiaGLSPApp) => T, editorName, expectFileNodes);
   }
}

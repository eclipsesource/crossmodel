/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { TheiaGLSPApp } from '@eclipse-glsp/glsp-playwright';
import { PlaywrightWorkerArgs } from '@playwright/test';
import { TheiaAppFactory, TheiaAppLoader, TheiaEditor, TheiaPlaywrightTestConfig } from '@theia/playwright';
import { CMTheiaIntegration } from './cm-theia-integration';
import { CrossModelWorkspace } from './crossmodel-workspace';

export class CrossModelApp extends TheiaGLSPApp {
   public static async load(
      args: TheiaPlaywrightTestConfig & PlaywrightWorkerArgs,
      workspace: CrossModelWorkspace
   ): Promise<CrossModelApp> {
      return TheiaAppLoader.load(args, workspace, CrossModelApp as TheiaAppFactory<CrossModelApp>);
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

   override openEditor<T extends TheiaEditor>(
      filePath: string,
      editorFactory: new (editorFilePath: string, app: CrossModelApp) => T,
      editorName?: string | undefined,
      expectFileNodes?: boolean | undefined
   ): Promise<T> {
      return super.openEditor(filePath, editorFactory as new (f: string, a: TheiaGLSPApp) => T, editorName, expectFileNodes);
   }
}

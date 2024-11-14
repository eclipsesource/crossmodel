/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { ElementHandle, Page } from '@playwright/test';
import { OSUtil, TheiaEditor, isElementVisible, normalizeId, urlEncodePath } from '@theia/playwright';
import { TheiaMonacoEditor } from '@theia/playwright/lib/theia-monaco-editor';
import { join } from 'path';
import { CMApp } from './cm-app';
import { IntegratedEditor, IntegratedTextEditor } from './cm-integrated-editor';
import { IntegratedSystemDiagramEditor } from './system-diagram/integrated-system-diagram-editor';

export type CompositeEditorName = keyof IntegratedEditorType;
export interface IntegratedEditorType {
   'Code Editor': IntegratedCodeEditor;
   'Form Editor': IntegratedFormEditor;
   'System Diagram': IntegratedSystemDiagramEditor;
   'Mapping Diagram': IntegratedMappingDiagramEditor;
}

export class CMCompositeEditor extends TheiaEditor {
   constructor(
      protected filePath: string,
      public override app: CMApp
   ) {
      // shell-tab-code-editor-opener:file:///c%3A/Users/user/AppData/Local/Temp/cloud-ws-JBUhb6/sample.txt:1
      // code-editor-opener:file:///c%3A/Users/user/AppData/Local/Temp/cloud-ws-JBUhb6/sample.txt:1
      super(
         {
            tabSelector: normalizeId(
               `#shell-tab-cm-composite-editor-handler:file://${urlEncodePath(
                  join(app.workspace.escapedPath, OSUtil.fileSeparator, filePath)
               )}`
            ),
            viewSelector: normalizeId(
               `#cm-composite-editor-handler:file://${urlEncodePath(join(app.workspace.escapedPath, OSUtil.fileSeparator, filePath))}`
            )
         },
         app
      );
   }

   protected editorTabSelector(editor: CompositeEditorName): string {
      return this.viewSelector + ` div.p-TabBar-tabLabel:has-text("${editor}")`;
   }

   protected isEditorTabVisible(editor: CompositeEditorName): Promise<boolean> {
      return isElementVisible(this.editorTabElement(editor));
   }

   protected editorTabElement(editor: CompositeEditorName): Promise<ElementHandle<SVGElement | HTMLElement> | null> {
      return this.page.$(this.editorTabSelector(editor));
   }

   async switchToEditor(editor: CompositeEditorName): Promise<ElementHandle<SVGElement | HTMLElement>> {
      const selector = this.editorTabSelector(editor);
      const tab = await this.page.waitForSelector(selector, { state: 'visible' });
      await tab?.click();
      return tab;
   }

   async switchToCodeEditor(): Promise<IntegratedCodeEditor> {
      await this.switchToEditor('Code Editor');
      const textEditor = new IntegratedCodeEditor(this.filePath, this, this.editorTabSelector('Code Editor'));
      await textEditor.activate();
      return textEditor;
   }

   async switchToFormEditor(): Promise<IntegratedFormEditor> {
      await this.switchToEditor('Form Editor');
      const formEditor = new IntegratedFormEditor(this.filePath, this, this.editorTabSelector('Form Editor'));
      await formEditor.activate();

      return formEditor;
   }

   async switchToSystemDiagram(): Promise<IntegratedSystemDiagramEditor> {
      await this.switchToEditor('System Diagram');
      const diagramEditor = new IntegratedSystemDiagramEditor(this.filePath, this, this.editorTabSelector('System Diagram'));
      await diagramEditor.waitForVisible();
      await diagramEditor.activate();

      return diagramEditor;
   }

   async switchToMappingDiagram(): Promise<IntegratedMappingDiagramEditor> {
      await this.switchToEditor('Mapping Diagram');
      const diagramEditor = new IntegratedMappingDiagramEditor(this.filePath, this, this.editorTabSelector('Mapping Diagram'));
      await diagramEditor.waitForVisible();
      await diagramEditor.activate();
      return diagramEditor;
   }
}

export class IntegratedCodeEditor extends IntegratedTextEditor {
   constructor(filePath: string, parent: CMCompositeEditor, tabSelector: string) {
      // shell-tab-code-editor-opener:file:///c%3A/Users/user/AppData/Local/Temp/cloud-ws-JBUhb6/sample.txt:1
      // code-editor-opener:file:///c%3A/Users/user/AppData/Local/Temp/cloud-ws-JBUhb6/sample.txt:1
      super(filePath, parent);
      this.data.viewSelector = normalizeId(
         `#code-editor-opener:file://${urlEncodePath(join(this.app.workspace.escapedPath, OSUtil.fileSeparator, filePath))}`
      );
      this.data.tabSelector = tabSelector;
      this.monacoEditor = new TheiaMonacoEditor(this.viewSelector, parent.app);
   }
}

export class IntegratedFormEditor extends IntegratedEditor {
   constructor(filePath: string, parent: CMCompositeEditor, tabSelector: string) {
      super(
         {
            tabSelector,
            viewSelector: normalizeId(
               `#form-editor-opener:file://${urlEncodePath(join(parent.app.workspace.escapedPath, OSUtil.fileSeparator, filePath))}`
            )
         },
         parent
      );
   }

   async hasError(errorMessage: string): Promise<boolean> {
      return hasViewError(this.page, this.viewSelector, errorMessage);
   }
}

export class IntegratedMappingDiagramEditor extends IntegratedEditor {
   constructor(filePath: string, parent: CMCompositeEditor, tabSelector: string) {
      super(
         {
            tabSelector,
            viewSelector: normalizeId(
               `#mapping-diagram:file://${urlEncodePath(join(parent.app.workspace.escapedPath, OSUtil.fileSeparator, filePath))}`
            )
         },
         parent
      );
   }

   async hasError(errorMessage: string): Promise<boolean> {
      return hasViewError(this.page, this.viewSelector, errorMessage);
   }
}

export async function hasViewError(page: Page, viewSelector: string, message: string): Promise<boolean> {
   const visible = await isElementVisible(page.$(viewSelector));
   if (!visible) {
      return false;
   }
   await page.waitForSelector(viewSelector + ' .editor-diagnostics-error-message:has-text("' + message + '")');
   return true;
}

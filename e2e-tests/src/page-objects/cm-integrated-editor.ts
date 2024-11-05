/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { TheiaEditor, TheiaTextEditor, TheiaViewData } from '@theia/playwright';
import { CMCompositeEditor } from './cm-composite-editor';

export abstract class IntegratedEditor extends TheiaEditor {
   constructor(
      data: TheiaViewData,
      protected readonly parent: CMCompositeEditor
   ) {
      super(data, parent.app);
   }

   override async activate(): Promise<void> {
      await this.parent.activate();
      return super.activate();
   }

   override close(waitForClosed?: boolean | undefined): Promise<void> {
      return this.parent.close(waitForClosed);
   }

   override closeWithoutSave(): Promise<void> {
      return this.parent.closeWithoutSave();
   }

   override async focus(): Promise<void> {
      await this.parent.focus();
      return super.focus();
   }

   override async save(): Promise<void> {
      await this.parent.save();
   }

   override async saveAndClose(): Promise<void> {
      await this.parent.saveAndClose();
   }

   override async undo(times?: number | undefined): Promise<void> {
      await this.parent.undo(times);
   }

   override async redo(times?: number | undefined): Promise<void> {
      await this.parent.redo(times);
   }

   override async isDirty(): Promise<boolean> {
      return this.parent.isDirty();
   }

   override async waitForVisible(): Promise<void> {
      await this.parent.waitForVisible();
      return super.waitForVisible();
   }

   override isClosable(): Promise<boolean> {
      return this.parent.isClosable();
   }

   override title(): Promise<string | undefined> {
      return this.parent.title();
   }
}

export abstract class IntegratedTextEditor extends TheiaTextEditor {
   constructor(
      filePath: string,
      protected readonly parent: CMCompositeEditor
   ) {
      super(filePath, parent.app);
   }

   override async activate(): Promise<void> {
      await this.parent.activate();
      return super.activate();
   }

   override close(waitForClosed?: boolean | undefined): Promise<void> {
      return this.parent.close(waitForClosed);
   }

   override closeWithoutSave(): Promise<void> {
      return this.parent.closeWithoutSave();
   }

   override async focus(): Promise<void> {
      await this.parent.focus();
      return super.focus();
   }

   override async save(): Promise<void> {
      await this.parent.save();
   }

   override async saveAndClose(): Promise<void> {
      await this.parent.saveAndClose();
   }

   override async undo(times?: number | undefined): Promise<void> {
      await this.parent.undo(times);
   }

   override async redo(times?: number | undefined): Promise<void> {
      await this.parent.redo(times);
   }

   override async isDirty(): Promise<boolean> {
      return this.parent.isDirty();
   }

   override async waitForVisible(): Promise<void> {
      await this.parent.waitForVisible();
      return super.waitForVisible();
   }

   override isClosable(): Promise<boolean> {
      return this.parent.isClosable();
   }

   override title(): Promise<string | undefined> {
      return this.parent.title();
   }
}

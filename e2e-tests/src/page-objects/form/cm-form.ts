/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { ElementHandle, Locator } from '@playwright/test';
import { TheiaApp, TheiaEditor, TheiaPageObject, TheiaView, isElementVisible } from '@theia/playwright';
import { TheiaViewObject } from '../theia-view-object';

export const FormIcons = {
   Entity: 'codicon-git-commit',
   Relationship: 'codicon-git-compare',
   SystemDiagram: 'codicon-type-hierarchy-sub',
   Mapping: 'codicon-group-by-ref-type'
};

export type FormType = keyof typeof FormIcons;

export abstract class CMForm extends TheiaViewObject {
   protected abstract iconClass: string;
   protected typeSelector: string;
   readonly locator: Locator;
   constructor(view: TheiaView, relativeSelector: string, type: FormType) {
      super(view, relativeSelector);
      this.typeSelector = `${this.selector} span.${FormIcons[type]}`;
      this.locator = view.page.locator(this.selector);
   }

   protected typeElementHandle(): Promise<ElementHandle<SVGElement | HTMLElement> | null> {
      return this.page.$(this.typeSelector);
   }

   override async waitForVisible(): Promise<void> {
      await this.page.waitForSelector(this.typeSelector, { state: 'visible' });
   }

   override async isVisible(): Promise<boolean> {
      const viewObject = await this.typeElementHandle();
      return !!viewObject && viewObject.isVisible();
   }

   async isDirty(): Promise<boolean> {
      const title = await this.page.$(this.selector + ' .form-title:not(.p-mod-hidden)');
      const text = await title?.textContent();
      return text?.endsWith('*') ?? false;
   }
}

export abstract class FormSection extends TheiaPageObject {
   readonly sectionLocator: Locator;

   constructor(form: CMForm, sectionName: string) {
      super(form.app);
      this.sectionLocator = form.locator.locator(`div.MuiAccordion-root:has(h6:has-text("${sectionName}"))`);
   }
}

const CMPropertiesViewData = {
   tabSelector: '#shell-tab-property-view',
   viewSelector: '#property-view',
   viewName: 'Properties'
};

export abstract class CMPropertiesView<F extends CMForm> extends TheiaEditor {
   protected modelRootSelector = '#model-property-view';

   abstract form(): Promise<F>;

   constructor(app: TheiaApp) {
      super(CMPropertiesViewData, app);
   }

   protected async modelPropertyElement(): Promise<ElementHandle<SVGElement | HTMLElement> | null> {
      return this.page.$(this.viewSelector + ' ' + this.modelRootSelector);
   }

   isModelPropertyElement(): Promise<boolean> {
      return isElementVisible(this.modelPropertyElement());
   }

   override async isDirty(): Promise<boolean> {
      const form = await this.form();
      return form.isDirty();
   }
}

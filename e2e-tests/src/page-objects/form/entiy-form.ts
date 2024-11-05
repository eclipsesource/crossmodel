/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { TheiaView } from '@theia/playwright/lib/theia-view';
import { CMForm, CMPropertiesView, FormIcons, FormSection } from './cm-form';

export class EntityForm extends CMForm {
   protected override iconClass = FormIcons.Entity;

   readonly generalSection: EntityGeneralSection;

   constructor(view: TheiaView, relativeSelector: string) {
      super(view, relativeSelector, 'Entity');
      this.generalSection = new EntityGeneralSection(this);
   }
}

export class EntityGeneralSection extends FormSection {
   constructor(form: EntityForm) {
      super(form, 'General');
   }

   async getName(): Promise<string> {
      return this.sectionLocator.getByLabel('Name').inputValue();
   }

   async setName(name: string): Promise<void> {
      await this.sectionLocator.getByLabel('Name').fill(name);
      return this.page.waitForTimeout(250);
   }

   async getDescription(): Promise<string> {
      return this.sectionLocator.getByLabel('Description').inputValue();
   }

   async setDescription(description: string): Promise<void> {
      await this.sectionLocator.getByLabel('Description').fill(description);
      return this.page.waitForTimeout(250);
   }
}

export class EntityPropertiesView extends CMPropertiesView<EntityForm> {
   async form(): Promise<EntityForm> {
      const entityForm = new EntityForm(this, this.modelRootSelector);
      await entityForm.waitForVisible();
      return entityForm;
   }
}

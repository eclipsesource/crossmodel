/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { expect } from '@eclipse-glsp/glsp-playwright';
import { test } from '@playwright/test';
import { CMApp } from '../../../page-objects/cm-app';
import { CMExplorerView } from '../../../page-objects/cm-explorer-view';
import { Entity } from '../../../page-objects/system-diagram/diagram-elements';

test.describe.serial('[System Diagram] Add/Edit/Delete entity in a diagram ', () => {
   let app: CMApp;
   let explorer: CMExplorerView;
   const NEW_ENTITY_LABEL = 'NewEntity';
   const RENAMED_ENTITY_LABEL = 'NewEntityRenamed';
   const RENAMED_ENTITY_DESCRIPTION = 'NewEntityDescription';

   const entityFileName = (entityName: string): string => `ExampleDWH/entities/${entityName}.entity.cm`;

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright, workspaceUrl: 'src/resources/mapping-example' });
   });

   test.afterAll(async () => {
      await app.page.close();
   });

   test('create new entity via toolbox', async () => {
      const diagramEditor = await app.openCompositeEditor('ExampleDWH/diagrams/ExampleDWH.system-diagram.cm', 'System Diagram');
      explorer = await app.openExplorerView();
      // Create new entity

      await diagramEditor.diagram.graph.waitForCreationOfType(Entity, async () => {
         const entity = await diagramEditor.getEntity('CalcAge');
         await diagramEditor.enableTool('Create Entity');
         const taskBounds = await entity.bounds();
         await taskBounds.position('bottom_center').moveRelative(0, 100).click();
      });

      // Verify that the entity was created as expected
      const newEntity = await diagramEditor.getEntity(NEW_ENTITY_LABEL);
      expect(newEntity).toBeDefined();
      await diagramEditor.saveAndClose();

      await explorer.activate();
      const newEntityFile = entityFileName(NEW_ENTITY_LABEL);
      expect(await explorer.existsFileNode(newEntityFile)).toBeTruthy();

      const entityCodeEditor = await app.openCompositeEditor(newEntityFile, 'Code Editor');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(1)).toBe('entity:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(2)).toMatch(`id: ${NEW_ENTITY_LABEL}`);
      expect(await entityCodeEditor.textContentOfLineByLineNumber(3)).toMatch(`name: "${NEW_ENTITY_LABEL}"`);
      await entityCodeEditor.saveAndClose();
   });

   test('Edit entity name & description via properties', async () => {
      const diagramEditor = await app.openCompositeEditor('ExampleDWH/diagrams/ExampleDWH.system-diagram.cm', 'System Diagram');
      const properties = await diagramEditor.selectEntityAndOpenProperties(NEW_ENTITY_LABEL);
      const form = await properties.form();
      await form.generalSection.setName(RENAMED_ENTITY_LABEL);
      await form.generalSection.setDescription(RENAMED_ENTITY_DESCRIPTION);
      // Verify that the entity was renamed as expected
      expect(await form.generalSection.getName()).toBe(RENAMED_ENTITY_LABEL);
      expect(await form.generalSection.getDescription()).toBe(RENAMED_ENTITY_DESCRIPTION);
      await properties.saveAndClose();
      await diagramEditor.activate();
      await diagramEditor.saveAndClose();

      await explorer.activate();
      const renamedEntityFile = entityFileName(NEW_ENTITY_LABEL);
      await explorer.waitForTreeNodeVisible(renamedEntityFile);

      const entityCodeEditor = await app.openCompositeEditor(renamedEntityFile, 'Code Editor');

      expect(await entityCodeEditor.textContentOfLineByLineNumber(3)).toMatch(`name: "${RENAMED_ENTITY_LABEL}"`);
      expect(await entityCodeEditor.textContentOfLineByLineNumber(4)).toMatch(`description: "${RENAMED_ENTITY_DESCRIPTION}"`);
      await entityCodeEditor.saveAndClose();
   });

   test('Hide new entity', async () => {
      const diagramEditor = await app.openCompositeEditor('ExampleDWH/diagrams/ExampleDWH.system-diagram.cm', 'System Diagram');
      const renamedEntity = await diagramEditor.getEntity(RENAMED_ENTITY_LABEL);
      // Hide entity
      await diagramEditor.enableTool('Hide');
      await renamedEntity.click();
      await renamedEntity.waitFor({ state: 'detached' });
      // Verify that the entity was hidden as expected
      expect(await diagramEditor.findEntity(RENAMED_ENTITY_LABEL)).toBeUndefined();
      // Todo: Check if entity is actually hidden, i.e. can be shown again via toolbox
      await diagramEditor.saveAndClose();
   });

   test('Delete new entity', async () => {
      await explorer.activate();
      const entityFile = entityFileName(NEW_ENTITY_LABEL);
      await explorer.deleteNode(entityFile, true);
      // Todo: Check if entity is actually deleted, i.e. can not be shown again via toolbox
   });
});

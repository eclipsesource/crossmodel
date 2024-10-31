/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { expect, test } from '@eclipse-glsp/glsp-playwright';
import { CrossModelApp } from '../../page-objects/crossmodel-app';
import { CrossModelCompositeEditor } from '../../page-objects/crossmodel-composite-editor';
import { Entity } from '../../page-objects/system-diagram/diagram-elements';

test.describe('Cross Model System Diagram ', () => {
   let app: CrossModelApp;

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CrossModelApp.load({ browser, playwright, workspaceUrl: 'src/resources/mapping-example' });
   });

   test.afterAll(async () => {
      await app.page.close();
   });

   test.describe.serial('Entity Create/Edit/Delete', () => {
      test('create new entity via toolbox', async () => {
         const diagramEditor = await app
            .openEditor('ExampleDWH/diagrams/ExampleDWH.system-diagram.cm', CrossModelCompositeEditor)
            .then(ed => ed.switchToSystemDiagram());
         const graph = diagramEditor.diagram.graph;

         // Create new entity
         const entity = await graph.getNodeByLabel('CalcAge', Entity);
         await diagramEditor.diagram.enableTool('Create Entity');
         const taskBounds = await entity.bounds();
         await taskBounds.position('bottom_center').moveRelative(0, 100).click();
         // graph.waitForCreationOfType is currently not working, therefore we use a timeout
         await app.page.waitForTimeout(1000);

         // Verify that the entity was created as expected
         const newEntity = await graph.getNodeByLabel('NewEntity', Entity);
         expect(newEntity).toBeDefined();

         const explorer = await app.openExplorerView();
         expect(await explorer.existsFileNode('ExampleDWH/entities/NewEntity.entity.cm')).toBeTruthy();

         const entityCodeEditor = await app
            .openEditor('ExampleDWH/entities/NewEntity.entity.cm', CrossModelCompositeEditor)
            .then(ed => ed.switchToCodeEditor());
         expect(await entityCodeEditor.textContentOfLineByLineNumber(1)).toBe('entity:');
         expect(await entityCodeEditor.textContentOfLineByLineNumber(2)).toMatch('id: NewEntity');
         expect(await entityCodeEditor.textContentOfLineByLineNumber(3)).toMatch('name: "NewEntity');
      });

      test('Rename new entity via diagram label', async () => {
         const diagramEditor = await app
            .openEditor('ExampleDWH/diagrams/ExampleDWH.system-diagram.cm', CrossModelCompositeEditor)
            .then(ed => ed.switchToSystemDiagram());
         const graph = diagramEditor.diagram.graph;
         const newEntity = await graph.getNodeByLabel('NewEntity', Entity);
         // Rename new entity
         await newEntity.rename('NewEntityRenamed');

         expect(await newEntity.label).toBe('NewEntityRenamed');
         const entityCodeEditor = await app
            .openEditor('ExampleDWH/entities/NewEntity.entity.cm', CrossModelCompositeEditor)
            .then(ed => ed.switchToCodeEditor());
         expect(await entityCodeEditor.textContentOfLineByLineNumber(2)).toMatch('id: NewEntityRenamed');
         expect(await entityCodeEditor.textContentOfLineByLineNumber(3)).toMatch('name: "NewEntityRenamed');
      });

      test('Hide new entity', async () => {
         const diagramEditor = await app
            .openEditor('ExampleDWH/diagrams/ExampleDWH.system-diagram.cm', CrossModelCompositeEditor)
            .then(ed => ed.switchToSystemDiagram());
         const graph = diagramEditor.diagram.graph;
         // Hide entity
         const newEntity = await graph.getNodeByLabel('NewEntityRenamed', Entity);
         await diagramEditor.diagram.enableTool('Hide');
         await newEntity.click();
         expect((await graph.getNodes('NewEntityRenamed', Entity)).length).toBe(0);
         // Todo: Check if entity is actually hidden, i.e. can be shown again via toolbox
      });

      test('Delete new entity', async () => {
         const explorer = await app.openExplorerView();
         await explorer.deleteNode('ExampleDWH/entities/NewEntity.entity.cm', true);
         // Todo: Check if entity is actually deleted, i.e. can not be shown again via toolbox
      });
   });
});

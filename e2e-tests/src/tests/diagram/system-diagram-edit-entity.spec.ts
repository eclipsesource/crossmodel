/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { expect } from '@eclipse-glsp/glsp-playwright';
import test from '../../fixtures/crossmodel-fixture';
import { CrossModelCompositeEditor } from '../../page-objects/crossmodel-composite-editor';
import { Entity } from '../../page-objects/system-diagram/diagram-elements';
test.use({ workspaceUrl: 'src/resources/mapping-example' });

test.describe('System Diagram Edit Entity', () => {
   test('create/edit/delete entity', async ({ app, explorer }) => {
      // Setup: Open existing System Diagram
      let editor = await app.openEditor('ExampleDWH/diagrams/ExampleDWH.system-diagram.cm', CrossModelCompositeEditor);
      expect(editor).toBeDefined();
      let diagramEditor = await editor.switchToSystemDiagram();
      expect(diagramEditor).toBeDefined();
      const graph = diagramEditor.diagram.graph;
      const toolPalette = diagramEditor.diagram.toolPalette;
      await graph.waitForVisible();

      // Test: Create new entity
      const entity = await graph.getNodeByLabel('CalcAge', Entity);
      const paletteItem = await toolPalette.content.toolElement('default', 'Create Entity');
      await paletteItem.click();

      await expect(graph).toContainClass('node-creation-mode');

      const taskBounds = await entity.bounds();
      await taskBounds.position('bottom_center').moveRelative(0, 100).click();

      // graph.waitForCreationOfType is currently not working, therefore we use a timeout
      await app.page.waitForTimeout(1000);

      const newEntity = await graph.getNodeByLabel('NewEntity', Entity);
      expect(newEntity).toBeDefined();

      expect(await explorer.existsFileNode('ExampleDWH/entities/NewEntity.entity.cm')).toBeTruthy();

      let entityEditor = await app.openEditor('ExampleDWH/entities/NewEntity.entity.cm', CrossModelCompositeEditor);
      let codeEditor = await entityEditor.switchToCodeEditor();
      expect(await codeEditor.textContentOfLineByLineNumber(1)).toBe('entity:');
      expect(await codeEditor.textContentOfLineByLineNumber(2)).toMatch('id: NewEntity');
      expect(await codeEditor.textContentOfLineByLineNumber(3)).toMatch('name: "NewEntity');

      // Test:Rename entity
      editor = await app.openEditor('ExampleDWH/diagrams/ExampleDWH.system-diagram.cm', CrossModelCompositeEditor);
      diagramEditor = await editor.switchToSystemDiagram();
      await newEntity.rename('NewEntityRenamed');
      expect(await newEntity.label).toBe('NewEntityRenamed');

      entityEditor = await app.openEditor('ExampleDWH/entities/NewEntity.entity.cm', CrossModelCompositeEditor);
      codeEditor = await entityEditor.switchToCodeEditor();
      expect(await codeEditor.textContentOfLineByLineNumber(2)).toMatch('id: NewEntityRenamed');
      expect(await codeEditor.textContentOfLineByLineNumber(3)).toMatch('name: "NewEntityRenamed');

      // Test: Delete entity
      editor = await app.openEditor('ExampleDWH/diagrams/ExampleDWH.system-diagram.cm', CrossModelCompositeEditor);
      diagramEditor = await editor.switchToSystemDiagram();
      await newEntity.delete();
      expect((await graph.getNodes('NewEntityRenamed', Entity)).length).toBe(0);
      expect(await explorer.existsFileNode('ExampleDWH/entities/NewEntity.entity.cm')).toBeFalsy();

      // Missing: Pageobject for show entity
   });
});

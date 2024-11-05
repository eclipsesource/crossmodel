/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { OSUtil, normalizeId, urlEncodePath } from '@theia/playwright';
import { join } from 'path';
import { CMCompositeEditor, hasViewError } from '../cm-composite-editor';
import { IntegratedEditor } from '../cm-integrated-editor';
import { CMTheiaIntegration } from '../cm-theia-integration';
import { EntityPropertiesView } from '../form/entiy-form';
import { Entity } from './diagram-elements';
import { SystemDiagram } from './system-diagram';
import { SystemTools } from './system-tool-box';

export class IntegratedSystemDiagramEditor extends IntegratedEditor {
   diagram: SystemDiagram;
   constructor(filePath: string, parent: CMCompositeEditor, tabSelector: string) {
      super(
         {
            tabSelector,
            viewSelector: normalizeId(
               `#system-diagram:file://${urlEncodePath(join(parent.app.workspace.escapedPath, OSUtil.fileSeparator, filePath))}`
            )
         },
         parent
      );
      this.diagram = this.createSystemDiagram(parent.app.integration);
   }

   override waitForVisible(): Promise<void> {
      return this.diagram.graph.waitForVisible();
   }

   protected createSystemDiagram(integration: CMTheiaIntegration): SystemDiagram {
      return new SystemDiagram({ type: 'integration', integration });
   }

   async hasError(errorMessage: string): Promise<boolean> {
      return hasViewError(this.page, this.viewSelector, errorMessage);
   }

   async enableTool(tool: SystemTools['default']): Promise<void> {
      const paletteItem = await this.diagram.toolPalette.content.toolElement('default', tool);
      return paletteItem.click();
   }

   async getEntity(entityLabel: string): Promise<Entity> {
      return this.diagram.graph.getNodeByLabel(entityLabel, Entity);
   }

   async findEntity(entityLabel: string): Promise<Entity | undefined> {
      const entities = await this.diagram.graph.getNodesByLabel(entityLabel, Entity);
      return entities.length > 0 ? entities[0] : undefined;
   }

   async selectEntityAndOpenProperties(entityLabel: string): Promise<EntityPropertiesView> {
      const entity = await this.diagram.graph.getNodeByLabel(entityLabel, Entity);
      await entity.select();
      return this.app.openView(EntityPropertiesView);
   }

   override isDirty(): Promise<boolean> {
      return this.parent.isDirty();
   }

   override isClosable(): Promise<boolean> {
      return this.parent.isClosable();
   }

   override closeWithoutSave(): Promise<void> {
      return this.parent.closeWithoutSave();
   }
}

/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import {
   ChildrenAccessor,
   Mix,
   ModelElementMetadata,
   NodeMetadata,
   PLabel,
   PModelElement,
   PNode,
   SVGMetadataUtils,
   defined,
   useClickableFlow,
   useCommandPaletteCapability,
   useDeletableFlow,
   useDraggableFlow,
   useHoverableFlow,
   usePopupCapability,
   useRenameableFlow,
   useResizeHandleCapability,
   useSelectableFlow
} from '@eclipse-glsp/glsp-playwright/';

const LabelHeaderMixin = Mix(PLabel).flow(useClickableFlow).flow(useRenameableFlow).build();

@ModelElementMetadata({
   type: 'label:entity'
})
export class LabelEntity extends LabelHeaderMixin {}

const EntityMixin = Mix(PNode)
   .flow(useClickableFlow)
   .flow(useHoverableFlow)
   .flow(useDeletableFlow)
   .flow(useDraggableFlow)
   .flow(useRenameableFlow)
   .flow(useSelectableFlow)
   .capability(useResizeHandleCapability)
   .capability(usePopupCapability)
   .capability(useCommandPaletteCapability)
   .build();

@NodeMetadata({
   type: 'node:entity'
})
export class Entity extends EntityMixin {
   override readonly children = new EntityChildren(this);

   get label(): Promise<string> {
      return this.children.label().then(label => label.textContent());
   }
}

export class EntityChildren extends ChildrenAccessor {
   async label(): Promise<LabelEntity> {
      return this.ofType(LabelEntity, { selector: SVGMetadataUtils.typeAttrOf(LabelEntity) });
   }

   async attributes(): Promise<Attribute[]> {
      return this.allOfType(Attribute);
   }
}

@ModelElementMetadata({
   type: 'comp:attribute'
})
export class Attribute extends PModelElement {
   async name(): Promise<string> {
      return defined(await this.locate().locator('.attribute').textContent());
   }

   async datatype(): Promise<string> {
      return defined(await this.locate().locator('.datatype').textContent());
   }
}

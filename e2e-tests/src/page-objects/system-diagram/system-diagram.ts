/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import {
   asLocator,
   GLSPAppOptions,
   GLSPSemanticApp,
   GLSPSemanticGraph,
   GraphConstructorOptions,
   isEqualLocatorType,
   isPEdgeConstructor,
   isPNodeConstructor,
   PMetadata,
   PModelElement,
   PModelElementConstructor,
   PNode,
   PNodeConstructor
} from '@eclipse-glsp/glsp-playwright';
import { Locator } from '@playwright/test';
import { SystemToolBox, SystemTools } from './system-tool-box';

export class SystemDiagram extends GLSPSemanticApp {
   override readonly toolPalette: SystemToolBox;
   override readonly graph: SystemDiagramGraph;

   constructor(options: GLSPAppOptions) {
      super(options);
      this.toolPalette = this.createToolPalette();
      this.graph = this.createGraph(options);
   }

   protected override createGraph(_options: GLSPAppOptions): SystemDiagramGraph {
      return new SystemDiagramGraph({ locator: SystemDiagramGraph.locate(this) });
   }

   protected override createToolPalette(): SystemToolBox {
      return new SystemToolBox({ locator: SystemToolBox.locate(this) });
   }

   async enableTool(tool: SystemTools['default']): Promise<void> {
      const paletteItem = await this.toolPalette.content.toolElement('default', tool);
      return paletteItem.click();
   }
}

export class SystemDiagramGraph extends GLSPSemanticGraph {
   // Temporary fix. The base getNodes methods does not account for "." in ids. The will be falsy treated as class selectors.
   override async getNodes<TElement extends PNode>(
      selectorOrLocator: string | Locator,
      constructor: PNodeConstructor<TElement>,
      options?: GraphConstructorOptions
   ): Promise<TElement[]> {
      const locator = asLocator(selectorOrLocator, selector => this.locator.child(selector).locate());
      const elements: TElement[] = [];

      for await (const childLocator of await locator.all()) {
         if ((await childLocator.count()) > 0) {
            const id = await childLocator.getAttribute('id');
            // eslint-disable-next-line no-null/no-null
            if (id !== null && (await isEqualLocatorType(childLocator, constructor))) {
               elements.push(await this.getNode(`id=${id}`, constructor, options));
            }
         }
      }

      return elements;
   }

   // Temporary fix. The base getNodes methods does not account for "." in ids. The will be falsy treated as class selectors.
   override async waitForCreationOfType<TElement extends PModelElement>(
      constructor: PModelElementConstructor<TElement>,
      creator: () => Promise<void>
   ): Promise<TElement[]> {
      const elementType = PMetadata.getType(constructor);

      const ids = await this.waitForCreation(elementType, creator);

      let retriever = this.getModelElement.bind(this);
      if (isPNodeConstructor(constructor)) {
         retriever = this.getNode.bind(this) as any;
      } else if (isPEdgeConstructor(constructor)) {
         retriever = this.getEdge.bind(this) as any;
      }

      return Promise.all(ids.map(id => retriever(`id=${id}`, constructor)));
   }
}

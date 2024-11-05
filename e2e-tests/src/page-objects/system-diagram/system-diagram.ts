/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import {
   asLocator,
   definedAttr,
   EdgeSearchOptions,
   GLSPAppOptions,
   GLSPIntegrationOptions,
   GLSPSemanticApp,
   GLSPSemanticGraph,
   GraphConstructorOptions,
   isEqualLocatorType,
   isPEdgeConstructor,
   isPNodeConstructor,
   PEdge,
   PEdgeConstructor,
   PMetadata,
   PModelElement,
   PModelElementConstructor,
   PNode,
   PNodeConstructor,
   SVGMetadata,
   SVGMetadataUtils,
   TypedEdge
} from '@eclipse-glsp/glsp-playwright';
import { Locator } from '@playwright/test';
import { SystemToolBox } from './system-tool-box';

export class SystemDiagram extends GLSPSemanticApp {
   override readonly toolPalette: SystemToolBox;
   override readonly graph: SystemDiagramGraph;

   constructor(options: GLSPIntegrationOptions) {
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
}

export class SystemDiagramGraph extends GLSPSemanticGraph {
   // Temporary fix. The base getNodes methods does not account for "." in ids. The will be falsy treated as class selectors.
   override async getEdgesOfType<TElement extends PEdge, TOptions extends EdgeSearchOptions>(
      constructor: PEdgeConstructor<TElement>,
      options?: TOptions
   ): Promise<TypedEdge<TElement, TOptions>[]> {
      const elements: TypedEdge<TElement, TOptions>[] = [];

      let query = SVGMetadataUtils.typeAttrOf(constructor);
      if (options?.sourceId) {
         query += `[${SVGMetadata.Edge.sourceId}="${options.sourceId}"]`;
      } else if (options?.targetId) {
         query += `[${SVGMetadata.Edge.targetId}="${options.targetId}"]`;
      }

      for await (const locator of await this.locate().locator(query).all()) {
         const id = await locator.getAttribute('id');
         // eslint-disable-next-line no-null/no-null
         if (id !== null && (await isEqualLocatorType(locator, constructor))) {
            const element = await this.getEdge(`id=${id}`, constructor, options);
            const sourceChecks = [];
            const targetChecks = [];

            if (options?.sourceConstructor) {
               const sourceId = await element.sourceId();
               sourceChecks.push(
                  (await this.locate()
                     .locator(`[id$="${sourceId}"]${SVGMetadataUtils.typeAttrOf(options.sourceConstructor)}`)
                     .count()) > 0
               );
            }

            if (options?.targetConstructor) {
               const targetId = await element.targetId();
               targetChecks.push(
                  (await this.locate()
                     .locator(`[id$="${targetId}"]${SVGMetadataUtils.typeAttrOf(options.targetConstructor)}`)
                     .count()) > 0
               );
            }

            if (options?.sourceSelectorOrLocator) {
               const sourceLocator = asLocator(options.sourceSelectorOrLocator, selector => this.locate().locator(selector));
               const sourceId = await element.sourceId();
               const expectedId = await definedAttr(sourceLocator, 'id');
               sourceChecks.push(expectedId.includes(sourceId));
            }

            if (options?.targetSelectorOrLocator) {
               const targetLocator = asLocator(options.targetSelectorOrLocator, selector => this.locate().locator(selector));
               const targetId = await element.targetId();
               const expectedId = await definedAttr(targetLocator, 'id');
               sourceChecks.push(expectedId.includes(targetId));
            }

            if (sourceChecks.every(c => c) && targetChecks.every(c => c)) {
               elements.push(element);
            }
         }
      }

      return elements;
   }

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

   // Temporary fix. The base getNodes methods does not account for "." in ids. The will be falsy treated as class selectors.
   override async getModelElements<TElement extends PModelElement>(
      selectorOrLocator: string | Locator,
      constructor: PModelElementConstructor<TElement>,
      options?: GraphConstructorOptions
   ): Promise<TElement[]> {
      super.getModelElements;
      const locator = asLocator(selectorOrLocator, selector => this.locator.child(selector).locate());
      const elements: TElement[] = [];

      for await (const childLocator of await locator.all()) {
         if ((await childLocator.count()) > 0) {
            const id = await childLocator.getAttribute('id');
            // eslint-disable-next-line no-null/no-null
            if (id !== null && (await isEqualLocatorType(childLocator, constructor))) {
               elements.push(await this.getModelElement(`id=${id}`, constructor, options));
            }
         }
      }

      return elements;
   }
}

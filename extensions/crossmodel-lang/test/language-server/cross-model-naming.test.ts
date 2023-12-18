/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { describe, expect, test } from '@jest/globals';
import { EmptyFileSystem } from 'langium';
import { createCrossModelServices } from '../../src/language-server/cross-model-module.js';
import { CrossModelRoot, DiagramNode } from '../../src/language-server/generated/ast.js';
import { parseDocument } from './test-utils/utils.js';

const services = createCrossModelServices({ ...EmptyFileSystem });
const cmServices = services.CrossModel;

const ex1 = 'diagram:';
const ex2 = `diagram:
    nodes:
        - id: nodeA`;
const ex3 = `diagram:
    nodes:
        - id: nodeA
        - id: nodeA1`;
const ex4 = `diagram:
    nodes:
        - id: nodeA
        - id: nodeA1
        - id: nodeA2
        - id: nodeA4`;

describe('NameUtil', () => {
   describe('findAvailableNodeName', () => {
      test('should return given name if unique', async () => {
         const document = await parseDocument<CrossModelRoot>(cmServices, ex1);

         expect(cmServices.references.IdProvider.findNextId(DiagramNode, 'nodeA', document.parseResult.value.diagram!)).toBe('nodeA');
      });

      test('should return unique name if given is taken', async () => {
         const document = await parseDocument<CrossModelRoot>(cmServices, ex2);

         const result = cmServices.references.IdProvider.findNextId(DiagramNode, 'nodeA', document.parseResult.value.diagram!);

         expect(result).toBe('nodeA1');
      });

      test('should properly count up if name is taken', async () => {
         const document = await parseDocument<CrossModelRoot>(cmServices, ex3);

         expect(cmServices.references.IdProvider.findNextId(DiagramNode, 'nodeA', document.parseResult.value.diagram!)).toBe('nodeA2');
      });

      test('should find lowest count if multiple are taken', async () => {
         const document = await parseDocument<CrossModelRoot>(cmServices, ex4);

         expect(cmServices.references.IdProvider.findNextId(DiagramNode, 'nodeA', document.parseResult.value.diagram!)).toBe('nodeA3');
      });
   });
});

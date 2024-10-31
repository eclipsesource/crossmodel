/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { expect } from '@eclipse-glsp/glsp-playwright';
import test from '../fixtures/crossmodel-fixture';

test.describe('CrossModel App', () => {
   test('main content panel visible', async ({ app }) => {
      expect(await app.isMainContentPanelVisible()).toBe(true);
   });
});

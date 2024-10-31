/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { expect, test } from '@playwright/test';
import { CrossModelApp } from '../page-objects/crossmodel-app';

test.describe('CrossModel App', () => {
   let app: CrossModelApp;

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CrossModelApp.load({ browser, playwright });
   });

   test('main content panel visible', async () => {
      expect(await app.isMainContentPanelVisible()).toBe(true);
   });
});

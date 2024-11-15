/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { TheiaApp, TheiaExplorerView } from '@theia/playwright';
import { CMMTabBarToolbar } from './cm-tab-bar-toolbar';

export class CMExplorerView extends TheiaExplorerView {
   public readonly tabBarToolbar: CMMTabBarToolbar;

   constructor(app: TheiaApp) {
      super(app);
      this.tabBarToolbar = new CMMTabBarToolbar(this);
   }
}

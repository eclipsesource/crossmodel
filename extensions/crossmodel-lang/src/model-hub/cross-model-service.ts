/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { ModelManager } from '@eclipse-emfcloud/model-manager';

export interface CrossModelService {
   // TODO
   doSomething(): Promise<void>;
}

export class CrossModelServiceImpl implements CrossModelService {
   private modelManager: ModelManager<string> | undefined;

   setModelManager(modelManager: ModelManager<string>): void {
      this.modelManager = modelManager;
   }

   // TODO
   async doSomething(): Promise<void> {
      console.log('Doing something');
   }

   async executeChange(): Promise<void> {
      // Do changes to model hub model...
   }

   async discardModelChanges(): Promise<void> {
      // TODO restore persisted version
   }
}

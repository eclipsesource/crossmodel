/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { ModelManager, PatchCommand } from '@eclipse-emfcloud/model-manager';
import { AbstractModelServiceContribution, ModelHub, ModelPersistenceContribution } from '@eclipse-emfcloud/model-service';
import { compare } from 'fast-json-patch';
import { injectable, postConstruct } from 'inversify';
import { CrossModelServiceImpl } from './cross-model-service.js';

export const CROSS_MODEL_KEY = 'crossmodel';

@injectable()
export class CrossModelContribution extends AbstractModelServiceContribution {
   // FIXME Language Server Type is incorrect; we need to clarify which type
   // we want to use for ModelHub / LanguageServer communication. Should we use
   // the OpenTextDocumentManager directly, or introduce a service for this?
   @inject(CrossModelServer) private server: CrossModelServer;

   crossModelService: CrossModelServiceImpl | undefined;
   constructor() {
      super();
   }

   @postConstruct()
   protected init(): void {
      this.initialize({
         id: CROSS_MODEL_KEY,
         persistenceContribution: new CrossModelPersistenceContribution(this.server)
      });
      this.crossModelService = new CrossModelServiceImpl();
   }

   override setModelManager(modelManager: ModelManager<string>): void {
      super.setModelManager(modelManager);
      this.crossModelService?.setModelManager(modelManager);
      (this.persistenceContribution as CrossModelPersistenceContribution).modelManager = modelManager;
   }

   override setModelHub(modelHub: ModelHub<string, unknown>): void {
      super.setModelHub(modelHub);
      (this.persistenceContribution as CrossModelPersistenceContribution).modelHub = modelHub;
   }

   override getModelService<S>(): S {
      return this.crossModelService as unknown as S;
   }
}

class CrossModelPersistenceContribution implements ModelPersistenceContribution {
   public modelHub: ModelHub<string, unknown> | undefined;
   public modelManager: ModelManager<string> | undefined;

   constructor(private modelServer: CrossModelServer) {
      // Empty
   }

   async canHandle(_modelId: string): Promise<boolean> {
      return true;
   }

   async loadModel(modelId: string): Promise<object> {
      const model = await this.modelServer.getModel(modelId);
      if (model === undefined) {
         throw new Error('Failed to load model: ' + modelId);
      }

      this.modelServer.onUpdate(modelId, async (newModel: unknown) => {
         try {
            const currentModel = await this.modelHub?.getModel(modelId);
            if (currentModel === undefined) {
               throw new Error('Failed to retrieve model: ' + modelId);
            }
            if (typeof newModel !== 'object' || !newModel) {
               throw new Error('Invalid model type');
            }
            const diff = compare(currentModel, newModel);
            if (diff.length === 0) {
               return;
            }
            const commandStack = this.modelManager?.getCommandStack(modelId);
            const updateCommand = new PatchCommand<string>('Update Model', modelId, diff);
            commandStack?.execute(updateCommand);
         } catch (error) {
            console.error('CrossModelPersistenceContribution: Failed to synchronize model with CrossModelServer', error);
         }
      });

      return model;
   }

   async saveModel(modelId: string, model: object): Promise<boolean> {
      try {
         await this.modelServer.save(modelId, model);
      } catch (error) {
         console.error('Failed to save model' + modelId, error);
         return false;
      }
      return true;
   }
}

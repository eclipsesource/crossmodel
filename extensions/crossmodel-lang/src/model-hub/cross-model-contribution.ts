/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { isCrossModelRoot } from '@crossbreeze/protocol';
import { ModelManager, PatchCommand } from '@eclipse-emfcloud/model-manager';
import { AbstractModelServiceContribution, ModelHub, ModelPersistenceContribution } from '@eclipse-emfcloud/model-service';
import { compare } from 'fast-json-patch';
import { inject, injectable, postConstruct } from 'inversify';
import { CrossModelRoot } from '../language-server/generated/ast.js';
import { ModelService } from '../model-server/model-service.js';
import { CrossModelServiceImpl } from './cross-model-service.js';

export const CROSS_MODEL_KEY = 'crossmodel';

@injectable()
export class CrossModelContribution extends AbstractModelServiceContribution {
   @inject(ModelService)
   private languageServer!: ModelService;

   private crossModelService!: CrossModelServiceImpl;

   constructor() {
      super();
   }

   @postConstruct()
   protected init(): void {
      this.initialize({
         id: CROSS_MODEL_KEY,
         persistenceContribution: new CrossModelPersistenceContribution(this.languageServer)
      });
      this.crossModelService = new CrossModelServiceImpl();
   }

   override setModelManager(modelManager: ModelManager<string>): void {
      super.setModelManager(modelManager);
      this.crossModelService?.setModelManager(modelManager);
      (this.persistenceContribution as CrossModelPersistenceContribution).modelManager = modelManager;
   }

   override setModelHub(modelHub: ModelHub<string, string>): void {
      super.setModelHub(modelHub);
      (this.persistenceContribution as CrossModelPersistenceContribution).modelHub = modelHub;
   }

   override getModelService<S>(): S {
      return this.crossModelService as unknown as S;
   }
}

// Currently using a hard-coded value for every change coming
// through the model hub, as we don't have a way to determine
// who triggered the change.
// TODO Consider if we need to be more specific.
const MODEL_HUB_CLIENT_ID = 'model-hub';

class CrossModelPersistenceContribution implements ModelPersistenceContribution<string, CrossModelRoot> {
   public modelHub!: ModelHub<string, string>;
   public modelManager!: ModelManager<string>;

   constructor(private languageServer: ModelService) {
      // Empty
   }

   async canHandle(_modelId: string): Promise<boolean> {
      return true;
   }

   async loadModel(modelId: string): Promise<CrossModelRoot> {
      if (!this.languageServer.isOpen(modelId)) {
         await this.languageServer.open({ uri: modelId, clientId: MODEL_HUB_CLIENT_ID });
      }
      const document = await this.languageServer.request(modelId);
      if (document === undefined) {
         throw new Error('Failed to load model: ' + modelId);
      }

      this.languageServer.onModelUpdated(modelId, async event => {
         try {
            const updatedDocument = event.document;
            const newModel = updatedDocument.root;
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

      const subscription = this.modelHub.subscribe(modelId);
      subscription.onModelChanged = (changedModelId: string, newModel: object) => {
         if (!isCrossModelRoot(newModel)) {
            console.error(`Invalid model type: ${typeof newModel}`);
            return;
         }
         this.languageServer.update({ uri: changedModelId, clientId: MODEL_HUB_CLIENT_ID, model: newModel });
      };
      subscription.onModelUnloaded = (unloadedModelId: string) => {
         if (modelId === unloadedModelId) {
            subscription.close();
         }
      };

      return document.root;
   }

   async saveModel(modelId: string, model: CrossModelRoot): Promise<boolean> {
      if (!isCrossModelRoot(model)) {
         console.log(`Unable to save model ${modelId}: Not a CrossModelRoot`);
         return false;
      }
      try {
         await this.languageServer.save({ uri: modelId, clientId: MODEL_HUB_CLIENT_ID, model });
      } catch (error) {
         console.error('Failed to save model' + modelId, error);
         return false;
      }
      return true;
   }
}

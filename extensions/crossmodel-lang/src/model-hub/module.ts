/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { AstLanguageModelConverter, AstLanguageServer } from '@eclipse-emfcloud/model-language-server';
import { ModelHubContext } from '@eclipse-emfcloud/model-service-theia/lib/common/context-model-hub.js';
import { ModelHubProtocolServicePath } from '@eclipse-emfcloud/model-service-theia/lib/common/model-hub-protocol.js';
import { ModelHubProvider, ModelServiceContribution } from '@eclipse-emfcloud/model-service-theia/lib/node';
import modelHubTheiaModule from '@eclipse-emfcloud/model-service-theia/lib/node/backend-module.js';
import { unbindConnectionHandler } from '@eclipse-emfcloud/theia-core/lib/node/unbind-helper.js';
import { Stopwatch } from '@theia/core/lib/common/index.js';
import { loggerBackendModule } from '@theia/core/lib/node/logger-backend-module.js';
import { NodeStopwatch } from '@theia/core/lib/node/performance/index.js';
import { Container, ContainerModule } from '@theia/core/shared/inversify';
import { CrossModelLSPServices } from '../integration.js';
import { ModelService } from '../model-server/model-service.js';
import { CrossModelContribution } from './cross-model-contribution.js';

/**
 * Constant for the context of the model hub.
 */
export const CROSS_MODEL_CONTEXT = 'crossmodel';

export const modelHubModule = new ContainerModule(bind => {
   bind(ModelHubContext).toConstantValue(CROSS_MODEL_CONTEXT);
   bind(ModelServiceContribution).to(CrossModelContribution);
});

export function createModelHubIntegrationModule(services: CrossModelLSPServices): ContainerModule {
   return new ContainerModule(bind => {
      // TODO Implement missing shared services
      bind(AstLanguageServer).toConstantValue(services.shared.client.AstLanguageServer);
      bind(AstLanguageModelConverter).toConstantValue(services.shared.client.AstLanguageModelConverter);
      // TODO ModelService binding (currently not injectable)
      bind(ModelService).toConstantValue(modelService);
   });
}

/**
 * Create an Inversify container that includes Model Hub classes and
 * required dependencies from the AddedSharedModelServices.
 * @param shared
 * @returns
 */
export function createModelHubContainer(services: CrossModelLSPServices): Container {
   const container = new Container({ autoBindInjectable: true });

   container.load(modelHubModule, modelHubTheiaModule.default, createModelHubIntegrationModule(services), loggerBackendModule);
   container.bind(Stopwatch).to(NodeStopwatch).inSingletonScope();

   // remove ConnectionHandler for modelhub. We will use a Proxy instead.
   unbindConnectionHandler(container, ModelHubProtocolServicePath);
   // initialize
   const modelHubManager = container.get<ModelHubProvider>(ModelHubProvider);
   modelHubManager(CROSS_MODEL_CONTEXT);

   return container;
}

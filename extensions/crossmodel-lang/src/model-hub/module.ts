/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { ModelServiceContribution } from '@eclipse-emfcloud/model-service-theia/lib/node';
import { ContainerModule } from 'inversify';
import { ModelService } from '../model-server/model-service.js';
import { CrossModelContribution } from './cross-model-contribution.js';

export const crossModelModule = new ContainerModule(bind => {
   bind(ModelService).toConstantValue(modelService);
   bind(ModelServiceContribution).to(CrossModelContribution);
});

/********************************************************************************
 * Copyright (c) 2023 EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0, or the MIT License which is
 * available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: EPL-2.0 OR MIT
 ********************************************************************************/

import { ConnectionHandler, RpcConnectionHandler } from '@theia/core';
import { Container, interfaces } from '@theia/core/shared/inversify';

export const unbindConnectionHandler = (container: interfaces.Container, path: string) => {
  // initialize cache
  container.getAll<ConnectionHandler>(ConnectionHandler);
  const bindings = (container as Container)['_bindingDictionary'].get(ConnectionHandler) as interfaces.Binding<ConnectionHandler>[];
  const oldBindingIndex = bindings.findIndex(b => {
    if (b.cache instanceof RpcConnectionHandler) {
      return b.cache.path === path;
    }
    return false;
  });
  if (oldBindingIndex !== -1) {
    bindings.splice(oldBindingIndex, 1);
  }
};

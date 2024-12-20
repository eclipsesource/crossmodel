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
module.exports = {
  root: true,
  extends: ['../../.eslintrc.js'],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: [__dirname + '/tsconfig.json']
      },
      node: {
        extensions: ['.js']
      }
    }
  }
};

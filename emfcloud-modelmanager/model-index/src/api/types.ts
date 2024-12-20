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

export interface NodeInfo {
  /** URI to the document containing the referenced element. */
  $documentUri: string;
  /** Navigation path inside the document */
  $path: string;
  /** `$type` property value */
  $type: string;

  [x: string]: unknown;
}

export function isNodeInfo(obj: unknown): obj is NodeInfo {
  return typeof obj === 'object' && !!obj && '$type' in obj && '$documentUri' in obj && '$path' in obj;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly height: number;
  readonly width: number;
}

/** Simplified version of the AstNodeDescription to serialize resolved references. */
export interface NodeReferenceInfo extends NodeInfo {
  /** Name of element */
  $name: string;
}

export function isNodeReferenceInfo(obj: unknown): obj is NodeReferenceInfo {
  return typeof obj === 'object' && !!obj && '$type' in obj && '$name' in obj && '$path' in obj;
}

export interface ReferenceError {
  /** Name of element */
  $refText: string;
  $error: string;
}

export function isReferenceError(obj: unknown): obj is ReferenceError {
  return typeof obj === 'object' && !!obj && '$error' in obj && '$refText' in obj;
}

export type ReferenceInfo = NodeReferenceInfo | ReferenceError;

export function isReferenceInfo(obj: unknown): obj is ReferenceInfo {
  return isNodeReferenceInfo(obj) || isReferenceError(obj);
}

export type Reference<T> = Partial<NodeReferenceInfo> &
  Partial<ReferenceError> & {
    element(): Promise<T | undefined>;
    error(): string | undefined;
  };

export type ReferenceFactory<T> = (info: ReferenceInfo) => Reference<T>;

export abstract class BaseReference<T> implements Reference<T> {
  $type?: string;
  $name?: string;
  $documentUri?: string;
  $path?: string;
  $refText?: string;
  $error?: string;
  [x: string]: unknown;

  constructor(protected info: ReferenceInfo) {
    Object.assign(this, info);
  }

  error(): string | undefined {
    return this.$error;
  }

  abstract element(): Promise<T | undefined>;
}

export class ResolvedReference<T> extends BaseReference<T> {
  constructor(info: ReferenceInfo, protected resolved: T) {
    super(info);
  }

  override async element(): Promise<T | undefined> {
    return this.resolved;
  }
}

export class UnknownReference<T> extends BaseReference<T> {
  constructor(error = 'Element cannot be resolved') {
    super({ $error: error, $refText: 'unknown' });
  }

  override async element(): Promise<T | undefined> {
    return undefined;
  }
}

export interface ReferenceResolver {
  resolve<T>(reference: NodeReferenceInfo): Promise<T | undefined>;
}

export namespace ReferenceResolver {
  export function empty(): ReferenceResolver {
    return {
      resolve: async <T>(_reference: NodeReferenceInfo): Promise<T | undefined> => undefined
    };
  }
}

export class ResolvableReference<T> extends BaseReference<T> {
  private _element?: T;

  constructor(info: ReferenceInfo, protected resolver: ReferenceResolver) {
    super(info);
  }

  override async element(): Promise<T | undefined> {
    if (this._element) {
      // already resolved
      return this._element;
    }
    if (isNodeReferenceInfo(this.info)) {
      // we need to resolve
      this._element = await this.resolver.resolve(this.info);
    }
    return this._element;
  }
}

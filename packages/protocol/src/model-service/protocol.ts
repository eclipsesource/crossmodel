/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import * as rpc from 'vscode-jsonrpc/node';

export const CrossModelRegex = {
   STRING: /^"[^"]*"$|^'[^']*'$/,
   NUMBER: /^(-)?[0-9]+(\.[0-9]*)?$/,
   SL_COMMENT: /^#[^\n\r]*$/,
   ID: /^[_a-zA-Z][\w_\-~$#@/\d$]*$/
};

/**
 * Serialized version of the semantic model generated by Langium.
 */

export interface CrossModelElement {
   readonly $type: string;
}

export interface Identifiable {
   id: string;
   $globalId: string;
}

export interface CrossModelRoot extends CrossModelElement {
   readonly $type: 'CrossModelRoot';
   entity?: Entity;
   relationship?: Relationship;
}

export function isCrossModelRoot(model?: any): model is CrossModelRoot {
   return !!model && model.$type === 'CrossModelRoot';
}

export const EntityType = 'Entity';
export interface Entity extends CrossModelElement, Identifiable {
   readonly $type: typeof EntityType;
   attributes: Array<EntityAttribute>;
   description?: string;
   name?: string;
}

export const EntityAttributeType = 'EntityAttribute';
export interface EntityAttribute extends CrossModelElement, Identifiable {
   readonly $type: typeof EntityAttributeType;
   datatype?: string;
   description?: string;
   name?: string;
}

export const RelationshipType = 'Relationship';
export interface Relationship extends CrossModelElement, Identifiable {
   readonly $type: typeof RelationshipType;
   attributes: Array<RelationshipAttribute>;
   child?: string;
   description?: string;
   name?: string;
   parent?: string;
   type?: string;
}

export const RelationshipAttributeType = 'RelationshipAttribute';
export interface RelationshipAttribute extends CrossModelElement {
   readonly $type: typeof RelationshipAttributeType;
   parent?: string;
   child?: string;
}

export const MappingType = 'Mapping';
export const TargetObjectType = 'TargetObject';

export interface ClientModelArgs {
   uri: string;
   clientId: string;
}

export interface OpenModelArgs extends ClientModelArgs {
   languageId?: string;
}

export interface CloseModelArgs extends ClientModelArgs {}

export interface UpdateModelArgs<T> extends ClientModelArgs {
   model: T | string;
}

export interface SaveModelArgs<T> extends ClientModelArgs {
   model: T | string;
}

export interface ModelUpdatedEvent<T> {
   uri: string;
   model: T;
   sourceClientId: string;
   reason: 'changed' | 'deleted' | 'updated' | 'saved';
}

export interface ModelSavedEvent<T> {
   uri: string;
   model: T;
   sourceClientId: string;
}

/**
 * A context to describe a cross reference to retrieve reachable elements.
 */
export interface CrossReferenceContext {
   /**
    * The container from which we want to query the reachable elements.
    */
   container: CrossReferenceContainer;
   /**
    * Synthetic elements starting from the container to further narrow down the cross reference.
    * This is useful for elements that are being created or if the element cannot be identified.
    */
   syntheticElements?: SyntheticElement[];
   /**
    * The property of the element referenced through the source container and the optional synthetic
    * elements for which we should retrieve the reachable elements.
    */
   property: string;
}
export interface RootElementReference {
   uri: string;
}
export function isRootElementReference(object: unknown): object is RootElementReference {
   return !!object && typeof object === 'object' && 'uri' in object && typeof object.uri === 'string';
}
export interface GlobalElementReference {
   globalId: string;
   type?: string;
}
export function isGlobalElementReference(object: unknown): object is GlobalElementReference {
   return !!object && typeof object === 'object' && 'globalId' in object && typeof object.globalId === 'string';
}
export interface SyntheticDocument {
   uri: string;
   type: string;
}
export function isSyntheticDocument(object: unknown): object is SyntheticDocument {
   return (
      !!object &&
      typeof object === 'object' &&
      'uri' in object &&
      typeof object.uri === 'string' &&
      'type' in object &&
      typeof object.type === 'string'
   );
}
export type CrossReferenceContainer = RootElementReference | GlobalElementReference | SyntheticDocument;

export interface SyntheticElement {
   type: string;
   property: string;
}
export function isSyntheticElement(object: unknown): object is SyntheticElement {
   return (
      !!object &&
      typeof object === 'object' &&
      'type' in object &&
      typeof object.type === 'string' &&
      'property' in object &&
      typeof object.property === 'string'
   );
}
export interface ReferenceableElement {
   uri: string;
   type: string;
   label: string;
}

export interface CrossReference {
   /**
    * The container from which we want to resolve the reference.
    */
   container: CrossReferenceContainer;
   /**
    * The property for which we want to resolve the reference.
    */
   property: string;
   /**
    * The textual value of the reference we are resolving.
    */
   value: string;
}

export interface ResolvedElement<T extends Element = Element> {
   uri: string;
   model: CrossModelRoot;
   match?: T;
}

export interface ModelUpdatedEvent<T> {
   uri: string;
   model: T;
   sourceClientId: string;
   reason: 'changed' | 'deleted' | 'updated' | 'saved';
}

export interface SystemInfoArgs {
   contextUri: string;
}

export interface SystemInfo {
   id: string;
   name: string;
   directory: string;
   packageFilePath: string;
   modelFilePaths: string[];
}

export interface SystemUpdatedEvent {
   system: SystemInfo;
   reason: 'added' | 'removed';
}
export type SystemUpdateListener = (event: SystemUpdatedEvent) => void | Promise<void>;

export const OpenModel = new rpc.RequestType1<OpenModelArgs, CrossModelRoot | undefined, void>('server/open');
export const CloseModel = new rpc.RequestType1<CloseModelArgs, void, void>('server/close');
export const RequestModel = new rpc.RequestType1<string, CrossModelRoot | undefined, void>('server/request');
export const RequestModelDiagramNode = new rpc.RequestType2<string, string, Element | undefined, void>('server/requestModelDiagramNode');

export const FindReferenceableElements = new rpc.RequestType1<CrossReferenceContext, ReferenceableElement[], void>('server/complete');
export const ResolveReference = new rpc.RequestType1<CrossReference, ResolvedElement | undefined, void>('server/resolve');

export const UpdateModel = new rpc.RequestType1<UpdateModelArgs<CrossModelRoot>, CrossModelRoot, void>('server/update');
export const SaveModel = new rpc.RequestType1<SaveModelArgs<CrossModelRoot>, void, void>('server/save');
export const OnModelSaved = new rpc.NotificationType1<ModelSavedEvent<CrossModelRoot>>('server/onSave');
export const OnModelUpdated = new rpc.NotificationType1<ModelUpdatedEvent<CrossModelRoot>>('server/onUpdated');

export const RequestSystemInfos = new rpc.RequestType1<void, SystemInfo[], void>('server/systems');
export const RequestSystemInfo = new rpc.RequestType1<SystemInfoArgs, SystemInfo | undefined, void>('server/system');
export const OnSystemsUpdated = new rpc.NotificationType1<SystemUpdatedEvent>('server/onSystemsUpdated');

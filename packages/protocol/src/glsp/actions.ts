/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { Action, Operation, Point, hasArrayProp, hasObjectProp, hasStringProp } from '@eclipse-glsp/protocol';

export interface DropEntityOperation extends Operation {
   kind: typeof DropEntityOperation.KIND;

   /** Insert position for dropped entities. */
   position: Point;
   /** List of file paths that contain entities to be added.  */
   filePaths: string[];
}

export namespace DropEntityOperation {
   export const KIND = 'dropEntityOperation';

   export function is(object: any): object is DropEntityOperation {
      return Operation.hasKind(object, KIND) && hasArrayProp(object, 'filePaths') && hasObjectProp(object, 'position');
   }

   export function create(filePaths: string[], position: Point): DropEntityOperation {
      return {
         kind: KIND,
         isOperation: true,
         filePaths,
         position
      };
   }
}

export interface AddEntityOperation extends Operation {
   kind: typeof AddEntityOperation.KIND;

   /** Insert position for dropped entities. */
   position: Point;
   /** Name of the entity to be added. */
   entityName: string;
}

export namespace AddEntityOperation {
   export const KIND = 'addEntityOperation';

   export function is(object: any): object is AddEntityOperation {
      return Operation.hasKind(object, KIND) && hasStringProp(object, 'entityName') && hasObjectProp(object, 'position');
   }

   export function create(entityName: string, position: Point): AddEntityOperation {
      return {
         kind: KIND,
         isOperation: true,
         entityName,
         position
      };
   }
}

export interface AddSourceObjectOperation extends Operation {
   kind: typeof AddSourceObjectOperation.KIND;

   /** Insert position for dropped entities. */
   position: Point;
   /** Name of the entity to be added. */
   entityName: string;
}

export namespace AddSourceObjectOperation {
   export const KIND = 'addSourceObjectOperation';

   export function is(object: any): object is AddSourceObjectOperation {
      return Operation.hasKind(object, KIND) && hasStringProp(object, 'entityName') && hasObjectProp(object, 'position');
   }

   export function create(entityName: string, position: Point): AddSourceObjectOperation {
      return {
         kind: KIND,
         isOperation: true,
         entityName,
         position
      };
   }
}

// Copy definitions from (default) client-local glsp tool actions that we want to send from the server as well
export interface EnableToolsAction extends Action {
   kind: typeof EnableToolsAction.KIND;
   toolIds: string[];
}

export namespace EnableToolsAction {
   export const KIND = 'enable-tools';

   export function is(object: unknown): object is EnableToolsAction {
      return Action.hasKind(object, KIND) && hasArrayProp(object, 'toolIds');
   }

   export function create(toolIds: string[]): EnableToolsAction {
      return {
         kind: KIND,
         toolIds
      };
   }
}

/**
 * Action to disable the currently active tools and enable the default tools instead.
 */
export interface EnableDefaultToolsAction extends Action {
   kind: typeof EnableDefaultToolsAction.KIND;
}

export namespace EnableDefaultToolsAction {
   export const KIND = 'enable-default-tools';

   export function is(object: unknown): object is EnableToolsAction {
      return Action.hasKind(object, KIND);
   }

   export function create(): EnableDefaultToolsAction {
      return {
         kind: KIND
      };
   }
}

/**
 * Action to set the visibility state of the UI extension with the specified `id`.
 */
export interface SetUIExtensionVisibilityAction extends Action {
   kind: typeof SetUIExtensionVisibilityAction.KIND;
   extensionId: string;
   visible: boolean;
   contextElementsId: string[];
}

export namespace SetUIExtensionVisibilityAction {
   export const KIND = 'setUIExtensionVisibility';

   export function create(options: {
      extensionId: string;
      visible: boolean;
      contextElementsId?: string[];
   }): SetUIExtensionVisibilityAction {
      return {
         kind: KIND,
         extensionId: options.extensionId,
         visible: options.visible,
         contextElementsId: options.contextElementsId ?? []
      };
   }
}

export function activateDefaultToolsAction(): Action {
   return EnableDefaultToolsAction.create();
}

export function activateDeleteToolAction(): Action {
   return EnableToolsAction.create(['glsp.delete-mouse']);
}

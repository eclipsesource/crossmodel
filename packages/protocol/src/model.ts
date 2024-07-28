/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

const ModelFileTypeValues = {
   Generic: 'Generic',
   Entity: 'Entity',
   Relationship: 'Relationship',
   Mapping: 'Mapping',
   SystemDiagram: 'SystemDiagram'
} as const;

export const ModelFileType = {
   ...ModelFileTypeValues,
   getIconClass: (type: ModelFileType) => {
      switch (type) {
         case 'Entity':
            return ModelStructure.Entity.ICON_CLASS;
         case 'Relationship':
            return ModelStructure.Relationship.ICON_CLASS;
         case 'SystemDiagram':
            return ModelStructure.SystemDiagram.ICON_CLASS;
         case 'Mapping':
            return ModelStructure.Mapping.ICON_CLASS;
         default:
            return undefined;
      }
   },
   getFileExtension(type: ModelFileType): string | undefined {
      switch (type) {
         case 'Entity':
            return ModelFileExtensions.Entity;
         case 'Generic':
            return ModelFileExtensions.Generic;
         case 'Mapping':
            return ModelFileExtensions.Mapping;
         case 'Relationship':
            return ModelFileExtensions.Relationship;
         case 'SystemDiagram':
            return ModelFileExtensions.SystemDiagram;
      }
   }
} as const;
export type ModelFileType = (typeof ModelFileTypeValues)[keyof typeof ModelFileTypeValues];

export const ModelFileExtensions = {
   Generic: '.cm',
   Entity: '.entity.cm',
   Relationship: '.relationship.cm',
   Mapping: '.mapping.cm',
   SystemDiagram: '.system-diagram.cm',
   /* @deprecated Use SystemDiagram instead */
   Diagram: '.diagram.cm',

   isModelFile(uri: string): boolean {
      return uri.endsWith(this.Generic);
   },

   isEntityFile(uri: string): boolean {
      return uri.endsWith(this.Entity);
   },

   isRelationshipFile(uri: string): boolean {
      return uri.endsWith(this.Relationship);
   },

   isMappingFile(uri: string): boolean {
      return uri.endsWith(this.Mapping);
   },

   isSystemDiagramFile(uri: string): boolean {
      return uri.endsWith(this.SystemDiagram) || uri.endsWith(this.Diagram);
   },

   getName(uri: string): string {
      // since we have file extensions with two '.', we cannot use the default implementation that only works for one '.'
      if (uri.endsWith(this.Entity)) {
         return uri.substring(0, uri.length - this.Entity.length);
      }
      if (uri.endsWith(this.Relationship)) {
         return uri.substring(0, uri.length - this.Relationship.length);
      }
      if (uri.endsWith(this.Mapping)) {
         return uri.substring(0, uri.length - this.Mapping.length);
      }
      if (uri.endsWith(this.SystemDiagram)) {
         return uri.substring(0, uri.length - this.SystemDiagram.length);
      }
      if (uri.endsWith(this.Diagram)) {
         return uri.substring(0, uri.length - this.Diagram.length);
      }
      const lastIndex = uri.lastIndexOf('/');
      const extIndex = uri.lastIndexOf('.');
      return uri.substring(lastIndex + 1, extIndex);
   },

   getFileType(uri: string): ModelFileType | undefined {
      if (this.isMappingFile(uri)) {
         return 'Mapping';
      }
      if (this.isSystemDiagramFile(uri)) {
         return 'SystemDiagram';
      }
      if (this.isRelationshipFile(uri)) {
         return 'Relationship';
      }
      if (this.isEntityFile(uri)) {
         return 'Entity';
      }
      if (this.isModelFile(uri)) {
         return 'Generic';
      }
      return undefined;
   },

   getIconClass(uri: string): string | undefined {
      const fileType = this.getFileType(uri);
      if (!fileType) {
         return undefined;
      }
      switch (fileType) {
         case 'Entity':
            return ModelStructure.Entity.ICON_CLASS;
         case 'Relationship':
            return ModelStructure.Relationship.ICON_CLASS;
         case 'SystemDiagram':
            return ModelStructure.SystemDiagram.ICON_CLASS;
         case 'Mapping':
            return ModelStructure.Mapping.ICON_CLASS;
         default:
            return '';
      }
   },

   detectFileType(content: string): ModelFileType | undefined {
      if (content.startsWith('entity')) {
         return 'Entity';
      }
      if (content.startsWith('relationship')) {
         return 'Relationship';
      }
      if (content.startsWith('systemDiagram') || content.startsWith('diagram')) {
         return 'SystemDiagram';
      }
      if (content.startsWith('mapping')) {
         return 'Mapping';
      }
      return undefined;
   },

   detectFileExtension(content: string): string | undefined {
      const type = this.detectFileType(content);
      return type ? this.detectFileExtension(type) : undefined;
   }
} as const;

export const ModelStructure = {
   System: {
      ICON_CLASS: 'codicon codicon-globe',
      ICON: 'globe'
   },
   Entity: {
      FOLDER: 'entities',
      ICON_CLASS: 'codicon codicon-git-commit',
      ICON: 'git-commit'
   },

   Relationship: {
      FOLDER: 'relationships',
      ICON_CLASS: 'codicon codicon-git-compare',
      ICON: 'git-compare'
   },

   SystemDiagram: {
      FOLDER: 'diagrams',
      ICON_CLASS: 'codicon codicon-type-hierarchy-sub',
      ICON: 'type-hierarchy-sub'
   },

   Mapping: {
      FOLDER: 'mappings',
      ICON_CLASS: 'codicon codicon-group-by-ref-type',
      ICON: 'group-by-ref-type'
   }
};

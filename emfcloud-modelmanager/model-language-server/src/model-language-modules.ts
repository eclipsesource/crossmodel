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
import type {
  CompletionProvider,
  DeepPartial,
  LangiumServices,
  LangiumSharedServices,
  LanguageServer,
  Module,
  NameProvider,
  ScopeComputation,
  ValidationRegistry,
  ValueConverter
} from 'langium';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { AstLanguageModelConverter, DefaultAstLanguageModelConverter } from './ast-language-model-converter.js';
import { AstLanguageServer } from './ast-language-server.js';
import { ClientLogger } from './client-logger.js';
import { DeepScopeComputation } from './deep-scope-computation.js';
import { DefaultGrammarReflection, GrammarReflection } from './grammar-reflection.js';
import { GrammarValidator } from './grammar-validator.js';
import { IdProvider, QualifiedIdProvider } from './id-provider.js';
import { IdValidator } from './id-validator.js';
import { JsonDocumentSerializer, JsonLanguageCompletionProvider, JsonLanguageValueConverter } from './json/index.js';
import { ModelLanguageServer } from './model-language-server.js';
import { ModelLanguageWorkspaceManager } from './model-language-workspace-manager.js';
import { OpenTextDocuments } from './open-text-documents.js';
import { ModelTextDocumentManager, TextDocumentManager } from './text-document-manager.js';
import { TextDocumentSerializer } from './text-document-serializer.js';
import { ValidationContribution, ValidationContributionRegistry } from './validation.js';

export interface ModelServicesExtension {
  references: {
    IdProvider: IdProvider;
    /** override */ NameProvider: NameProvider;
    /** override */ ScopeComputation: ScopeComputation;
  };
  lsp: {
    /** override */ CompletionProvider: CompletionProvider;
  };
  parser: {
    /** override */ ValueConverter: ValueConverter;
  };
  validation: {
    /** override */ ValidationRegistry: ValidationRegistry;
    ValidationContributions: ValidationContribution[];
  };
  serializer: {
    TextDocumentSerializer: TextDocumentSerializer;
  };
  GrammarReflection: GrammarReflection;
  /** override */ shared: ModelSharedServicesExtension;
}

export type ModelLanguageServices = LangiumServices & ModelServicesExtension;
export type PartialModelLanguageServices = DeepPartial<ModelLanguageServices>;

export function createModelLanguageModule(context: {
  shared: ModelLanguagesSharedServices;
}): Module<ModelLanguageServices, ModelServicesExtension> {
  return {
    references: {
      IdProvider: () => new QualifiedIdProvider(),
      NameProvider: services => services.references.IdProvider,
      ScopeComputation: services => new DeepScopeComputation(services)
    },
    lsp: {
      CompletionProvider: services => new JsonLanguageCompletionProvider(services)
    },
    parser: {
      ValueConverter: () => new JsonLanguageValueConverter()
    },
    validation: {
      ValidationRegistry: services => new ValidationContributionRegistry(services),
      ValidationContributions: services => [new GrammarValidator(services), new IdValidator(services)]
    },
    serializer: {
      TextDocumentSerializer: services => new JsonDocumentSerializer(services)
    },
    GrammarReflection: services => new DefaultGrammarReflection(services.Grammar),
    shared: () => context.shared
  };
}

export interface ModelSharedServicesExtension {
  workspace: {
    TextDocumentManager: TextDocumentManager;
    /* override */ TextDocuments: OpenTextDocuments<TextDocument>; // more accessible text document store
    /* override */ WorkspaceManager: ModelLanguageWorkspaceManager;
  };
  client: {
    AstLanguageServer: AstLanguageServer; // facade to access the Langium semantic models without being a language client
    AstLanguageModelConverter: AstLanguageModelConverter;
  };
  logger: {
    ClientLogger: ClientLogger;
  };
  lsp: {
    /* override */ LanguageServer: LanguageServer;
  };
}

export type ModelLanguagesSharedServices = LangiumSharedServices & ModelSharedServicesExtension;
export type PartialModelLanguagesSharedServices = DeepPartial<ModelLanguagesSharedServices>;

export function createModelLanguagesSharedModule(): Module<ModelLanguagesSharedServices, ModelSharedServicesExtension> {
  return {
    workspace: {
      TextDocumentManager: services => new ModelTextDocumentManager(services),
      TextDocuments: () => new OpenTextDocuments(TextDocument),
      WorkspaceManager: services => new ModelLanguageWorkspaceManager(services)
    },
    client: {
      AstLanguageServer: services => new AstLanguageServer(services),
      AstLanguageModelConverter: services => new DefaultAstLanguageModelConverter(services)
    },
    lsp: {
      LanguageServer: services => new ModelLanguageServer(services)
    },
    logger: {
      ClientLogger: services => new ClientLogger(services)
    }
  };
}

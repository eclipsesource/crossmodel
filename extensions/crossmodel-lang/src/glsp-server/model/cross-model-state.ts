/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { DefaultModelState, JsonModelState, ModelState, hasFunctionProp } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { URI } from 'vscode-uri';
import { CrossModelLSPServices } from '../../integration.js';
import { QualifiedNameProvider } from '../../language-server/cross-model-naming.js';
import { CrossModelRoot, SystemDiagram } from '../../language-server/generated/ast.js';
import { ModelService } from '../../model-server/model-service.js';
import { Serializer } from '../../model-server/serializer.js';
import { CrossModelIndex } from './cross-model-index.js';

export interface CrossModelSourceModel {
    text: string;
}

/**
 * Custom model state that does not only keep track of the GModel root but also the semantic root.
 * It also provides convenience methods for accessing specific language services.
 */
@injectable()
export class CrossModelState extends DefaultModelState implements JsonModelState<CrossModelSourceModel> {
    @inject(CrossModelIndex) override readonly index!: CrossModelIndex;
    @inject(CrossModelLSPServices) readonly services!: CrossModelLSPServices;

    protected _semanticUri!: string;
    protected _semanticRoot!: CrossModelRoot;
    protected _packageId!: string;

    setSemanticRoot(uri: string, semanticRoot: CrossModelRoot): void {
        this._semanticUri = uri;
        this._semanticRoot = semanticRoot;
        this._packageId = this.services.shared.workspace.PackageManager.getPackageIdByUri(URI.parse(uri));
        this.index.indexSemanticRoot(this.semanticRoot);
    }

    get semanticUri(): string {
        return this._semanticUri;
    }

    get semanticRoot(): CrossModelRoot {
        return this._semanticRoot;
    }

    get packageId(): string {
        return this._packageId;
    }

    get diagramRoot(): SystemDiagram {
        return this.semanticRoot.diagram!;
    }

    get modelService(): ModelService {
        return this.services.shared.model.ModelService;
    }

    get semanticSerializer(): Serializer<CrossModelRoot> {
        return this.services.language.serializer.Serializer;
    }

    get nameProvider(): QualifiedNameProvider {
        return this.services.language.references.QualifiedNameProvider;
    }

    get sourceModel(): CrossModelSourceModel {
        return { text: this.semanticText() };
    }

    async updateSourceModel(sourceModel: CrossModelSourceModel): Promise<void> {
        this._semanticRoot = await this.modelService.update<CrossModelRoot>({
            uri: this.semanticUri,
            model: sourceModel.text ?? this.semanticRoot,
            clientId: this.clientId
        });
        this.index.indexSemanticRoot(this.semanticRoot);
    }

    /** Textual representation of the current semantic root. */
    semanticText(): string {
        return this.services.language.serializer.Serializer.serialize(this.semanticRoot);
    }
}

export namespace CrossModelState {
    export function is(modelState: ModelState): modelState is CrossModelState {
        return JsonModelState.is(modelState) && hasFunctionProp(modelState, 'setSemanticRoot');
    }
}

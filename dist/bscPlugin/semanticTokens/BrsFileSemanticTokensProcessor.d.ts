import type { BrsFile } from '../../files/BrsFile';
import type { OnGetSemanticTokensEvent } from '../../interfaces';
export declare class BrsFileSemanticTokensProcessor {
    event: OnGetSemanticTokensEvent<BrsFile>;
    constructor(event: OnGetSemanticTokensEvent<BrsFile>);
    process(): void;
    private handleClasses;
    private handleEnums;
}

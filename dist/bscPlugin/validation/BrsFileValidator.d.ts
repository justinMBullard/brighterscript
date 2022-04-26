import type { BrsFile } from '../../files/BrsFile';
import type { OnFileValidateEvent } from '../../interfaces';
export declare class BrsFileValidator {
    event: OnFileValidateEvent<BrsFile>;
    constructor(event: OnFileValidateEvent<BrsFile>);
    process(): void;
    validateEnumDeclarations(): void;
    private validateEnumValueTypes;
}

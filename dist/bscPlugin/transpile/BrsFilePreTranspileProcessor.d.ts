import type { BrsFile } from '../../files/BrsFile';
import type { BeforeFileTranspileEvent } from '../../interfaces';
export declare class BrsFilePreTranspileProcessor {
    private event;
    constructor(event: BeforeFileTranspileEvent<BrsFile>);
    process(): void;
    private replaceEnumValues;
}

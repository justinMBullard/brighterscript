import type { Range } from 'vscode-languageserver';
import type { BrsFile } from '../files/BrsFile';
import type { ClassStatement } from './Statement';
import { TranspileState } from './TranspileState';
export declare class BrsTranspileState extends TranspileState {
    file: BrsFile;
    constructor(file: BrsFile);
    /**
     * The prefix to use in front of all bslib functions
     */
    bslibPrefix: string;
    /**
     * the tree of parents, with the first index being direct parent, and the last index being the furthest removed ancestor.
     * Used to assist blocks in knowing when to add a comment statement to the same line as the first line of the parent
     */
    lineage: {
        range: Range;
    }[];
    /**
     * Used by ClassMethodStatements to determine information about their enclosing class
     */
    classStatement?: ClassStatement;
}

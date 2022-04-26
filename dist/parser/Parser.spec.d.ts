import type { Statement } from './Statement';
import { Range } from 'vscode-languageserver';
export declare function rangeToArray(range: Range): number[];
export declare function failStatementType(stat: Statement, type: string): void;

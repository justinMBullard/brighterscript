import type { Expression } from '../parser/Expression';
import type { Statement } from '../parser/Statement';
export declare class AstEditor {
    private changes;
    /**
     * Indicates whether the editor have changes that were applied
     */
    get hasChanges(): boolean;
    /**
     * Change the value of an object's property
     */
    setProperty<T, K extends keyof T>(obj: T, key: K, newValue: T[K]): void;
    /**
     * Set custom text that will be emitted during transpile instead of the original text.
     */
    overrideTranspileResult(node: Expression | Statement, value: string): void;
    /**
     * Insert an element into an array at the specified index
     */
    addToArray<T extends any[]>(array: T, index: number, newValue: T[0]): void;
    /**
     * Change the value of an item in an array at the specified index
     */
    setArrayValue<T extends any[], K extends keyof T>(array: T, index: number, newValue: T[K]): void;
    /**
     * Remove an element from an array at the specified index
     */
    removeFromArray<T extends any[]>(array: T, index: number): void;
    /**
     * Unto all changes.
     */
    undoAll(): void;
}

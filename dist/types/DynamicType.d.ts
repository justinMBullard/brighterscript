import type { BscType } from './BscType';
export declare class DynamicType implements BscType {
    typeText?: string;
    constructor(typeText?: string);
    isAssignableTo(targetType: BscType): boolean;
    /**
     * The dynamic type is convertible to everything.
     * @param targetType
     */
    isConvertibleTo(targetType: BscType): boolean;
    toString(): string;
    toTypeString(): string;
}

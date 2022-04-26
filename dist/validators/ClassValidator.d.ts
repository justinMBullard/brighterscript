import type { Scope } from '../Scope';
import type { BsDiagnostic } from '../interfaces';
export declare class BsClassValidator {
    private scope;
    diagnostics: BsDiagnostic[];
    private classes;
    validate(scope: Scope): void;
    /**
     * Given a class name optionally prefixed with a namespace name, find the class that matches
     */
    private getClassByName;
    /**
     * Find all "new" statements in the program,
     * and make sure we can find a class with that name
     */
    private verifyNewExpressions;
    private findNamespaceNonNamespaceCollisions;
    private verifyChildConstructor;
    private validateMemberCollisions;
    /**
     * Check the types for fields, and validate they are valid types
     */
    private validateFieldTypes;
    /**
     * Get the closest member with the specified name (case-insensitive)
     */
    private getAncestorMember;
    private cleanUp;
    private findClasses;
    private linkClassesWithParents;
}

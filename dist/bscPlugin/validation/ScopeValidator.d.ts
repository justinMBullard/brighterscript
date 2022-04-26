import type { OnScopeValidateEvent } from '../../interfaces';
/**
 * A validator that handles all scope validations for a program validation cycle.
 * You should create ONE of these to handle all scope events between beforeProgramValidate and afterProgramValidate,
 * and call reset() before using it again in the next cycle
 */
export declare class ScopeValidator {
    private events;
    processEvent(event: OnScopeValidateEvent): void;
    reset(): void;
    /**
     * Adds a diagnostic to the first scope for this key. Prevents duplicate diagnostics
     * for diagnostics where scope isn't important. (i.e. CreateObject validations)
     */
    private addDiagnosticOnce;
    private cache;
    /**
     * Find all expressions and validate the ones that look like enums
     */
    validateEnumUsage(event: OnScopeValidateEvent): void;
    private detectDuplicateEnums;
    /**
     * Validate every function call to `CreateObject`.
     * Ideally we would create better type checking/handling for this, but in the mean time, we know exactly
     * what these calls are supposed to look like, and this is a very common thing for brs devs to do, so just
     * do this manually for now.
     */
    protected validateCreateObjectCalls(event: OnScopeValidateEvent): void;
}

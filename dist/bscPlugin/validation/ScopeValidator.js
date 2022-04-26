"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScopeValidator = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
const vscode_uri_1 = require("vscode-uri");
const reflection_1 = require("../../astUtils/reflection");
const Cache_1 = require("../../Cache");
const DiagnosticMessages_1 = require("../../DiagnosticMessages");
const util_1 = require("../../util");
const roku_types_1 = require("../../roku-types");
/**
 * The lower-case names of all platform-included scenegraph nodes
 */
const platformNodeNames = new Set(Object.values(roku_types_1.nodes).map(x => x.name.toLowerCase()));
const platformComponentNames = new Set(Object.values(roku_types_1.components).map(x => x.name.toLowerCase()));
/**
 * A validator that handles all scope validations for a program validation cycle.
 * You should create ONE of these to handle all scope events between beforeProgramValidate and afterProgramValidate,
 * and call reset() before using it again in the next cycle
 */
class ScopeValidator {
    constructor() {
        this.events = [];
        this.cache = new Map();
    }
    processEvent(event) {
        this.events.push(event);
        this.validateEnumUsage(event);
        this.detectDuplicateEnums(event);
        this.validateCreateObjectCalls(event);
    }
    reset() {
        this.cache.clear();
        this.events = [];
    }
    /**
     * Adds a diagnostic to the first scope for this key. Prevents duplicate diagnostics
     * for diagnostics where scope isn't important. (i.e. CreateObject validations)
     */
    addDiagnosticOnce(event, diagnostic) {
        const key = `${diagnostic.code}-${diagnostic.message}-${util_1.default.rangeToString(diagnostic.range)}`;
        if (!this.cache.has(key)) {
            this.cache.set(key, true);
            event.scope.addDiagnostics([diagnostic]);
        }
    }
    /**
     * Find all expressions and validate the ones that look like enums
     */
    validateEnumUsage(event) {
        const diagnostics = [];
        const membersByEnum = new Cache_1.Cache();
        //if there are any enums defined in this scope
        const enumLookup = event.scope.getEnumMap();
        //skip enum validation if there are no enums defined in this scope
        if (enumLookup.size === 0) {
            return;
        }
        event.scope.enumerateOwnFiles((file) => {
            var _a;
            //skip non-brs files
            if (!(0, reflection_1.isBrsFile)(file)) {
                return;
            }
            for (const expression of file.parser.references.expressions) {
                const parts = util_1.default.getAllDottedGetParts(expression);
                //skip expressions that aren't fully dotted gets
                if (!parts) {
                    continue;
                }
                //get the name of the enum member
                const memberName = parts.pop();
                //get the name of the enum (including leading namespace if applicable)
                const enumName = parts.join('.');
                const lowerEnumName = enumName.toLowerCase();
                const theEnum = (_a = enumLookup.get(lowerEnumName)) === null || _a === void 0 ? void 0 : _a.item;
                if (theEnum) {
                    const members = membersByEnum.getOrAdd(lowerEnumName, () => theEnum.getMemberValueMap());
                    const value = members === null || members === void 0 ? void 0 : members.get(memberName.toLowerCase());
                    if (!value) {
                        diagnostics.push(Object.assign(Object.assign({ file: file }, DiagnosticMessages_1.DiagnosticMessages.unknownEnumValue(memberName, theEnum.fullName)), { range: expression.name.range, relatedInformation: [{
                                    message: 'Enum declared here',
                                    location: vscode_languageserver_1.Location.create(vscode_uri_1.URI.file(file.pathAbsolute).toString(), theEnum.tokens.name.range)
                                }] }));
                    }
                }
            }
        });
        event.scope.addDiagnostics(diagnostics);
    }
    detectDuplicateEnums(event) {
        const diagnostics = [];
        const enumLocationsByName = new Cache_1.Cache();
        event.scope.enumerateBrsFiles((file) => {
            for (const enumStatement of file.parser.references.enumStatements) {
                const fullName = enumStatement.fullName;
                const nameLower = fullName === null || fullName === void 0 ? void 0 : fullName.toLowerCase();
                if ((nameLower === null || nameLower === void 0 ? void 0 : nameLower.length) > 0) {
                    enumLocationsByName.getOrAdd(nameLower, () => []).push({
                        file: file,
                        statement: enumStatement
                    });
                }
            }
        });
        //now that we've collected all enum declarations, flag duplicates
        for (const enumLocations of enumLocationsByName.values()) {
            //sort by srcPath to keep the primary enum location consistent
            enumLocations.sort((a, b) => { var _a, _b, _c; return (_b = (_a = a.file) === null || _a === void 0 ? void 0 : _a.pathAbsolute) === null || _b === void 0 ? void 0 : _b.localeCompare((_c = b.file) === null || _c === void 0 ? void 0 : _c.pathAbsolute); });
            const primaryEnum = enumLocations.shift();
            const fullName = primaryEnum.statement.fullName;
            for (const duplicateEnumInfo of enumLocations) {
                diagnostics.push(Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.duplicateEnumDeclaration(event.scope.name, fullName)), { file: duplicateEnumInfo.file, range: duplicateEnumInfo.statement.tokens.name.range, relatedInformation: [{
                            message: 'Enum declared here',
                            location: vscode_languageserver_1.Location.create(vscode_uri_1.URI.file(primaryEnum.file.pathAbsolute).toString(), primaryEnum.statement.tokens.name.range)
                        }] }));
            }
        }
        event.scope.addDiagnostics(diagnostics);
    }
    /**
     * Validate every function call to `CreateObject`.
     * Ideally we would create better type checking/handling for this, but in the mean time, we know exactly
     * what these calls are supposed to look like, and this is a very common thing for brs devs to do, so just
     * do this manually for now.
     */
    validateCreateObjectCalls(event) {
        const diagnostics = [];
        event.scope.enumerateBrsFiles((file) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            for (const call of file.functionCalls) {
                //skip non CreateObject function calls
                if (((_a = call.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== 'createobject' || !(0, reflection_1.isLiteralExpression)((_b = call === null || call === void 0 ? void 0 : call.args[0]) === null || _b === void 0 ? void 0 : _b.expression)) {
                    continue;
                }
                const firstParamToken = (_d = (_c = call === null || call === void 0 ? void 0 : call.args[0]) === null || _c === void 0 ? void 0 : _c.expression) === null || _d === void 0 ? void 0 : _d.token;
                const firstParamStringValue = (_e = firstParamToken === null || firstParamToken === void 0 ? void 0 : firstParamToken.text) === null || _e === void 0 ? void 0 : _e.replace(/"/g, '');
                //if this is a `createObject('roSGNode'` call, only support known sg node types
                if ((firstParamStringValue === null || firstParamStringValue === void 0 ? void 0 : firstParamStringValue.toLowerCase()) === 'rosgnode' && (0, reflection_1.isLiteralExpression)((_f = call === null || call === void 0 ? void 0 : call.args[1]) === null || _f === void 0 ? void 0 : _f.expression)) {
                    const componentName = (_h = (_g = call === null || call === void 0 ? void 0 : call.args[1]) === null || _g === void 0 ? void 0 : _g.expression) === null || _h === void 0 ? void 0 : _h.token;
                    //don't validate any components with a colon in their name (probably component libraries, but regular components can have them too).
                    if ((_j = componentName === null || componentName === void 0 ? void 0 : componentName.text) === null || _j === void 0 ? void 0 : _j.includes(':')) {
                        continue;
                    }
                    //add diagnostic for unknown components
                    const unquotedComponentName = (_k = componentName === null || componentName === void 0 ? void 0 : componentName.text) === null || _k === void 0 ? void 0 : _k.replace(/"/g, '');
                    if (unquotedComponentName && !platformNodeNames.has(unquotedComponentName.toLowerCase()) && !event.program.getComponent(unquotedComponentName)) {
                        this.addDiagnosticOnce(event, Object.assign(Object.assign({ file: file }, DiagnosticMessages_1.DiagnosticMessages.unknownRoSGNode(unquotedComponentName)), { range: componentName.range }));
                    }
                    else if ((call === null || call === void 0 ? void 0 : call.args.length) !== 2) {
                        // roSgNode should only ever have 2 args in `createObject`
                        this.addDiagnosticOnce(event, Object.assign(Object.assign({ file: file }, DiagnosticMessages_1.DiagnosticMessages.mismatchCreateObjectArgumentCount(firstParamStringValue, [2], call === null || call === void 0 ? void 0 : call.args.length)), { range: call.range }));
                    }
                }
                else if (!platformComponentNames.has(firstParamStringValue.toLowerCase())) {
                    this.addDiagnosticOnce(event, Object.assign(Object.assign({ file: file }, DiagnosticMessages_1.DiagnosticMessages.unknownBrightScriptComponent(firstParamStringValue)), { range: firstParamToken.range }));
                }
                else {
                    // This is valid brightscript component
                    // Test for invalid arg counts
                    const brightScriptComponent = roku_types_1.components[firstParamStringValue.toLowerCase()];
                    // Valid arg counts for createObject are 1+ number of args for constructor
                    let validArgCounts = brightScriptComponent.constructors.map(cnstr => cnstr.params.length + 1);
                    if (validArgCounts.length === 0) {
                        // no constructors for this component, so createObject only takes 1 arg
                        validArgCounts = [1];
                    }
                    if (!validArgCounts.includes(call === null || call === void 0 ? void 0 : call.args.length)) {
                        // Incorrect number of arguments included in `createObject()`
                        this.addDiagnosticOnce(event, Object.assign(Object.assign({ file: file }, DiagnosticMessages_1.DiagnosticMessages.mismatchCreateObjectArgumentCount(firstParamStringValue, validArgCounts, call === null || call === void 0 ? void 0 : call.args.length)), { range: call.range }));
                    }
                    // Test for deprecation
                    if (brightScriptComponent.isDeprecated) {
                        this.addDiagnosticOnce(event, Object.assign(Object.assign({ file: file }, DiagnosticMessages_1.DiagnosticMessages.deprecatedBrightScriptComponent(firstParamStringValue, brightScriptComponent.deprecatedDescription)), { range: call.range }));
                    }
                }
            }
        });
        event.scope.addDiagnostics(diagnostics);
    }
}
exports.ScopeValidator = ScopeValidator;
//# sourceMappingURL=ScopeValidator.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BsClassValidator = void 0;
const DiagnosticMessages_1 = require("../DiagnosticMessages");
const Parser_1 = require("../parser/Parser");
const vscode_languageserver_1 = require("vscode-languageserver");
const vscode_uri_1 = require("vscode-uri");
const util_1 = require("../util");
const reflection_1 = require("../astUtils/reflection");
const visitors_1 = require("../astUtils/visitors");
const TokenKind_1 = require("../lexer/TokenKind");
const DynamicType_1 = require("../types/DynamicType");
class BsClassValidator {
    validate(scope) {
        this.scope = scope;
        this.diagnostics = [];
        this.findClasses();
        this.findNamespaceNonNamespaceCollisions();
        this.linkClassesWithParents();
        this.validateMemberCollisions();
        this.verifyChildConstructor();
        this.verifyNewExpressions();
        this.validateFieldTypes();
        this.cleanUp();
    }
    /**
     * Given a class name optionally prefixed with a namespace name, find the class that matches
     */
    getClassByName(className, namespaceName) {
        let fullName = util_1.default.getFullyQualifiedClassName(className, namespaceName);
        let cls = this.classes.get(fullName.toLowerCase());
        //if we couldn't find the class by its full namespaced name, look for a global class with that name
        if (!cls) {
            cls = this.classes.get(className.toLowerCase());
        }
        return cls;
    }
    /**
     * Find all "new" statements in the program,
     * and make sure we can find a class with that name
     */
    verifyNewExpressions() {
        this.scope.enumerateBrsFiles((file) => {
            var _a, _b;
            let newExpressions = file.parser.references.newExpressions;
            for (let newExpression of newExpressions) {
                let className = newExpression.className.getName(Parser_1.ParseMode.BrighterScript);
                let newableClass = this.getClassByName(className, (_a = newExpression.namespaceName) === null || _a === void 0 ? void 0 : _a.getName(Parser_1.ParseMode.BrighterScript));
                if (!newableClass) {
                    //try and find functions with this name.
                    let fullName = util_1.default.getFullyQualifiedClassName(className, (_b = newExpression.namespaceName) === null || _b === void 0 ? void 0 : _b.getName(Parser_1.ParseMode.BrighterScript));
                    let callable = this.scope.getCallableByName(fullName);
                    //if we found a callable with this name, the user used a "new" keyword in front of a function. add error
                    if (callable) {
                        this.diagnostics.push(Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.expressionIsNotConstructable(callable.isSub ? 'sub' : 'function')), { file: file, range: newExpression.className.range }));
                        //could not find a class with this name
                    }
                    else {
                        this.diagnostics.push(Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.classCouldNotBeFound(className, this.scope.name)), { file: file, range: newExpression.className.range }));
                    }
                }
            }
        });
    }
    findNamespaceNonNamespaceCollisions() {
        for (const [className, classStatement] of this.classes) {
            //catch namespace class collision with global class
            let nonNamespaceClass = this.classes.get(util_1.default.getTextAfterFinalDot(className).toLowerCase());
            if (classStatement.namespaceName && nonNamespaceClass) {
                this.diagnostics.push(Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.namespacedClassCannotShareNamewithNonNamespacedClass(nonNamespaceClass.name.text)), { file: classStatement.file, range: classStatement.name.range, relatedInformation: [{
                            location: vscode_languageserver_1.Location.create(vscode_uri_1.URI.file(nonNamespaceClass.file.pathAbsolute).toString(), nonNamespaceClass.name.range),
                            message: 'Original class declared here'
                        }] }));
            }
        }
    }
    verifyChildConstructor() {
        for (const [, classStatement] of this.classes) {
            const newMethod = classStatement.memberMap.new;
            if (
            //this class has a "new method"
            newMethod &&
                //this class has a parent class
                classStatement.parentClass) {
                //prevent use of `m.` anywhere before the `super()` call
                const cancellationToken = new vscode_languageserver_1.CancellationTokenSource();
                let superCall;
                newMethod.func.body.walk((0, visitors_1.createVisitor)({
                    VariableExpression: (expression, parent) => {
                        var _a;
                        const expressionNameLower = (_a = expression === null || expression === void 0 ? void 0 : expression.name) === null || _a === void 0 ? void 0 : _a.text.toLowerCase();
                        if (expressionNameLower === 'm') {
                            this.diagnostics.push(Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.classConstructorIllegalUseOfMBeforeSuperCall()), { file: classStatement.file, range: expression.range }));
                        }
                        if ((0, reflection_1.isCallExpression)(parent) && expressionNameLower === 'super') {
                            superCall = parent;
                            //stop walking
                            cancellationToken.cancel();
                        }
                    }
                }), {
                    walkMode: visitors_1.WalkMode.visitAll,
                    cancel: cancellationToken.token
                });
                //every child class constructor must include a call to `super()` (except for typedef files)
                if (!superCall && !classStatement.file.isTypedef) {
                    this.diagnostics.push(Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.classConstructorMissingSuperCall()), { file: classStatement.file, range: newMethod.range }));
                }
            }
        }
    }
    validateMemberCollisions() {
        var _a, _b, _c, _d, _e, _f, _g;
        for (const [, classStatement] of this.classes) {
            let methods = {};
            let fields = {};
            for (let statement of classStatement.body) {
                if ((0, reflection_1.isClassMethodStatement)(statement) || (0, reflection_1.isClassFieldStatement)(statement)) {
                    let member = statement;
                    let lowerMemberName = member.name.text.toLowerCase();
                    //catch duplicate member names on same class
                    if (methods[lowerMemberName] || fields[lowerMemberName]) {
                        this.diagnostics.push(Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.duplicateIdentifier(member.name.text)), { file: classStatement.file, range: member.name.range }));
                    }
                    let memberType = (0, reflection_1.isClassFieldStatement)(member) ? 'field' : 'method';
                    let ancestorAndMember = this.getAncestorMember(classStatement, lowerMemberName);
                    if (ancestorAndMember) {
                        let ancestorMemberKind = (0, reflection_1.isClassFieldStatement)(ancestorAndMember.member) ? 'field' : 'method';
                        //mismatched member type (field/method in child, opposite in ancestor)
                        if (memberType !== ancestorMemberKind) {
                            this.diagnostics.push(Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.classChildMemberDifferentMemberTypeThanAncestor(memberType, ancestorMemberKind, ancestorAndMember.classStatement.getName(Parser_1.ParseMode.BrighterScript))), { file: classStatement.file, range: member.range }));
                        }
                        //child field has same name as parent
                        if ((0, reflection_1.isClassFieldStatement)(member)) {
                            let ancestorMemberType = new DynamicType_1.DynamicType();
                            if ((0, reflection_1.isClassFieldStatement)(ancestorAndMember.member)) {
                                ancestorMemberType = ancestorAndMember.member.getType();
                            }
                            else if ((0, reflection_1.isClassMethodStatement)(ancestorAndMember.member)) {
                                ancestorMemberType = ancestorAndMember.member.func.getFunctionType();
                            }
                            const childFieldType = member.getType();
                            if (!childFieldType.isAssignableTo(ancestorMemberType)) {
                                //flag incompatible child field type to ancestor field type
                                this.diagnostics.push(Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.childFieldTypeNotAssignableToBaseProperty(classStatement.getName(Parser_1.ParseMode.BrighterScript), ancestorAndMember.classStatement.getName(Parser_1.ParseMode.BrighterScript), member.name.text, childFieldType.toString(), ancestorMemberType.toString())), { file: classStatement.file, range: member.range }));
                            }
                        }
                        //child method missing the override keyword
                        if (
                        //is a method
                        (0, reflection_1.isClassMethodStatement)(member) &&
                            //does not have an override keyword
                            !member.override &&
                            //is not the constructur function
                            member.name.text.toLowerCase() !== 'new') {
                            this.diagnostics.push(Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.missingOverrideKeyword(ancestorAndMember.classStatement.getName(Parser_1.ParseMode.BrighterScript))), { file: classStatement.file, range: member.range }));
                        }
                        //child member has different visiblity
                        if (
                        //is a method
                        (0, reflection_1.isClassMethodStatement)(member) &&
                            ((_b = (_a = member.accessModifier) === null || _a === void 0 ? void 0 : _a.kind) !== null && _b !== void 0 ? _b : TokenKind_1.TokenKind.Public) !== ((_d = (_c = ancestorAndMember.member.accessModifier) === null || _c === void 0 ? void 0 : _c.kind) !== null && _d !== void 0 ? _d : TokenKind_1.TokenKind.Public)) {
                            this.diagnostics.push(Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.mismatchedOverriddenMemberVisibility(classStatement.name.text, (_e = ancestorAndMember.member.name) === null || _e === void 0 ? void 0 : _e.text, ((_f = member.accessModifier) === null || _f === void 0 ? void 0 : _f.text) || 'public', ((_g = ancestorAndMember.member.accessModifier) === null || _g === void 0 ? void 0 : _g.text) || 'public', ancestorAndMember.classStatement.getName(Parser_1.ParseMode.BrighterScript))), { file: classStatement.file, range: member.range }));
                        }
                    }
                    if ((0, reflection_1.isClassMethodStatement)(member)) {
                        methods[lowerMemberName] = member;
                    }
                    else if ((0, reflection_1.isClassFieldStatement)(member)) {
                        fields[lowerMemberName] = member;
                    }
                }
            }
        }
    }
    /**
     * Check the types for fields, and validate they are valid types
     */
    validateFieldTypes() {
        var _a;
        for (const [, classStatement] of this.classes) {
            for (let statement of classStatement.body) {
                if ((0, reflection_1.isClassFieldStatement)(statement)) {
                    let fieldType = statement.getType();
                    if ((0, reflection_1.isCustomType)(fieldType)) {
                        const fieldTypeName = fieldType.name;
                        const lowerFieldTypeName = fieldTypeName === null || fieldTypeName === void 0 ? void 0 : fieldTypeName.toLowerCase();
                        if (lowerFieldTypeName) {
                            const currentNamespaceName = (_a = classStatement.namespaceName) === null || _a === void 0 ? void 0 : _a.getName(Parser_1.ParseMode.BrighterScript);
                            //check if this custom type is in our class map
                            if (!this.getClassByName(lowerFieldTypeName, currentNamespaceName)) {
                                this.diagnostics.push(Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.cannotFindType(fieldTypeName)), { range: statement.type.range, file: classStatement.file }));
                            }
                        }
                    }
                }
            }
        }
    }
    /**
     * Get the closest member with the specified name (case-insensitive)
     */
    getAncestorMember(classStatement, memberName) {
        let lowerMemberName = memberName.toLowerCase();
        let ancestor = classStatement.parentClass;
        while (ancestor) {
            let member = ancestor.memberMap[lowerMemberName];
            if (member) {
                return {
                    member: member,
                    classStatement: ancestor
                };
            }
            ancestor = ancestor.parentClass;
        }
    }
    cleanUp() {
        //unlink all classes from their parents so it doesn't mess up the next scope
        for (const [, classStatement] of this.classes) {
            delete classStatement.parentClass;
            delete classStatement.file;
        }
    }
    findClasses() {
        this.classes = new Map();
        this.scope.enumerateBrsFiles((file) => {
            var _a;
            for (let x of (_a = file.parser.references.classStatements) !== null && _a !== void 0 ? _a : []) {
                let classStatement = x;
                let name = classStatement.getName(Parser_1.ParseMode.BrighterScript);
                //skip this class if it doesn't have a name
                if (!name) {
                    continue;
                }
                let lowerName = name.toLowerCase();
                //see if this class was already defined
                let alreadyDefinedClass = this.classes.get(lowerName);
                //if we don't already have this class, register it
                if (!alreadyDefinedClass) {
                    this.classes.set(lowerName, classStatement);
                    classStatement.file = file;
                    //add a diagnostic about this class already existing
                }
                else {
                    this.diagnostics.push(Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.duplicateClassDeclaration(this.scope.name, name)), { file: file, range: classStatement.name.range, relatedInformation: [{
                                location: vscode_languageserver_1.Location.create(vscode_uri_1.URI.file(alreadyDefinedClass.file.pathAbsolute).toString(), this.classes.get(lowerName).range),
                                message: ''
                            }] }));
                }
            }
        });
    }
    linkClassesWithParents() {
        var _a;
        //link all classes with their parents
        for (const [, classStatement] of this.classes) {
            let parentClassName = (_a = classStatement.parentClassName) === null || _a === void 0 ? void 0 : _a.getName(Parser_1.ParseMode.BrighterScript);
            if (parentClassName) {
                let relativeName;
                let absoluteName;
                //if the parent class name was namespaced in the declaration of this class,
                //compute the relative name of the parent class and the absolute name of the parent class
                if (parentClassName.indexOf('.') > 0) {
                    absoluteName = parentClassName;
                    let parts = parentClassName.split('.');
                    relativeName = parts[parts.length - 1];
                    //the parent class name was NOT namespaced.
                    //compute the relative name of the parent class and prepend the current class's namespace
                    //to the beginning of the parent class's name
                }
                else {
                    if (classStatement.namespaceName) {
                        absoluteName = `${classStatement.namespaceName.getName(Parser_1.ParseMode.BrighterScript)}.${parentClassName}`;
                    }
                    else {
                        absoluteName = parentClassName;
                    }
                    relativeName = parentClassName;
                }
                let relativeParent = this.classes.get(relativeName.toLowerCase());
                let absoluteParent = this.classes.get(absoluteName.toLowerCase());
                let parentClass;
                //if we found a relative parent class
                if (relativeParent) {
                    parentClass = relativeParent;
                    //we found an absolute parent class
                }
                else if (absoluteParent) {
                    parentClass = absoluteParent;
                    //couldn't find the parent class
                }
                else {
                    this.diagnostics.push(Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.classCouldNotBeFound(parentClassName, this.scope.name)), { file: classStatement.file, range: classStatement.parentClassName.range }));
                }
                classStatement.parentClass = parentClass;
            }
        }
    }
}
exports.BsClassValidator = BsClassValidator;
//# sourceMappingURL=ClassValidator.js.map
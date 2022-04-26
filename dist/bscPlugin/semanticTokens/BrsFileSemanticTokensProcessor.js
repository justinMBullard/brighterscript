"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrsFileSemanticTokensProcessor = void 0;
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
const reflection_1 = require("../../astUtils/reflection");
const Parser_1 = require("../../parser/Parser");
const util_1 = require("../../util");
class BrsFileSemanticTokensProcessor {
    constructor(event) {
        this.event = event;
    }
    process() {
        this.handleClasses();
        this.handleEnums();
    }
    handleClasses() {
        var _a, _b;
        const classes = [];
        //classes used in function param types
        for (const func of this.event.file.parser.references.functionExpressions) {
            for (const parm of func.parameters) {
                if ((0, reflection_1.isCustomType)(parm.type)) {
                    classes.push({
                        className: parm.typeToken.text,
                        namespaceName: (_a = parm.namespaceName) === null || _a === void 0 ? void 0 : _a.getName(Parser_1.ParseMode.BrighterScript),
                        range: parm.typeToken.range
                    });
                }
            }
        }
        //classes used in `new` expressions
        for (const expr of this.event.file.parser.references.newExpressions) {
            classes.push({
                className: expr.className.getName(Parser_1.ParseMode.BrighterScript),
                namespaceName: (_b = expr.namespaceName) === null || _b === void 0 ? void 0 : _b.getName(Parser_1.ParseMode.BrighterScript),
                range: expr.className.range
            });
        }
        for (const cls of classes) {
            if (cls.className.length > 0 &&
                //only highlight classes that are in scope
                this.event.scopes.some(x => x.hasClass(cls.className, cls.namespaceName))) {
                const tokens = util_1.default.splitGetRange('.', cls.className, cls.range);
                //namespace parts (skip the final array entry)
                for (let i = 0; i < tokens.length - 1; i++) {
                    const token = tokens[i];
                    this.event.semanticTokens.push({
                        range: token.range,
                        tokenType: vscode_languageserver_protocol_1.SemanticTokenTypes.namespace
                    });
                }
                //class name
                this.event.semanticTokens.push({
                    range: tokens.pop().range,
                    tokenType: vscode_languageserver_protocol_1.SemanticTokenTypes.class
                });
            }
        }
    }
    handleEnums() {
        var _a, _b, _c;
        const enumLookup = (_a = this.event.file.program.getFirstScopeForFile(this.event.file)) === null || _a === void 0 ? void 0 : _a.getEnumMap();
        for (const expression of this.event.file.parser.references.expressions) {
            const parts = (_b = util_1.default.getAllDottedGetParts(expression)) === null || _b === void 0 ? void 0 : _b.map(x => x.toLowerCase());
            if (parts) {
                //discard the enum member name
                const memberName = parts.pop();
                //get the name of the enum (including leading namespace if applicable)
                const enumName = parts.join('.');
                const lowerEnumName = enumName.toLowerCase();
                const theEnum = (_c = enumLookup.get(lowerEnumName)) === null || _c === void 0 ? void 0 : _c.item;
                if (theEnum) {
                    const tokens = util_1.default.splitGetRange('.', lowerEnumName + '.' + memberName, expression.range);
                    //enum member name
                    this.event.semanticTokens.push({
                        range: tokens.pop().range,
                        tokenType: vscode_languageserver_protocol_1.SemanticTokenTypes.enumMember
                    });
                    //enum name
                    this.event.semanticTokens.push({
                        range: tokens.pop().range,
                        tokenType: vscode_languageserver_protocol_1.SemanticTokenTypes.enum
                    });
                    //namespace parts
                    for (const token of tokens) {
                        this.event.semanticTokens.push({
                            range: token.range,
                            tokenType: vscode_languageserver_protocol_1.SemanticTokenTypes.namespace
                        });
                    }
                }
            }
        }
    }
}
exports.BrsFileSemanticTokensProcessor = BrsFileSemanticTokensProcessor;
//# sourceMappingURL=BrsFileSemanticTokensProcessor.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrsFileValidator = void 0;
const __1 = require("../..");
const DiagnosticMessages_1 = require("../../DiagnosticMessages");
const TokenKind_1 = require("../../lexer/TokenKind");
class BrsFileValidator {
    constructor(event) {
        this.event = event;
    }
    process() {
        this.validateEnumDeclarations();
    }
    validateEnumDeclarations() {
        var _a, _b, _c, _d, _e;
        const diagnostics = [];
        for (const stmt of this.event.file.parser.references.enumStatements) {
            const members = stmt.getMembers();
            //the enum data type is based on the first member value
            const enumValueKind = (_d = (_c = (_b = (_a = members.find(x => x.value)) === null || _a === void 0 ? void 0 : _a.value) === null || _b === void 0 ? void 0 : _b.token) === null || _c === void 0 ? void 0 : _c.kind) !== null && _d !== void 0 ? _d : TokenKind_1.TokenKind.IntegerLiteral;
            const memberNames = new Set();
            for (const member of members) {
                const memberNameLower = (_e = member.name) === null || _e === void 0 ? void 0 : _e.toLowerCase();
                /**
                 * flag duplicate member names
                 */
                if (memberNames.has(memberNameLower)) {
                    diagnostics.push(Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.duplicateIdentifier(member.name)), { file: this.event.file, range: member.range }));
                }
                else {
                    memberNames.add(memberNameLower);
                }
                //Enforce all member values are the same type
                this.validateEnumValueTypes(diagnostics, member, enumValueKind);
            }
        }
        this.event.file.addDiagnostics(diagnostics);
    }
    validateEnumValueTypes(diagnostics, member, enumValueKind) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const memberValueKind = (_b = (_a = member.value) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.kind;
        if (
        //is integer enum, has value, that value type is not integer
        (enumValueKind === TokenKind_1.TokenKind.IntegerLiteral && memberValueKind && memberValueKind !== enumValueKind) ||
            //has value, that value is not a literal
            (member.value && !(0, __1.isLiteralExpression)(member.value))) {
            diagnostics.push(Object.assign(Object.assign({ file: this.event.file }, DiagnosticMessages_1.DiagnosticMessages.enumValueMustBeType(enumValueKind.replace(/literal$/i, '').toLowerCase())), { range: (_d = ((_c = member.value) !== null && _c !== void 0 ? _c : member)) === null || _d === void 0 ? void 0 : _d.range }));
        }
        //is non integer value
        if (enumValueKind !== TokenKind_1.TokenKind.IntegerLiteral) {
            //default value present
            if (memberValueKind) {
                //member value is same as enum
                if (memberValueKind !== enumValueKind) {
                    diagnostics.push(Object.assign(Object.assign({ file: this.event.file }, DiagnosticMessages_1.DiagnosticMessages.enumValueMustBeType(enumValueKind.replace(/literal$/i, '').toLowerCase())), { range: (_f = ((_e = member.value) !== null && _e !== void 0 ? _e : member)) === null || _f === void 0 ? void 0 : _f.range }));
                }
                //default value missing
            }
            else {
                diagnostics.push(Object.assign(Object.assign({ file: this.event.file }, DiagnosticMessages_1.DiagnosticMessages.enumValueIsRequired(enumValueKind.replace(/literal$/i, '').toLowerCase())), { range: (_h = ((_g = member.value) !== null && _g !== void 0 ? _g : member)) === null || _h === void 0 ? void 0 : _h.range }));
            }
        }
    }
}
exports.BrsFileValidator = BrsFileValidator;
//# sourceMappingURL=BrsFileValidator.js.map
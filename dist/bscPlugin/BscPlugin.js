"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BscPlugin = void 0;
const reflection_1 = require("../astUtils/reflection");
const CodeActionsProcessor_1 = require("./codeActions/CodeActionsProcessor");
const BrsFileSemanticTokensProcessor_1 = require("./semanticTokens/BrsFileSemanticTokensProcessor");
const BrsFilePreTranspileProcessor_1 = require("./transpile/BrsFilePreTranspileProcessor");
const BrsFileValidator_1 = require("./validation/BrsFileValidator");
const ScopeValidator_1 = require("./validation/ScopeValidator");
class BscPlugin {
    constructor() {
        this.name = 'BscPlugin';
        this.scopeValidator = new ScopeValidator_1.ScopeValidator();
    }
    onGetCodeActions(event) {
        new CodeActionsProcessor_1.CodeActionsProcessor(event).process();
    }
    onGetSemanticTokens(event) {
        if ((0, reflection_1.isBrsFile)(event.file)) {
            return new BrsFileSemanticTokensProcessor_1.BrsFileSemanticTokensProcessor(event).process();
        }
    }
    onFileValidate(event) {
        if ((0, reflection_1.isBrsFile)(event.file)) {
            return new BrsFileValidator_1.BrsFileValidator(event).process();
        }
    }
    onScopeValidate(event) {
        this.scopeValidator.processEvent(event);
    }
    afterProgramValidate(program) {
        //release memory once the validation cycle has finished
        this.scopeValidator.reset();
    }
    beforeFileTranspile(event) {
        if ((0, reflection_1.isBrsFile)(event.file)) {
            return new BrsFilePreTranspileProcessor_1.BrsFilePreTranspileProcessor(event).process();
        }
    }
}
exports.BscPlugin = BscPlugin;
//# sourceMappingURL=BscPlugin.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
const Program_1 = require("../../Program");
const testHelpers_spec_1 = require("../../testHelpers.spec");
const util_1 = require("../../util");
const rootDir = (0, util_1.standardizePath) `${process.cwd()}/.tmp/rootDir`;
describe('BrsFileSemanticTokensProcessor', () => {
    let program;
    beforeEach(() => {
        program = new Program_1.Program({
            rootDir: rootDir
        });
    });
    afterEach(() => {
        program.dispose();
    });
    it('matches each namespace section for class', () => {
        const file = program.setFile('source/main.bs', `
            namespace Earthlings.Humanoids
                class Person
                end class
            end namespace
            class Dog
                sub new()
                    m.owner = new Earthlings.Humanoids.Person()
                end sub
            end class
        `);
        program.validate();
        (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
        (0, chai_1.expect)(program.getSemanticTokens(file.pathAbsolute)).to.eql([{
                range: util_1.util.createRange(7, 34, 7, 44),
                tokenType: vscode_languageserver_protocol_1.SemanticTokenTypes.namespace
            }, {
                range: util_1.util.createRange(7, 45, 7, 54),
                tokenType: vscode_languageserver_protocol_1.SemanticTokenTypes.namespace
            }, {
                range: util_1.util.createRange(7, 55, 7, 61),
                tokenType: vscode_languageserver_protocol_1.SemanticTokenTypes.class
            }]);
    });
    it('matches each namespace section', () => {
        const file = program.setFile('source/main.bs', `
            sub main()
                print Earthlings.Species.Human.Male
            end sub
            namespace Earthlings.Species
                enum Human
                    Male
                    Female
                end enum
            end namespace
        `);
        program.validate();
        (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
        (0, chai_1.expect)(util_1.util.sortByRange(program.getSemanticTokens(file.pathAbsolute))).to.eql([{
                range: util_1.util.createRange(2, 22, 2, 32),
                tokenType: vscode_languageserver_protocol_1.SemanticTokenTypes.namespace
            }, {
                range: util_1.util.createRange(2, 33, 2, 40),
                tokenType: vscode_languageserver_protocol_1.SemanticTokenTypes.namespace
            }, {
                range: util_1.util.createRange(2, 41, 2, 46),
                tokenType: vscode_languageserver_protocol_1.SemanticTokenTypes.enum
            }, {
                range: util_1.util.createRange(2, 47, 2, 51),
                tokenType: vscode_languageserver_protocol_1.SemanticTokenTypes.enumMember
            }]);
    });
});
//# sourceMappingURL=BrsFileSemanticTokensProcessor.spec.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const Statement_1 = require("./Statement");
const Parser_1 = require("./Parser");
const visitors_1 = require("../astUtils/visitors");
const vscode_languageserver_1 = require("vscode-languageserver");
const Expression_1 = require("./Expression");
const Program_1 = require("../Program");
const path = require("path");
const testHelpers_spec_1 = require("../testHelpers.spec");
const tempDir = path.join(process.cwd(), '.tmp');
describe('Statement', () => {
    let program;
    beforeEach(() => {
        program = new Program_1.Program({
            cwd: tempDir
        });
    });
    describe('EmptyStatement', () => {
        it('returns empty array for transpile', () => {
            const statement = new Statement_1.EmptyStatement();
            (0, chai_1.expect)(statement.transpile({})).to.eql([]);
        });
        it('does nothing for walkAll', () => {
            const statement = new Statement_1.EmptyStatement();
            statement.walk(() => {
                (0, chai_1.expect)(true).to.be.false;
            }, { walkMode: visitors_1.WalkMode.visitAllRecursive });
        });
    });
    describe('Body', () => {
        it('initializes statements array if none provided', () => {
            const body = new Statement_1.Body();
            (0, chai_1.expect)(body.statements).to.eql([]);
        });
    });
    describe('NamespaceStatement', () => {
        it('getName() works', () => {
            const parser = Parser_1.Parser.parse(`
                namespace NameA.NameB
                end namespace
            `);
            const statement = parser.ast.statements[0];
            (0, chai_1.expect)(statement.getName(Parser_1.ParseMode.BrighterScript)).to.equal('NameA.NameB');
            (0, chai_1.expect)(statement.getName(Parser_1.ParseMode.BrightScript)).to.equal('NameA_NameB');
        });
    });
    describe('CommentStatement', () => {
        describe('walk', () => {
            it('skips visitor if canceled', () => {
                const comment = new Statement_1.CommentStatement([]);
                const cancel = new vscode_languageserver_1.CancellationTokenSource();
                cancel.cancel();
                comment.walk(() => {
                    throw new Error('Should not have been called');
                }, { walkMode: visitors_1.WalkMode.visitAllRecursive, cancel: cancel.token });
            });
        });
    });
    describe('ClassStatement', () => {
        function create(name, namespaceName) {
            let stmt = new Statement_1.ClassStatement({ range: vscode_languageserver_1.Range.create(0, 0, 0, 0) }, { text: name }, null, { range: vscode_languageserver_1.Range.create(0, 0, 0, 0) }, null, null, namespaceName ? new Expression_1.NamespacedVariableNameExpression(new Expression_1.VariableExpression({ text: namespaceName }, null)) : null);
            return stmt;
        }
        describe('getName', () => {
            it('handles null namespace name', () => {
                let stmt = create('Animal');
                (0, chai_1.expect)(stmt.getName(Parser_1.ParseMode.BrightScript)).to.equal('Animal');
                (0, chai_1.expect)(stmt.getName(Parser_1.ParseMode.BrighterScript)).to.equal('Animal');
            });
            it('handles namespaces', () => {
                let stmt = create('Animal', 'NameA');
                (0, chai_1.expect)(stmt.getName(Parser_1.ParseMode.BrightScript)).to.equal('NameA_Animal');
                (0, chai_1.expect)(stmt.getName(Parser_1.ParseMode.BrighterScript)).to.equal('NameA.Animal');
            });
        });
    });
    describe('ImportStatement', () => {
        describe('getTypedef', () => {
            it('changes .bs file extensions to .brs', () => {
                const file = program.setFile('source/main.bs', `
                    import "lib1.bs"
                    import "pkg:/source/lib2.bs"
                `);
                (0, chai_1.expect)((0, testHelpers_spec_1.trim) `${file.getTypedef()}`).to.eql((0, testHelpers_spec_1.trim) `
                    import "lib1.brs"
                    import "pkg:/source/lib2.brs"
                `);
            });
        });
    });
});
//# sourceMappingURL=Statement.spec.js.map
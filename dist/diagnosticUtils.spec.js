"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const diagnosticUtils = require("./diagnosticUtils");
const vscode_languageserver_1 = require("vscode-languageserver");
const util_1 = require("./util");
const chalk_1 = require("chalk");
describe('diagnosticUtils', () => {
    let options;
    beforeEach(() => {
        options = diagnosticUtils.getPrintDiagnosticOptions({});
    });
    describe('printDiagnostic', () => {
        it('does not crash when range is undefined', () => {
            //print a diagnostic that doesn't have a range...it should not explode
            diagnosticUtils.printDiagnostic(options, vscode_languageserver_1.DiagnosticSeverity.Error, './temp/file.brs', [], {
                message: 'Bad thing happened',
                range: null,
                code: 1234
            });
        });
        it('does not crash when filie path is missing', () => {
            //print a diagnostic that doesn't have a range...it should not explode
            diagnosticUtils.printDiagnostic(options, vscode_languageserver_1.DiagnosticSeverity.Error, undefined, [], {
                message: 'Bad thing happened',
                range: vscode_languageserver_1.Range.create(0, 0, 2, 2),
                code: 1234
            });
        });
    });
    describe('getPrintDiagnosticOptions', () => {
        let options;
        it('prepares cwd value', () => {
            options = diagnosticUtils.getPrintDiagnosticOptions({ cwd: 'cwd' });
            (0, chai_1.expect)(options.cwd).to.equal('cwd');
            // default value
            options = diagnosticUtils.getPrintDiagnosticOptions({});
            (0, chai_1.expect)(options.cwd).to.equal(process.cwd());
        });
        it('prepares emitFullPaths value', () => {
            options = diagnosticUtils.getPrintDiagnosticOptions({ emitFullPaths: true });
            (0, chai_1.expect)(options.emitFullPaths).to.equal(true);
            options = diagnosticUtils.getPrintDiagnosticOptions({ emitFullPaths: false });
            (0, chai_1.expect)(options.emitFullPaths).to.equal(false);
            // default value
            options = diagnosticUtils.getPrintDiagnosticOptions({});
            (0, chai_1.expect)(options.emitFullPaths).to.equal(false);
        });
        it('maps diagnosticLevel to severityLevel', () => {
            options = diagnosticUtils.getPrintDiagnosticOptions({ diagnosticLevel: 'info' });
            (0, chai_1.expect)(options.severityLevel).to.equal(vscode_languageserver_1.DiagnosticSeverity.Information);
            options = diagnosticUtils.getPrintDiagnosticOptions({ diagnosticLevel: 'hint' });
            (0, chai_1.expect)(options.severityLevel).to.equal(vscode_languageserver_1.DiagnosticSeverity.Hint);
            options = diagnosticUtils.getPrintDiagnosticOptions({ diagnosticLevel: 'warn' });
            (0, chai_1.expect)(options.severityLevel).to.equal(vscode_languageserver_1.DiagnosticSeverity.Warning);
            options = diagnosticUtils.getPrintDiagnosticOptions({ diagnosticLevel: 'error' });
            (0, chai_1.expect)(options.severityLevel).to.equal(vscode_languageserver_1.DiagnosticSeverity.Error);
            // default value
            options = diagnosticUtils.getPrintDiagnosticOptions({});
            (0, chai_1.expect)(options.severityLevel).to.equal(vscode_languageserver_1.DiagnosticSeverity.Warning);
            options = diagnosticUtils.getPrintDiagnosticOptions({ diagnosticLevel: 'x' });
            (0, chai_1.expect)(options.severityLevel).to.equal(vscode_languageserver_1.DiagnosticSeverity.Warning);
        });
        it('prepares the include map', () => {
            options = diagnosticUtils.getPrintDiagnosticOptions({ diagnosticLevel: 'info' });
            (0, chai_1.expect)(options.includeDiagnostic).to.deep.equal({
                [vscode_languageserver_1.DiagnosticSeverity.Information]: true,
                [vscode_languageserver_1.DiagnosticSeverity.Hint]: true,
                [vscode_languageserver_1.DiagnosticSeverity.Warning]: true,
                [vscode_languageserver_1.DiagnosticSeverity.Error]: true
            });
            options = diagnosticUtils.getPrintDiagnosticOptions({ diagnosticLevel: 'hint' });
            (0, chai_1.expect)(options.includeDiagnostic).to.deep.equal({
                [vscode_languageserver_1.DiagnosticSeverity.Hint]: true,
                [vscode_languageserver_1.DiagnosticSeverity.Warning]: true,
                [vscode_languageserver_1.DiagnosticSeverity.Error]: true
            });
            options = diagnosticUtils.getPrintDiagnosticOptions({ diagnosticLevel: 'warn' });
            (0, chai_1.expect)(options.includeDiagnostic).to.deep.equal({
                [vscode_languageserver_1.DiagnosticSeverity.Warning]: true,
                [vscode_languageserver_1.DiagnosticSeverity.Error]: true
            });
            options = diagnosticUtils.getPrintDiagnosticOptions({ diagnosticLevel: 'error' });
            (0, chai_1.expect)(options.includeDiagnostic).to.deep.equal({
                [vscode_languageserver_1.DiagnosticSeverity.Error]: true
            });
        });
    });
    describe('getDiagnosticSquiggly', () => {
        it('works for normal cases', () => {
            (0, chai_1.expect)(diagnosticUtils.getDiagnosticSquigglyText({
                range: vscode_languageserver_1.Range.create(0, 0, 0, 4)
            }, 'asdf')).to.equal('~~~~');
        });
        it('highlights whole line if no range', () => {
            (0, chai_1.expect)(diagnosticUtils.getDiagnosticSquigglyText({}, ' asdf ')).to.equal('~~~~~~');
        });
        it('returns empty string when no line is found', () => {
            (0, chai_1.expect)(diagnosticUtils.getDiagnosticSquigglyText({
                range: vscode_languageserver_1.Range.create(0, 0, 0, 10)
            }, '')).to.equal('');
            (0, chai_1.expect)(diagnosticUtils.getDiagnosticSquigglyText({
                range: vscode_languageserver_1.Range.create(0, 0, 0, 10)
            }, undefined)).to.equal('');
        });
        it('supports diagnostic not at start of line', () => {
            (0, chai_1.expect)(diagnosticUtils.getDiagnosticSquigglyText({
                range: vscode_languageserver_1.Range.create(0, 2, 0, 6)
            }, '  asdf')).to.equal('  ~~~~');
        });
        it('supports diagnostic that does not finish at end of line', () => {
            (0, chai_1.expect)(diagnosticUtils.getDiagnosticSquigglyText({
                range: vscode_languageserver_1.Range.create(0, 0, 0, 4)
            }, 'asdf  ')).to.equal('~~~~  ');
        });
        it('supports diagnostic with space on both sides', () => {
            (0, chai_1.expect)(diagnosticUtils.getDiagnosticSquigglyText({
                range: vscode_languageserver_1.Range.create(0, 2, 0, 6)
            }, '  asdf  ')).to.equal('  ~~~~  ');
        });
        it('handles diagnostic that starts and stops on the same position', () => {
            (0, chai_1.expect)(diagnosticUtils.getDiagnosticSquigglyText({
                range: vscode_languageserver_1.Range.create(0, 2, 0, 2)
            }, 'abcde')).to.equal('~~~~~');
        });
        it('handles single-character diagnostic', () => {
            (0, chai_1.expect)(diagnosticUtils.getDiagnosticSquigglyText({
                range: vscode_languageserver_1.Range.create(0, 2, 0, 3)
            }, 'abcde')).to.equal('  ~  ');
        });
        it('handles diagnostics that are longer than the line', () => {
            (0, chai_1.expect)(diagnosticUtils.getDiagnosticSquigglyText({
                range: vscode_languageserver_1.Range.create(0, 0, 0, 10)
            }, 'abcde')).to.equal('~~~~~');
            (0, chai_1.expect)(diagnosticUtils.getDiagnosticSquigglyText({
                range: vscode_languageserver_1.Range.create(0, 2, 0, 10)
            }, 'abcde')).to.equal('  ~~~');
        });
        it('handles Number.MAX_VALUE for end character', () => {
            (0, chai_1.expect)(diagnosticUtils.getDiagnosticSquigglyText({
                range: util_1.util.createRange(0, 0, 0, Number.MAX_VALUE)
            }, 'abcde')).to.equal('~~~~~');
        });
        it.skip('handles edge cases', () => {
            (0, chai_1.expect)(diagnosticUtils.getDiagnosticSquigglyText({
                range: vscode_languageserver_1.Range.create(5, 16, 5, 18)
            }, 'end functionasdf')).to.equal('            ~~~~');
        });
    });
    describe('getDiagnosticLine', () => {
        const color = ((text) => text);
        function testGetDiagnosticLine(range, squigglyText, lineLength = 20) {
            (0, chai_1.expect)(diagnosticUtils.getDiagnosticLine({ range: range }, '1'.repeat(lineLength), color)).to.eql([
                chalk_1.default.bgWhite(' ' + chalk_1.default.black((range.start.line + 1).toString()) + ' ') + ' ' + '1'.repeat(lineLength),
                chalk_1.default.bgWhite(' ' + chalk_1.default.white('_'.repeat((range.start.line + 1).toString().length)) + ' ') + ' ' + squigglyText.padEnd(lineLength, ' ')
            ].join('\n'));
        }
        it('lines up at beginning of line for single-digit line num', () => {
            testGetDiagnosticLine(util_1.util.createRange(0, 0, 0, 5), '~~~~~');
        });
        it('lines up in middle of line for single-digit line num', () => {
            testGetDiagnosticLine(util_1.util.createRange(0, 5, 0, 10), '     ~~~~~');
        });
        it('lines up at end of line for single-digit line num', () => {
            testGetDiagnosticLine(util_1.util.createRange(0, 5, 0, 10), '     ~~~~~', 10);
        });
        it('lines up at beginning of line for double-digit line num', () => {
            testGetDiagnosticLine(util_1.util.createRange(15, 0, 15, 5), '~~~~~');
        });
        it('lines up in middle of line for double-digit line num', () => {
            testGetDiagnosticLine(util_1.util.createRange(15, 5, 15, 10), '     ~~~~~');
        });
        it('lines up at end of line for double-digit line num', () => {
            testGetDiagnosticLine(util_1.util.createRange(15, 5, 15, 10), '     ~~~~~', 10);
        });
    });
});
//# sourceMappingURL=diagnosticUtils.spec.js.map
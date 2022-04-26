"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-for-in-array */
const chai_1 = require("chai");
const DiagnosticMessages_1 = require("../../../DiagnosticMessages");
const Lexer_1 = require("../../../lexer/Lexer");
const Parser_1 = require("../../Parser");
const Statement_1 = require("../../Statement");
const Expression_1 = require("../../Expression");
const Program_1 = require("../../../Program");
const testHelpers_spec_1 = require("../../../testHelpers.spec");
describe('NullCoalescingExpression', () => {
    it('throws exception when used in brightscript scope', () => {
        var _a;
        let { tokens } = Lexer_1.Lexer.scan(`a = user ?? {"id": "default"}`);
        let { diagnostics } = Parser_1.Parser.parse(tokens, { mode: Parser_1.ParseMode.BrightScript });
        (0, chai_1.expect)((_a = diagnostics[0]) === null || _a === void 0 ? void 0 : _a.code).to.equal(DiagnosticMessages_1.DiagnosticMessages.bsFeatureNotSupportedInBrsFiles('').code);
    });
    describe('null coalescing as statements are not supported', () => {
        it(`rejects various consequents with primitive values:`, () => {
            //test as property
            for (const test in [
                'true',
                'false',
                'len("person") = 10',
                'm.getResponse()',
                'm.myZombies[3].ifFed = true'
            ]) {
                let { tokens } = Lexer_1.Lexer.scan(`${test} ?? "human"`);
                let { statements, diagnostics } = Parser_1.Parser.parse(tokens, { mode: Parser_1.ParseMode.BrighterScript });
                (0, chai_1.expect)(diagnostics).to.not.be.empty;
                (0, chai_1.expect)(statements).to.be.empty;
            }
        });
    });
    describe('invalid coalescene - variety of test cases', () => {
        it(`rejects various consequents with primitive values:`, () => {
            //test as property
            for (const test in [
                'result = true',
                'result = false',
                'result = len("person") = 10',
                'result = m.getResponse()',
                'result = m.myZombies[3].ifFed = true'
            ]) {
                let { tokens } = Lexer_1.Lexer.scan(`${test} ?? "human"`);
                let { statements, diagnostics } = Parser_1.Parser.parse(tokens, { mode: Parser_1.ParseMode.BrighterScript });
                (0, chai_1.expect)(diagnostics).to.not.be.empty;
                (0, chai_1.expect)(statements).to.be.empty;
            }
        });
        it(`supports non-primitive alternates:`, () => {
            //test as property
            for (const consequent in [
                'true',
                'false',
                'len("person") = 10',
                'm.getResponse()',
                'm.myZombies[3].ifFed = true',
                'getZombieName()'
            ]) {
                let { tokens } = Lexer_1.Lexer.scan(`result = "text" ?? ${consequent}`);
                let { statements, diagnostics } = Parser_1.Parser.parse(tokens, { mode: Parser_1.ParseMode.BrighterScript });
                (0, testHelpers_spec_1.expectZeroDiagnostics)(diagnostics);
                (0, chai_1.expect)(statements[0]).instanceof(Statement_1.AssignmentStatement);
                (0, chai_1.expect)(statements[0].value).instanceof(Expression_1.NullCoalescingExpression);
            }
        });
    });
    describe('in assignment', () => {
        it(`simple case`, () => {
            let { tokens } = Lexer_1.Lexer.scan(`a = user ?? {"id": "default"}`);
            let { statements, diagnostics } = Parser_1.Parser.parse(tokens, { mode: Parser_1.ParseMode.BrighterScript });
            (0, testHelpers_spec_1.expectZeroDiagnostics)(diagnostics);
            (0, chai_1.expect)(statements[0]).instanceof(Statement_1.AssignmentStatement);
        });
        it(`multi line arrays case`, () => {
            let { tokens } = Lexer_1.Lexer.scan(`a = items ?? [
          "one"
          "two"
          "three"]`);
            let { statements, diagnostics } = Parser_1.Parser.parse(tokens, { mode: Parser_1.ParseMode.BrighterScript });
            (0, testHelpers_spec_1.expectZeroDiagnostics)(diagnostics);
            (0, chai_1.expect)(statements[0]).instanceof(Statement_1.AssignmentStatement);
        });
        it(`multi line assoc array`, () => {
            let { tokens } = Lexer_1.Lexer.scan(`a = user ?? {
          "b": "test"
          }`);
            let { statements, diagnostics } = Parser_1.Parser.parse(tokens, { mode: Parser_1.ParseMode.BrighterScript });
            (0, testHelpers_spec_1.expectZeroDiagnostics)(diagnostics);
            (0, chai_1.expect)(statements[0]).instanceof(Statement_1.AssignmentStatement);
        });
        it(`in func call with array args`, () => {
            let { tokens } = Lexer_1.Lexer.scan(`m.eatBrains(user ?? defaultUser)`);
            let { statements, diagnostics } = Parser_1.Parser.parse(tokens, { mode: Parser_1.ParseMode.BrighterScript });
            (0, testHelpers_spec_1.expectZeroDiagnostics)(diagnostics);
            (0, chai_1.expect)(statements[0]).instanceof(Statement_1.ExpressionStatement);
            (0, chai_1.expect)(statements[0].expression).instanceof(Expression_1.CallExpression);
            let callExpression = statements[0].expression;
            (0, chai_1.expect)(callExpression.args.length).to.equal(1);
            (0, chai_1.expect)(callExpression.args[0]).instanceof(Expression_1.NullCoalescingExpression);
        });
        it(`in func call with more args`, () => {
            let { tokens } = Lexer_1.Lexer.scan(`m.eatBrains(user ?? defaultUser, true, 12)`);
            let { statements, diagnostics } = Parser_1.Parser.parse(tokens, { mode: Parser_1.ParseMode.BrighterScript });
            (0, testHelpers_spec_1.expectZeroDiagnostics)(diagnostics);
            (0, chai_1.expect)(statements[0]).instanceof(Statement_1.ExpressionStatement);
            (0, chai_1.expect)(statements[0].expression).instanceof(Expression_1.CallExpression);
            let callExpression = statements[0].expression;
            (0, chai_1.expect)(callExpression.args.length).to.equal(3);
            (0, chai_1.expect)(callExpression.args[0]).instanceof(Expression_1.NullCoalescingExpression);
        });
        it(`in func call with more args, and comparing value`, () => {
            let { tokens } = Lexer_1.Lexer.scan(`m.eatBrains((items ?? ["1","2"]).count() = 3, true, 12)`);
            let { statements, diagnostics } = Parser_1.Parser.parse(tokens, { mode: Parser_1.ParseMode.BrighterScript });
            (0, testHelpers_spec_1.expectZeroDiagnostics)(diagnostics);
            (0, chai_1.expect)(statements[0]).instanceof(Statement_1.ExpressionStatement);
            (0, chai_1.expect)(statements[0].expression).instanceof(Expression_1.CallExpression);
            let callExpression = statements[0].expression;
            (0, chai_1.expect)(callExpression.args.length).to.equal(3);
        });
        it(`in array`, () => {
            let { tokens } = Lexer_1.Lexer.scan(`a = [letter ?? "b", "c"]`);
            let { statements, diagnostics } = Parser_1.Parser.parse(tokens, { mode: Parser_1.ParseMode.BrighterScript });
            (0, testHelpers_spec_1.expectZeroDiagnostics)(diagnostics);
            (0, chai_1.expect)(statements[0]).instanceof(Statement_1.AssignmentStatement);
            (0, chai_1.expect)(statements[0].value).instanceof(Expression_1.ArrayLiteralExpression);
            let literalExpression = statements[0].value;
            (0, chai_1.expect)(literalExpression.elements[0]).instanceOf(Expression_1.NullCoalescingExpression);
            (0, chai_1.expect)(literalExpression.elements[1]).instanceOf(Expression_1.LiteralExpression);
        });
        it(`in aa`, () => {
            let { tokens } = Lexer_1.Lexer.scan(`a = {"v1": letter ?? "b", "v2": "c"}`);
            let { statements, diagnostics } = Parser_1.Parser.parse(tokens, { mode: Parser_1.ParseMode.BrighterScript });
            (0, testHelpers_spec_1.expectZeroDiagnostics)(diagnostics);
            (0, chai_1.expect)(statements[0]).instanceof(Statement_1.AssignmentStatement);
            (0, chai_1.expect)(statements[0].value).instanceof(Expression_1.AALiteralExpression);
            let literalExpression = statements[0].value;
            (0, chai_1.expect)(literalExpression.elements[0].keyToken.text).is.equal('"v1"');
            (0, chai_1.expect)(literalExpression.elements[0].value).instanceOf(Expression_1.NullCoalescingExpression);
            (0, chai_1.expect)(literalExpression.elements[1].keyToken.text).is.equal('"v2"');
            (0, chai_1.expect)(literalExpression.elements[1].value).instanceOf(Expression_1.LiteralExpression);
        });
        it(`in for each`, () => {
            let { tokens } = Lexer_1.Lexer.scan(`for each person in items ?? defaultItems
                ? "person is " ; person
            end for
            `);
            let { statements, diagnostics } = Parser_1.Parser.parse(tokens, { mode: Parser_1.ParseMode.BrighterScript });
            (0, testHelpers_spec_1.expectZeroDiagnostics)(diagnostics);
            (0, chai_1.expect)(statements[0]).instanceof(Statement_1.ForEachStatement);
            (0, chai_1.expect)(statements[0].target).instanceof(Expression_1.NullCoalescingExpression);
        });
    });
    describe('transpile', () => {
        let rootDir = process.cwd();
        let program;
        let testTranspile = (0, testHelpers_spec_1.getTestTranspile)(() => [program, rootDir]);
        beforeEach(() => {
            program = new Program_1.Program({ rootDir: rootDir });
        });
        afterEach(() => {
            program.dispose();
        });
        it('uses the proper prefix when aliased package is installed', () => {
            program.setFile('source/roku_modules/rokucommunity_bslib/bslib.brs', '');
            testTranspile('a = user ?? false', `a = rokucommunity_bslib_coalesce(user, false)`);
        });
        it('properly transpiles null coalesence assignments - simple', () => {
            testTranspile(`a = user ?? {"id": "default"}`, 'a = bslib_coalesce(user, {\n    "id": "default"\n})', 'none');
        });
        it('properly transpiles null coalesence assignments - complex consequent', () => {
            testTranspile(`a = user.getAccount() ?? {"id": "default"}`, `
                a = (function(user)
                        __bsConsequent = user.getAccount()
                        if __bsConsequent <> invalid then
                            return __bsConsequent
                        else
                            return {
                                "id": "default"
                            }
                        end if
                    end function)(user)
            `);
        });
        it('transpiles null coalesence assignment for variable alternate- complex consequent', () => {
            testTranspile(`a = obj.link ?? fallback`, `
                a = (function(fallback, obj)
                        __bsConsequent = obj.link
                        if __bsConsequent <> invalid then
                            return __bsConsequent
                        else
                            return fallback
                        end if
                    end function)(fallback, obj)
            `);
        });
        it('properly transpiles null coalesence assignments - complex alternate', () => {
            testTranspile(`a = user ?? m.defaults.getAccount(settings.name)`, `
                a = (function(m, settings, user)
                        __bsConsequent = user
                        if __bsConsequent <> invalid then
                            return __bsConsequent
                        else
                            return m.defaults.getAccount(settings.name)
                        end if
                    end function)(m, settings, user)
            `);
        });
    });
});
//# sourceMappingURL=NullCoalescenceExpression.spec.js.map
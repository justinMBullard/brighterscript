"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const Parser_1 = require("../../Parser");
const TokenKind_1 = require("../../../lexer/TokenKind");
const Parser_spec_1 = require("../Parser.spec");
const vscode_languageserver_1 = require("vscode-languageserver");
const DiagnosticMessages_1 = require("../../../DiagnosticMessages");
const Statement_1 = require("../../Statement");
describe('parser indexing', () => {
    describe('one level', () => {
        it('dotted', () => {
            let { statements, diagnostics } = Parser_1.Parser.parse([
                (0, Parser_spec_1.identifier)('_'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Equal, '='),
                (0, Parser_spec_1.identifier)('foo'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Dot, '.'),
                (0, Parser_spec_1.identifier)('bar'),
                Parser_spec_1.EOF
            ]);
            (0, chai_1.expect)(diagnostics).to.be.lengthOf(0);
            (0, chai_1.expect)(statements).to.exist;
            (0, chai_1.expect)(statements).not.to.be.null;
        });
        it('bracketed', () => {
            let { statements, diagnostics } = Parser_1.Parser.parse([
                (0, Parser_spec_1.identifier)('_'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Equal, '='),
                (0, Parser_spec_1.identifier)('foo'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.LeftSquareBracket, '['),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.IntegerLiteral, '2'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.RightSquareBracket, ']'),
                Parser_spec_1.EOF
            ]);
            (0, chai_1.expect)(diagnostics).to.be.lengthOf(0);
            (0, chai_1.expect)(statements).to.exist;
            (0, chai_1.expect)(statements).not.to.be.null;
        });
        describe('dotted and bracketed', () => {
            it('single dot', () => {
                let { statements, diagnostics } = Parser_1.Parser.parse([
                    (0, Parser_spec_1.identifier)('_'),
                    (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Equal, '='),
                    (0, Parser_spec_1.identifier)('foo'),
                    (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Dot, '.'),
                    (0, Parser_spec_1.token)(TokenKind_1.TokenKind.LeftSquareBracket, '['),
                    (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Integer, '2'),
                    (0, Parser_spec_1.token)(TokenKind_1.TokenKind.RightSquareBracket, ']'),
                    Parser_spec_1.EOF
                ]);
                (0, chai_1.expect)(diagnostics).to.be.empty;
                (0, chai_1.expect)(statements[0]).to.be.instanceof(Statement_1.AssignmentStatement);
            });
            it('multiple dots', () => {
                var _a;
                let { diagnostics } = Parser_1.Parser.parse([
                    (0, Parser_spec_1.identifier)('_'),
                    (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Equal, '='),
                    (0, Parser_spec_1.identifier)('foo'),
                    (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Dot, '.'),
                    (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Dot, '.'),
                    (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Dot, '.'),
                    (0, Parser_spec_1.token)(TokenKind_1.TokenKind.LeftSquareBracket, '['),
                    (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Integer, '2'),
                    (0, Parser_spec_1.token)(TokenKind_1.TokenKind.RightSquareBracket, ']'),
                    Parser_spec_1.EOF
                ]);
                (0, chai_1.expect)(diagnostics.length).to.equal(1);
                (0, chai_1.expect)((_a = diagnostics[0]) === null || _a === void 0 ? void 0 : _a.message).to.exist.and.to.equal(DiagnosticMessages_1.DiagnosticMessages.expectedPropertyNameAfterPeriod().message);
            });
        });
        it('location tracking', () => {
            /**
             *    0   0   0   1
             *    0   4   8   2
             *  +--------------
             * 0| a = foo.bar
             * 1| b = foo[2]
             */
            let { statements, diagnostics } = Parser_1.Parser.parse([
                {
                    kind: TokenKind_1.TokenKind.Identifier,
                    text: 'a',
                    isReserved: false,
                    range: vscode_languageserver_1.Range.create(0, 0, 0, 1)
                },
                {
                    kind: TokenKind_1.TokenKind.Equal,
                    text: '=',
                    isReserved: false,
                    range: vscode_languageserver_1.Range.create(0, 2, 0, 3)
                },
                {
                    kind: TokenKind_1.TokenKind.Identifier,
                    text: 'foo',
                    isReserved: false,
                    range: vscode_languageserver_1.Range.create(0, 4, 0, 7)
                },
                {
                    kind: TokenKind_1.TokenKind.Dot,
                    text: '.',
                    isReserved: false,
                    range: vscode_languageserver_1.Range.create(0, 7, 0, 8)
                },
                {
                    kind: TokenKind_1.TokenKind.Identifier,
                    text: 'bar',
                    isReserved: false,
                    range: vscode_languageserver_1.Range.create(0, 8, 0, 11)
                },
                {
                    kind: TokenKind_1.TokenKind.Newline,
                    text: '\n',
                    isReserved: false,
                    range: vscode_languageserver_1.Range.create(0, 11, 0, 12)
                },
                {
                    kind: TokenKind_1.TokenKind.Identifier,
                    text: 'b',
                    isReserved: false,
                    range: vscode_languageserver_1.Range.create(1, 0, 1, 1)
                },
                {
                    kind: TokenKind_1.TokenKind.Equal,
                    text: '=',
                    isReserved: false,
                    range: vscode_languageserver_1.Range.create(1, 2, 1, 3)
                },
                {
                    kind: TokenKind_1.TokenKind.Identifier,
                    text: 'bar',
                    isReserved: false,
                    range: vscode_languageserver_1.Range.create(1, 4, 1, 7)
                },
                {
                    kind: TokenKind_1.TokenKind.LeftSquareBracket,
                    text: '[',
                    isReserved: false,
                    range: vscode_languageserver_1.Range.create(1, 7, 1, 8)
                },
                {
                    kind: TokenKind_1.TokenKind.IntegerLiteral,
                    text: '2',
                    isReserved: false,
                    range: vscode_languageserver_1.Range.create(1, 8, 1, 9)
                },
                {
                    kind: TokenKind_1.TokenKind.RightSquareBracket,
                    text: ']',
                    isReserved: false,
                    range: vscode_languageserver_1.Range.create(1, 9, 1, 10)
                },
                {
                    kind: TokenKind_1.TokenKind.Eof,
                    text: '\0',
                    isReserved: false,
                    range: vscode_languageserver_1.Range.create(1, 10, 1, 11)
                }
            ]);
            (0, chai_1.expect)(diagnostics).to.be.lengthOf(0);
            (0, chai_1.expect)(statements).to.be.lengthOf(2);
            (0, chai_1.expect)(statements.map(s => s.value.range)).to.deep.equal([
                vscode_languageserver_1.Range.create(0, 4, 0, 11),
                vscode_languageserver_1.Range.create(1, 4, 1, 10)
            ]);
        });
    });
    describe('multi-level', () => {
        it('dotted', () => {
            let { statements, diagnostics } = Parser_1.Parser.parse([
                (0, Parser_spec_1.identifier)('_'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Equal, '='),
                (0, Parser_spec_1.identifier)('foo'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Dot, '.'),
                (0, Parser_spec_1.identifier)('bar'),
                Parser_spec_1.EOF
            ]);
            (0, chai_1.expect)(diagnostics).to.be.lengthOf(0);
            (0, chai_1.expect)(statements).to.be.length.greaterThan(0);
        });
        it('bracketed', () => {
            let { statements, diagnostics } = Parser_1.Parser.parse([
                (0, Parser_spec_1.identifier)('_'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Equal, '='),
                (0, Parser_spec_1.identifier)('foo'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.LeftSquareBracket, '['),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.IntegerLiteral, '2'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.RightSquareBracket, ']'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.LeftSquareBracket, '['),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.IntegerLiteral, '0'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.RightSquareBracket, ']'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.LeftSquareBracket, '['),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.IntegerLiteral, '6'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.RightSquareBracket, ']'),
                Parser_spec_1.EOF
            ]);
            (0, chai_1.expect)(diagnostics).to.be.lengthOf(0);
            (0, chai_1.expect)(statements).to.be.length.greaterThan(0);
        });
        it('mixed', () => {
            let { statements, diagnostics } = Parser_1.Parser.parse([
                (0, Parser_spec_1.identifier)('_'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Equal, '='),
                (0, Parser_spec_1.identifier)('foo'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Dot, '.'),
                (0, Parser_spec_1.identifier)('bar'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.LeftSquareBracket, '['),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.IntegerLiteral, '0'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.RightSquareBracket, ']'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Dot, '.'),
                (0, Parser_spec_1.identifier)('baz'),
                Parser_spec_1.EOF
            ]);
            (0, chai_1.expect)(diagnostics).to.be.lengthOf(0);
            (0, chai_1.expect)(statements).to.be.length.greaterThan(0);
        });
    });
});
//# sourceMappingURL=Indexing.spec.js.map
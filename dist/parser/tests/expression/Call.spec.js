"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const Parser_1 = require("../../Parser");
const Lexer_1 = require("../../../lexer/Lexer");
const TokenKind_1 = require("../../../lexer/TokenKind");
const Parser_spec_1 = require("../Parser.spec");
const vscode_languageserver_1 = require("vscode-languageserver");
describe('parser call expressions', () => {
    it('parses named function calls', () => {
        const { statements, diagnostics } = Parser_1.Parser.parse([
            (0, Parser_spec_1.identifier)('RebootSystem'),
            { kind: TokenKind_1.TokenKind.LeftParen, text: '(', range: null },
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.RightParen, ')'),
            Parser_spec_1.EOF
        ]);
        (0, chai_1.expect)(diagnostics).to.be.lengthOf(0);
        (0, chai_1.expect)(statements).to.be.length.greaterThan(0);
    });
    it('does not invalidate the rest of the file on incomplete statement', () => {
        const { tokens } = Lexer_1.Lexer.scan(`
            sub DoThingOne()
                DoThin
            end sub
            sub DoThingTwo()
            end sub
        `);
        const { statements, diagnostics } = Parser_1.Parser.parse(tokens);
        (0, chai_1.expect)(diagnostics).to.length.greaterThan(0);
        (0, chai_1.expect)(statements).to.be.length.greaterThan(0);
        //ALL of the diagnostics should be on the `DoThin` line
        let lineNumbers = diagnostics.map(x => x.range.start.line);
        for (let lineNumber of lineNumbers) {
            (0, chai_1.expect)(lineNumber).to.equal(2);
        }
    });
    it('does not invalidate the next statement on a multi-statement line', () => {
        const { tokens } = Lexer_1.Lexer.scan(`
            sub DoThingOne()
                'missing closing paren
                DoThin(:name = "bob"
            end sub
            sub DoThingTwo()
            end sub
        `);
        const { statements, diagnostics } = Parser_1.Parser.parse(tokens);
        //there should only be 1 error
        (0, chai_1.expect)(diagnostics).to.be.lengthOf(1);
        (0, chai_1.expect)(statements).to.be.length.greaterThan(0);
        //the error should be BEFORE the `name = "bob"` statement
        (0, chai_1.expect)(diagnostics[0].range.end.character).to.be.lessThan(25);
    });
    it('allows closing parentheses on separate line', () => {
        const { statements, diagnostics } = Parser_1.Parser.parse([
            (0, Parser_spec_1.identifier)('RebootSystem'),
            { kind: TokenKind_1.TokenKind.LeftParen, text: '(', range: null },
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Newline, '\\n'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Newline, '\\n'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.RightParen, ')'),
            Parser_spec_1.EOF
        ]);
        (0, chai_1.expect)(diagnostics).to.be.lengthOf(0);
        (0, chai_1.expect)(statements).to.be.length.greaterThan(0);
    });
    it('accepts arguments', () => {
        const { statements, diagnostics } = Parser_1.Parser.parse([
            (0, Parser_spec_1.identifier)('add'),
            { kind: TokenKind_1.TokenKind.LeftParen, text: '(', range: null },
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.IntegerLiteral, '1'),
            { kind: TokenKind_1.TokenKind.Comma, text: ',', range: null },
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.IntegerLiteral, '2'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.RightParen, ')'),
            Parser_spec_1.EOF
        ]);
        (0, chai_1.expect)(diagnostics).to.be.lengthOf(0);
        (0, chai_1.expect)(statements).to.be.length.greaterThan(0);
        (0, chai_1.expect)(statements[0].expression.args).to.be.ok;
    });
    it('location tracking', () => {
        /**
         *    0   0   0   1   1   2
         *    0   4   8   2   6   0
         *  +----------------------
         * 0| foo("bar", "baz")
         */
        const { statements, diagnostics } = Parser_1.Parser.parse([
            {
                kind: TokenKind_1.TokenKind.Identifier,
                text: 'foo',
                isReserved: false,
                range: vscode_languageserver_1.Range.create(0, 0, 0, 3)
            },
            {
                kind: TokenKind_1.TokenKind.LeftParen,
                text: '(',
                isReserved: false,
                range: vscode_languageserver_1.Range.create(0, 3, 0, 4)
            },
            {
                kind: TokenKind_1.TokenKind.StringLiteral,
                text: `"bar"`,
                isReserved: false,
                range: vscode_languageserver_1.Range.create(0, 4, 0, 9)
            },
            {
                kind: TokenKind_1.TokenKind.Comma,
                text: ',',
                isReserved: false,
                range: vscode_languageserver_1.Range.create(0, 9, 0, 10)
            },
            {
                kind: TokenKind_1.TokenKind.StringLiteral,
                text: `"baz"`,
                isReserved: false,
                range: vscode_languageserver_1.Range.create(0, 11, 0, 16)
            },
            {
                kind: TokenKind_1.TokenKind.RightParen,
                text: ')',
                isReserved: false,
                range: vscode_languageserver_1.Range.create(0, 16, 0, 17)
            },
            {
                kind: TokenKind_1.TokenKind.Eof,
                text: '\0',
                isReserved: false,
                range: vscode_languageserver_1.Range.create(0, 17, 0, 18)
            }
        ]);
        (0, chai_1.expect)(diagnostics).to.be.lengthOf(0);
        (0, chai_1.expect)(statements).to.be.lengthOf(1);
        (0, chai_1.expect)(statements[0].range).to.deep.include(vscode_languageserver_1.Range.create(0, 0, 0, 17));
    });
});
//# sourceMappingURL=Call.spec.js.map
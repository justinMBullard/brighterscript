"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const Parser_1 = require("../../Parser");
const TokenKind_1 = require("../../../lexer/TokenKind");
const Parser_spec_1 = require("../Parser.spec");
const vscode_languageserver_1 = require("vscode-languageserver");
const reflection_1 = require("../../../astUtils/reflection");
describe('parser associative array literals', () => {
    describe('empty associative arrays', () => {
        it('on one line', () => {
            let { statements, diagnostics } = Parser_1.Parser.parse([
                (0, Parser_spec_1.identifier)('_'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Equal, '='),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.LeftCurlyBrace, '{'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.RightCurlyBrace, '}'),
                Parser_spec_1.EOF
            ]);
            (0, chai_1.expect)(diagnostics).to.be.lengthOf(0);
            (0, chai_1.expect)(statements).to.be.length.greaterThan(0);
        });
        it('on multiple lines', () => {
            let { statements, diagnostics } = Parser_1.Parser.parse([
                (0, Parser_spec_1.identifier)('_'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Equal, '='),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.LeftCurlyBrace, '{'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Newline, '\n'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Newline, '\n'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Newline, '\n'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Newline, '\n'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Newline, '\n'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Newline, '\n'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.RightCurlyBrace, '}'),
                Parser_spec_1.EOF
            ]);
            (0, chai_1.expect)(diagnostics).to.be.lengthOf(0);
            (0, chai_1.expect)(statements).to.be.length.greaterThan(0);
        });
    });
    describe('filled arrays', () => {
        it('on one line', () => {
            let { statements, diagnostics } = Parser_1.Parser.parse([
                (0, Parser_spec_1.identifier)('_'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Equal, '='),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.LeftCurlyBrace, '{'),
                (0, Parser_spec_1.identifier)('foo'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Colon, ':'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.IntegerLiteral, '1'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Comma, ','),
                (0, Parser_spec_1.identifier)('bar'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Colon, ':'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.IntegerLiteral, '2'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Comma, ','),
                (0, Parser_spec_1.identifier)('baz'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Colon, ':'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.IntegerLiteral, '3'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.RightCurlyBrace, '}'),
                Parser_spec_1.EOF
            ]);
            (0, chai_1.expect)(diagnostics).to.be.lengthOf(0);
            (0, chai_1.expect)(statements).to.be.length.greaterThan(0);
        });
        it('on multiple lines with commas', () => {
            let { statements, diagnostics } = Parser_1.Parser.parse([
                (0, Parser_spec_1.identifier)('_'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Equal, '='),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.LeftCurlyBrace, '{'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Newline, '\n'),
                (0, Parser_spec_1.identifier)('foo'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Colon, ':'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.IntegerLiteral, '1'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Comma, ','),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Newline, '\n'),
                (0, Parser_spec_1.identifier)('bar'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Colon, ':'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.IntegerLiteral, '2'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Comma, ','),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Newline, '\n'),
                (0, Parser_spec_1.identifier)('baz'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Colon, ':'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.IntegerLiteral, '3'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Newline, '\n'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.RightCurlyBrace, '}'),
                Parser_spec_1.EOF
            ]);
            (0, chai_1.expect)(diagnostics).to.be.lengthOf(0);
            (0, chai_1.expect)(statements).to.be.length.greaterThan(0);
        });
        it('on multiple lines without commas', () => {
            let { statements, diagnostics } = Parser_1.Parser.parse([
                (0, Parser_spec_1.identifier)('_'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Equal, '='),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.LeftCurlyBrace, '{'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Newline, '\n'),
                (0, Parser_spec_1.identifier)('foo'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Colon, ':'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.IntegerLiteral, '1'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Newline, '\n'),
                (0, Parser_spec_1.identifier)('bar'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Colon, ':'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.IntegerLiteral, '2'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Newline, '\n'),
                (0, Parser_spec_1.identifier)('baz'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Colon, ':'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.IntegerLiteral, '3'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Newline, '\n'),
                (0, Parser_spec_1.token)(TokenKind_1.TokenKind.RightCurlyBrace, '}'),
                Parser_spec_1.EOF
            ]);
            (0, chai_1.expect)(diagnostics).to.be.lengthOf(0);
            (0, chai_1.expect)(statements).to.be.length.greaterThan(0);
        });
    });
    it('allows separating properties with colons', () => {
        let { statements, diagnostics } = Parser_1.Parser.parse([
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Sub, 'sub'),
            (0, Parser_spec_1.identifier)('main'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.LeftParen, '('),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.RightParen, ')'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Newline, '\n'),
            (0, Parser_spec_1.identifier)('person'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Equal, '='),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.LeftCurlyBrace, '{'),
            (0, Parser_spec_1.identifier)('name'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Colon, ':'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.StringLiteral, 'Bob'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Colon, ':'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Colon, ':'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Colon, ':'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Colon, ':'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Colon, ':'),
            (0, Parser_spec_1.identifier)('age'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Colon, ':'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.IntegerLiteral, '50'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.RightCurlyBrace, '}'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Newline, '\n'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.EndSub, 'end sub'),
            Parser_spec_1.EOF
        ]);
        (0, chai_1.expect)(diagnostics).to.be.lengthOf(0);
        (0, chai_1.expect)(statements).to.be.length.greaterThan(0);
    });
    it('allows a mix of quoted and unquoted keys', () => {
        let { statements, diagnostics } = Parser_1.Parser.parse([
            (0, Parser_spec_1.identifier)('_'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Equal, '='),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.LeftCurlyBrace, '{'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Newline, '\n'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.StringLiteral, 'foo'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Colon, ':'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.IntegerLiteral, '1'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Comma, ','),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Newline, '\n'),
            (0, Parser_spec_1.identifier)('bar'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Colon, ':'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.IntegerLiteral, '2'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Comma, ','),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Newline, '\n'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.StringLiteral, 'requires-hyphens'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Colon, ':'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.IntegerLiteral, '3'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Newline, '\n'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.RightCurlyBrace, '}'),
            Parser_spec_1.EOF
        ]);
        (0, chai_1.expect)(diagnostics).to.be.lengthOf(0);
        (0, chai_1.expect)(statements).to.be.length.greaterThan(0);
    });
    it('captures commas', () => {
        let { statements } = Parser_1.Parser.parse(`
            _ = {
                p1: 1,
                p2: 2, 'comment
                p3: 3
                p4: 4
                'comment
                p5: 5,
            }
        `);
        const commas = statements[0].value.elements
            .map(s => !(0, reflection_1.isCommentStatement)(s) && !!s.commaToken);
        (0, chai_1.expect)(commas).to.deep.equal([
            true,
            true,
            false,
            false,
            false,
            false,
            true // p5
        ]);
    });
    it('location tracking', () => {
        /**
         *    0   0   0   1
         *    0   4   8   2
         *  +--------------
         * 1| a = {   }
         * 2|
         * 3| b = {
         * 4|
         * 5|
         * 6| }
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
                kind: TokenKind_1.TokenKind.LeftCurlyBrace,
                text: '{',
                isReserved: false,
                range: vscode_languageserver_1.Range.create(0, 4, 0, 5)
            },
            {
                kind: TokenKind_1.TokenKind.RightCurlyBrace,
                text: '}',
                isReserved: false,
                range: vscode_languageserver_1.Range.create(0, 8, 0, 9)
            },
            {
                kind: TokenKind_1.TokenKind.Newline,
                text: '\n',
                isReserved: false,
                range: vscode_languageserver_1.Range.create(0, 9, 0, 10)
            },
            {
                kind: TokenKind_1.TokenKind.Newline,
                text: '\n',
                isReserved: false,
                range: vscode_languageserver_1.Range.create(1, 0, 1, 1)
            },
            {
                kind: TokenKind_1.TokenKind.Identifier,
                text: 'b',
                isReserved: false,
                range: vscode_languageserver_1.Range.create(2, 0, 2, 1)
            },
            {
                kind: TokenKind_1.TokenKind.Equal,
                text: '=',
                isReserved: false,
                range: vscode_languageserver_1.Range.create(2, 2, 2, 3)
            },
            {
                kind: TokenKind_1.TokenKind.LeftCurlyBrace,
                text: '{',
                isReserved: false,
                range: vscode_languageserver_1.Range.create(2, 4, 2, 5)
            },
            {
                kind: TokenKind_1.TokenKind.Newline,
                text: '\n',
                isReserved: false,
                range: vscode_languageserver_1.Range.create(3, 0, 3, 1)
            },
            {
                kind: TokenKind_1.TokenKind.Newline,
                text: '\n',
                isReserved: false,
                range: vscode_languageserver_1.Range.create(4, 0, 4, 1)
            },
            {
                kind: TokenKind_1.TokenKind.RightCurlyBrace,
                text: '}',
                isReserved: false,
                range: vscode_languageserver_1.Range.create(5, 0, 5, 1)
            },
            {
                kind: TokenKind_1.TokenKind.Eof,
                text: '\0',
                isReserved: false,
                range: vscode_languageserver_1.Range.create(5, 1, 5, 2)
            }
        ]);
        (0, chai_1.expect)(diagnostics).to.be.lengthOf(0);
        (0, chai_1.expect)(statements).to.be.lengthOf(2);
        (0, chai_1.expect)(statements[0].value.range).to.deep.include(vscode_languageserver_1.Range.create(0, 4, 0, 9));
        (0, chai_1.expect)(statements[1].value.range).to.deep.include(vscode_languageserver_1.Range.create(2, 4, 5, 1));
    });
});
//# sourceMappingURL=AssociativeArrayLiterals.spec.js.map
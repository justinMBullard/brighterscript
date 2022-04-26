"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const Parser_1 = require("../../Parser");
const TokenKind_1 = require("../../../lexer/TokenKind");
const Parser_spec_1 = require("../Parser.spec");
const vscode_languageserver_1 = require("vscode-languageserver");
const Program_1 = require("../../../Program");
const util_1 = require("../../../util");
const testHelpers_spec_1 = require("../../../testHelpers.spec");
const rootDir = (0, util_1.standardizePath) `${process.cwd()}/.tmp/rootDir`;
describe('parser print statements', () => {
    let program;
    const testTranspile = (0, testHelpers_spec_1.getTestTranspile)(() => [program, rootDir]);
    beforeEach(() => {
        program = new Program_1.Program({
            rootDir: rootDir
        });
    });
    it('parses singular print statements', () => {
        let { statements, diagnostics } = Parser_1.Parser.parse([
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Print),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.StringLiteral, 'Hello, world'),
            Parser_spec_1.EOF
        ]);
        (0, chai_1.expect)(diagnostics).to.be.lengthOf(0);
        (0, chai_1.expect)(statements).to.exist;
        (0, chai_1.expect)(statements).not.to.be.null;
    });
    it('supports empty print', () => {
        let { statements, diagnostics } = Parser_1.Parser.parse([(0, Parser_spec_1.token)(TokenKind_1.TokenKind.Print), Parser_spec_1.EOF]);
        (0, chai_1.expect)(diagnostics).to.be.lengthOf(0);
        (0, chai_1.expect)(statements).to.exist;
        (0, chai_1.expect)(statements).not.to.be.null;
    });
    it('parses print lists with no separator', () => {
        let { statements, diagnostics } = Parser_1.Parser.parse([
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Print),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.StringLiteral, 'Foo'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.StringLiteral, 'bar'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.StringLiteral, 'baz'),
            Parser_spec_1.EOF
        ]);
        (0, chai_1.expect)(diagnostics).to.be.lengthOf(0);
        (0, chai_1.expect)(statements).to.exist;
        (0, chai_1.expect)(statements).not.to.be.null;
    });
    it('parses print lists with separators', () => {
        let { statements, diagnostics } = Parser_1.Parser.parse([
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Print),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.StringLiteral, 'Foo'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Semicolon),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.StringLiteral, 'bar'),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.Semicolon),
            (0, Parser_spec_1.token)(TokenKind_1.TokenKind.StringLiteral, 'baz'),
            Parser_spec_1.EOF
        ]);
        (0, chai_1.expect)(diagnostics).to.be.lengthOf(0);
        (0, chai_1.expect)(statements).to.exist;
        (0, chai_1.expect)(statements).not.to.be.null;
    });
    it('location tracking', () => {
        /**
         *    0   0   0   1
         *    0   4   8   2
         *  +--------------
         * 1| print "foo"
         */
        let { statements, diagnostics } = Parser_1.Parser.parse([
            {
                kind: TokenKind_1.TokenKind.Print,
                text: 'print',
                isReserved: true,
                range: vscode_languageserver_1.Range.create(0, 0, 1, 5),
                leadingWhitespace: ''
            },
            {
                kind: TokenKind_1.TokenKind.StringLiteral,
                text: `"foo"`,
                isReserved: false,
                range: vscode_languageserver_1.Range.create(0, 6, 0, 11),
                leadingWhitespace: ''
            },
            {
                kind: TokenKind_1.TokenKind.Eof,
                text: '\0',
                isReserved: false,
                range: vscode_languageserver_1.Range.create(0, 11, 0, 12),
                leadingWhitespace: ''
            }
        ]);
        (0, chai_1.expect)(diagnostics).to.be.lengthOf(0);
        (0, chai_1.expect)(statements).to.be.lengthOf(1);
        (0, chai_1.expect)(statements[0].range).to.deep.include(vscode_languageserver_1.Range.create(0, 0, 0, 11));
    });
    describe('transpile', () => {
        it('retains comma separators', () => {
            testTranspile(`
                a$ = "string"
                print a$, a$, a$
            `);
        });
        it('retains semicolon separators', () => {
            testTranspile(`
                a$ = "string"
                print a$; a$; a$
            `);
        });
        it('supports no space between function calls', () => {
            testTranspile(`
                function getText()
                    return "text"
                end function
                print getText() getText() getText()
            `);
        });
        it('supports print in loop', () => {
            testTranspile(`
                paramArr = ["This", "is", true, "and", "this", "is", 1]
                print "This is one line of stuff:";
                for each item in paramArr
                    print item; " ";
                end for
                print ""
            `, `
                paramArr = [
                    "This"
                    "is"
                    true
                    "and"
                    "this"
                    "is"
                    1
                ]
                print "This is one line of stuff:";
                for each item in paramArr
                    print item; " ";
                end for
                print ""
            `);
        });
        it('handles roku documentation examples', () => {
            testTranspile(`
                x=5:print 25; " is equal to"; x^2
                a$="string":print a$;a$,a$;" ";a$
                print "zone 1","zone 2","zone 3","zone 4"
                print "print statement #1 ":print "print statement #2"
                print "this is a five " 5 "!!"
                print {}
                print {a:1}
                print []
                print [5]
                print tab(5)"tabbed 5";tab(25)"tabbed 25"
                print tab(40) pos(0) 'prints 40 at position 40
                print "these" tab(pos(0)+5)"words" tab(pos(0)+5)"are":print tab(pos(0)+5)"evenly" tab(pos(0)+5)"spaced"
            `, `
                x = 5
                print 25; " is equal to"; x ^ 2
                a$ = "string"
                print a$; a$, a$; " "; a$
                print "zone 1", "zone 2", "zone 3", "zone 4"
                print "print statement #1 "
                print "print statement #2"
                print "this is a five " 5 "!!"
                print {}
                print {
                    a: 1
                }
                print []
                print [
                    5
                ]
                print tab(5) "tabbed 5"; tab(25) "tabbed 25"
                print tab(40) pos(0) 'prints 40 at position 40
                print "these" tab(pos(0) + 5) "words" tab(pos(0) + 5) "are"
                print tab(pos(0) + 5) "evenly" tab(pos(0) + 5) "spaced"
            `);
        });
    });
});
//# sourceMappingURL=PrintStatement.spec.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const chai_1 = require("chai");
const sinon = require("sinon");
const Program_1 = require("../Program");
const Statement_1 = require("../parser/Statement");
const TokenKind_1 = require("../lexer/TokenKind");
const visitors_1 = require("./visitors");
const reflection_1 = require("./reflection");
const creators_1 = require("./creators");
const stackedVisitor_1 = require("./stackedVisitor");
describe('astUtils visitors', () => {
    const rootDir = process.cwd();
    let program;
    const PRINTS_SRC = `
        sub Main()
            print 1
            print 2

            function exec(s)
                s()
            end function

            exec(sub()
                print 8
            end sub)

            if a = 1
                print 3
            else if a = 2
                print 4
            else
                print 5
            end if

            while a <> invalid
                print 6
            end while

            for a = 1 to 10
                print 7
            end for
        end sub
    `;
    const EXPRESSIONS_SRC = `
        sub Main()
            'comment
            print "msg"; 3
            print \`expand \${var}\`
            a = "a"
            b = "b" + c
            m.global.x = "x"
            aa[10] = "aa"
            exec("e", some())
            for i = 1 to 10
            end for
            for each n in aa
            end for
            while i < 10
                i++
            end while
            if j > 0
            else if j < -10
            end if
            return invalid
        end sub
    `;
    beforeEach(() => {
        program = new Program_1.Program({ rootDir: rootDir });
    });
    afterEach(() => {
        program.dispose();
    });
    function functionsWalker(visitor, cancel) {
        return (file) => {
            file.parser.references.functionExpressions.some(functionExpression => {
                visitor(functionExpression.body, undefined);
                (0, visitors_1.walkStatements)(functionExpression.body, (statement, parent) => visitor(statement, parent), cancel);
                return cancel === null || cancel === void 0 ? void 0 : cancel.isCancellationRequested;
            });
        };
    }
    describe('Statements', () => {
        it('Walks through all the statements with depth', () => {
            const actual = [];
            const visitor = (0, stackedVisitor_1.createStackedVisitor)((s, stack) => {
                const d = stack.length;
                actual.push(`${s.constructor.name}:${d}`);
            });
            const walker = functionsWalker(visitor);
            program.plugins.add({
                name: 'walker',
                afterFileParse: file => walker(file)
            });
            program.setFile('source/main.brs', PRINTS_SRC);
            (0, chai_1.expect)(actual).to.deep.equal([
                'Block:0',
                'PrintStatement:1',
                'PrintStatement:1',
                'FunctionStatement:1',
                'ExpressionStatement:1',
                'IfStatement:1',
                'Block:2',
                'PrintStatement:3',
                'IfStatement:2',
                'Block:3',
                'PrintStatement:4',
                'Block:3',
                'PrintStatement:4',
                'WhileStatement:1',
                'Block:2',
                'PrintStatement:3',
                'ForStatement:1',
                'AssignmentStatement:2',
                'Block:2',
                'PrintStatement:3',
                'Block:0',
                'ExpressionStatement:1',
                'Block:0',
                'PrintStatement:1' //   print 8
            ]);
        });
        it('Walks through all the statements with token not cancelled', () => {
            const cancel = new vscode_languageserver_1.CancellationTokenSource();
            const actual = [];
            const walker = functionsWalker(s => actual.push(s.constructor.name), cancel.token);
            program.plugins.add({
                name: 'walker',
                afterFileParse: file => walker(file)
            });
            program.setFile('source/main.brs', PRINTS_SRC);
            (0, chai_1.expect)(actual).to.deep.equal([
                'Block',
                'PrintStatement',
                'PrintStatement',
                'FunctionStatement',
                'ExpressionStatement',
                'IfStatement',
                'Block',
                'PrintStatement',
                'IfStatement',
                'Block',
                'PrintStatement',
                'Block',
                'PrintStatement',
                'WhileStatement',
                'Block',
                'PrintStatement',
                'ForStatement',
                'AssignmentStatement',
                'Block',
                'PrintStatement',
                'Block',
                'ExpressionStatement',
                'Block',
                'PrintStatement' //   print 8
            ]);
        });
        it('Stops walking when requested', () => {
            const cancel = new vscode_languageserver_1.CancellationTokenSource();
            const actual = [];
            let count = 0;
            const walker = functionsWalker(s => {
                actual.push(s.constructor.name);
                if ((0, reflection_1.isPrintStatement)(s)) {
                    if (++count === 4) {
                        cancel.cancel();
                    }
                }
            }, cancel.token);
            program.plugins.add({
                name: 'walker',
                afterFileParse: file => walker(file)
            });
            program.setFile('source/main.brs', PRINTS_SRC);
            (0, chai_1.expect)(actual).to.deep.equal([
                'Block',
                'PrintStatement',
                'PrintStatement',
                'FunctionStatement',
                'ExpressionStatement',
                'IfStatement',
                'Block',
                'PrintStatement',
                'IfStatement',
                'Block',
                'PrintStatement' // print 4
            ]);
        });
    });
    describe('Statement visitor', () => {
        it('Maps statements to individual handlers', () => {
            const printHandler = sinon.spy();
            const blockHandler = sinon.spy();
            const visitor = (0, visitors_1.createVisitor)({
                PrintStatement: printHandler,
                Block: blockHandler
            });
            const printStatement = new Statement_1.PrintStatement({
                print: (0, creators_1.createToken)(TokenKind_1.TokenKind.Print)
            }, []);
            const blockStatement = new Statement_1.Block([], vscode_languageserver_1.Range.create(0, 0, 0, 0));
            visitor(printStatement, undefined);
            visitor(blockStatement, undefined);
            (0, chai_1.expect)(printHandler.callCount).to.equal(1);
            (0, chai_1.expect)(printHandler.calledWith(printStatement)).to.be.true;
            (0, chai_1.expect)(blockHandler.callCount).to.equal(1);
            (0, chai_1.expect)(blockHandler.calledWith(blockStatement)).to.be.true;
        });
    });
    describe('Statement editor', () => {
        it('allows replacing statements', () => {
            const printStatement1 = new Statement_1.PrintStatement({
                print: (0, creators_1.createToken)(TokenKind_1.TokenKind.Print)
            }, []);
            const printStatement2 = new Statement_1.PrintStatement({
                print: (0, creators_1.createToken)(TokenKind_1.TokenKind.Print)
            }, []);
            const block = new Statement_1.Block([
                printStatement1,
                new Statement_1.ReturnStatement({ return: (0, creators_1.createToken)(TokenKind_1.TokenKind.Return) })
            ], vscode_languageserver_1.Range.create(0, 0, 0, 0));
            const visitor = (0, visitors_1.createVisitor)({
                PrintStatement: () => printStatement2
            });
            (0, visitors_1.walkStatements)(block, visitor);
            (0, chai_1.expect)(block.statements[0]).to.equal(printStatement2);
        });
    });
    describe('Expressions', () => {
        it('Walks through all expressions', () => {
            const actual = [];
            let curr;
            const statementVisitor = (0, stackedVisitor_1.createStackedVisitor)((statement, stack) => {
                curr = { statement: statement, depth: stack.length };
            });
            function expressionVisitor(expression, _) {
                const { statement, depth } = curr;
                actual.push(`${statement.constructor.name}:${depth}:${expression.constructor.name}`);
            }
            const walker = functionsWalker((statement, parentStatement) => {
                statementVisitor(statement, parentStatement);
                statement.walk(expressionVisitor, {
                    walkMode: visitors_1.WalkMode.visitLocalExpressions
                });
            });
            program.plugins.add({
                name: 'walker',
                afterFileParse: (file) => walker(file)
            });
            program.setFile('source/main.brs', EXPRESSIONS_SRC);
            (0, chai_1.expect)(actual).to.deep.equal([
                //The comment statement is weird because it can't be both a statement and expression, but is treated that way. Just ignore it for now until we refactor comments.
                //'CommentStatement:1:CommentStatement',          // '<comment>
                'PrintStatement:1:LiteralExpression',
                'PrintStatement:1:LiteralExpression',
                'PrintStatement:1:TemplateStringExpression',
                'PrintStatement:1:TemplateStringQuasiExpression',
                'PrintStatement:1:LiteralExpression',
                'PrintStatement:1:VariableExpression',
                'PrintStatement:1:TemplateStringQuasiExpression',
                'PrintStatement:1:LiteralExpression',
                'AssignmentStatement:1:LiteralExpression',
                'AssignmentStatement:1:BinaryExpression',
                'AssignmentStatement:1:LiteralExpression',
                'AssignmentStatement:1:VariableExpression',
                'DottedSetStatement:1:DottedGetExpression',
                'DottedSetStatement:1:VariableExpression',
                'DottedSetStatement:1:LiteralExpression',
                'IndexedSetStatement:1:VariableExpression',
                'IndexedSetStatement:1:LiteralExpression',
                'IndexedSetStatement:1:LiteralExpression',
                'ExpressionStatement:1:CallExpression',
                'ExpressionStatement:1:VariableExpression',
                'ExpressionStatement:1:LiteralExpression',
                'ExpressionStatement:1:CallExpression',
                'ExpressionStatement:1:VariableExpression',
                'ForStatement:1:LiteralExpression',
                'AssignmentStatement:2:LiteralExpression',
                'ForEachStatement:1:VariableExpression',
                'WhileStatement:1:BinaryExpression',
                'WhileStatement:1:VariableExpression',
                'WhileStatement:1:LiteralExpression',
                'IncrementStatement:3:VariableExpression',
                'IfStatement:1:BinaryExpression',
                'IfStatement:1:VariableExpression',
                'IfStatement:1:LiteralExpression',
                'IfStatement:2:BinaryExpression',
                'IfStatement:2:VariableExpression',
                'IfStatement:2:UnaryExpression',
                'IfStatement:2:LiteralExpression',
                'ReturnStatement:1:LiteralExpression' // return <invalid>
            ]);
        });
    });
    describe('walk', () => {
        function testWalk(text, expectedConstructors, walkMode = visitors_1.WalkMode.visitAllRecursive) {
            const file = program.setFile('source/main.bs', text);
            const items = [];
            let index = 1;
            file.ast.walk((element) => {
                element._testId = index++;
                items.push(element);
            }, {
                walkMode: walkMode
            });
            index = 1;
            (0, chai_1.expect)(items.map(x => `${x.constructor.name}:${x._testId}`)).to.eql(expectedConstructors.map(x => `${x}:${index++}`));
        }
        it('Walks through all expressions until cancelled', () => {
            const file = program.setFile('source/main.bs', `
                sub logger(message = "nil" as string)
                    innerLog = sub(message = "nil" as string)
                        print message
                    end sub
                    innerLog(message)
                end sub
            `);
            const cancel = new vscode_languageserver_1.CancellationTokenSource();
            let count = 0;
            const stopIndex = 5;
            file.ast.walk((statement, parent) => {
                count++;
                if (count === stopIndex) {
                    cancel.cancel();
                }
            }, {
                walkMode: visitors_1.WalkMode.visitAllRecursive,
                cancel: cancel.token
            });
            (0, chai_1.expect)(count).to.equal(stopIndex);
        });
        it('walks if statement', () => {
            testWalk(`
                sub main()
                    if true then
                        print "true"
                    else if true then
                        print "true"
                    else
                        print "true"
                    end if
                end sub
            `, [
                'FunctionStatement',
                'FunctionExpression',
                'Block',
                //if
                'IfStatement',
                'LiteralExpression',
                'Block',
                'PrintStatement',
                'LiteralExpression',
                //else if
                'IfStatement',
                'LiteralExpression',
                'Block',
                'PrintStatement',
                'LiteralExpression',
                //else
                'Block',
                'PrintStatement',
                'LiteralExpression'
            ]);
        });
        it('walks if statement without else', () => {
            testWalk(`
                sub main()
                    if true then
                        print "true"
                    end if
                end sub
            `, [
                'FunctionStatement',
                'FunctionExpression',
                'Block',
                'IfStatement',
                'LiteralExpression',
                'Block',
                'PrintStatement',
                'LiteralExpression'
            ]);
        });
        it('walks increment statement', () => {
            testWalk(`
                sub main()
                    age = 12
                    age++
                end sub
            `, [
                'FunctionStatement',
                'FunctionExpression',
                'Block',
                'AssignmentStatement',
                'LiteralExpression',
                'IncrementStatement',
                'VariableExpression'
            ]);
        });
        it('walks ForStatement', () => {
            testWalk(`
                sub main()
                    for i = 0 to 10 step 1
                        print i
                    end for
                end sub
            `, [
                'FunctionStatement',
                'FunctionExpression',
                'Block',
                'ForStatement',
                'AssignmentStatement',
                'LiteralExpression',
                'LiteralExpression',
                'LiteralExpression',
                'Block',
                'PrintStatement',
                'VariableExpression'
            ]);
        });
        it('walks ForEachStatement', () => {
            testWalk(`
                sub main()
                    for each item in [1,2,3]
                        print item
                    end for
                end sub
            `, [
                'FunctionStatement',
                'FunctionExpression',
                'Block',
                'ForEachStatement',
                'ArrayLiteralExpression',
                'LiteralExpression',
                'LiteralExpression',
                'LiteralExpression',
                'Block',
                'PrintStatement',
                'VariableExpression'
            ]);
        });
        it('walks dotted and indexed set statements', () => {
            testWalk(`
                sub main()
                    person = {}
                    person.name = "person"
                    person["age"] = 12
                end sub
            `, [
                'FunctionStatement',
                'FunctionExpression',
                'Block',
                'AssignmentStatement',
                'AALiteralExpression',
                'DottedSetStatement',
                'VariableExpression',
                'LiteralExpression',
                'IndexedSetStatement',
                'VariableExpression',
                'LiteralExpression',
                'LiteralExpression'
            ]);
        });
        it('walks while loop', () => {
            testWalk(`
                sub main()
                    while 1 + 1 = 2
                        print "infinite"
                    end while
                end sub
            `, [
                'FunctionStatement',
                'FunctionExpression',
                'Block',
                'WhileStatement',
                'BinaryExpression',
                'BinaryExpression',
                'LiteralExpression',
                'LiteralExpression',
                'LiteralExpression',
                'Block',
                'PrintStatement',
                'LiteralExpression'
            ]);
        });
        it('walks namespace', () => {
            testWalk(`
               namespace NameA.NameB
               end namespace
            `, [
                'NamespaceStatement',
                'NamespacedVariableNameExpression',
                'DottedGetExpression',
                'VariableExpression'
            ]);
        });
        it('walks nested functions', () => {
            testWalk(`
                sub main()
                    print "main"
                    inner1 = sub()
                        print "inner1"
                        inner2 = sub()
                            print "inner2"
                            inner3 = sub()
                                print "inner3"
                            end sub
                        end sub
                    end sub
                end sub
            `, [
                //sub main()
                'FunctionStatement',
                'FunctionExpression',
                'Block',
                'PrintStatement',
                'LiteralExpression',
                //inner1 = sub()
                'AssignmentStatement',
                'FunctionExpression',
                'Block',
                'PrintStatement',
                'LiteralExpression',
                //inner2 = sub()
                'AssignmentStatement',
                'FunctionExpression',
                'Block',
                'PrintStatement',
                'LiteralExpression',
                //inner3 = sub
                'AssignmentStatement',
                'FunctionExpression',
                'Block',
                'PrintStatement',
                'LiteralExpression'
            ]);
        });
        it('walks CallExpression', () => {
            testWalk(`
                sub main()
                    Sleep(123)
                end sub
            `, [
                'FunctionStatement',
                'FunctionExpression',
                'Block',
                'ExpressionStatement',
                'CallExpression',
                'VariableExpression',
                'LiteralExpression'
            ]);
        });
        it('walks function parameters', () => {
            testWalk(`
                sub main(arg1)
                    speak = sub(arg1, arg2)
                    end sub
                end sub
            `, [
                'FunctionStatement',
                'FunctionExpression',
                'FunctionParameterExpression',
                'Block',
                'AssignmentStatement',
                'FunctionExpression',
                'FunctionParameterExpression',
                'FunctionParameterExpression',
                'Block'
            ]);
        });
        it('walks DottedGetExpression', () => {
            testWalk(`
                sub main()
                    print person.name
                end sub
            `, [
                'FunctionStatement',
                'FunctionExpression',
                'Block',
                'PrintStatement',
                'DottedGetExpression',
                'VariableExpression'
            ]);
        });
        it('walks XmlAttributeGetExpression', () => {
            testWalk(`
                sub main()
                    print person@name
                end sub
            `, [
                'FunctionStatement',
                'FunctionExpression',
                'Block',
                'PrintStatement',
                'XmlAttributeGetExpression',
                'VariableExpression'
            ]);
        });
        it('walks IndexedGetExpression', () => {
            testWalk(`
                sub main()
                    print person["name"]
                end sub
            `, [
                'FunctionStatement',
                'FunctionExpression',
                'Block',
                'PrintStatement',
                'IndexedGetExpression',
                'VariableExpression',
                'LiteralExpression'
            ]);
        });
        it('walks GroupingExpression', () => {
            testWalk(`
                sub main()
                    print 1 + ( 1 + 2 )
                end sub
            `, [
                'FunctionStatement',
                'FunctionExpression',
                'Block',
                'PrintStatement',
                'BinaryExpression',
                'LiteralExpression',
                'GroupingExpression',
                'BinaryExpression',
                'LiteralExpression',
                'LiteralExpression'
            ]);
        });
        it('walks AALiteralExpression', () => {
            testWalk(`
                sub main()
                    person = {
                        'comment
                        "name": "John Doe"
                    }
                end sub
            `, [
                'FunctionStatement',
                'FunctionExpression',
                'Block',
                'AssignmentStatement',
                'AALiteralExpression',
                'CommentStatement',
                'AAMemberExpression',
                'LiteralExpression'
            ]);
        });
        it('walks UnaryExpression', () => {
            testWalk(`
                sub main()
                   isAlive = not isDead
                end sub
            `, [
                'FunctionStatement',
                'FunctionExpression',
                'Block',
                'AssignmentStatement',
                'UnaryExpression',
                'VariableExpression'
            ]);
        });
        it('walks TemplateStringExpression', () => {
            testWalk(`
                sub main()
                   print \`Hello \${worldVar}\`
                end sub
            `, [
                'FunctionStatement',
                'FunctionExpression',
                'Block',
                'PrintStatement',
                'TemplateStringExpression',
                'TemplateStringQuasiExpression',
                'LiteralExpression',
                'VariableExpression',
                'TemplateStringQuasiExpression',
                'LiteralExpression'
            ]);
        });
        it('walks ReturnStatement with or without value', () => {
            testWalk(`
                sub main()
                    a = 0
                    if a = 0 then
                        return
                    else if a > 0 then
                        return 1
                    else
                        return 'nothing
                    end if
                end sub
            `, [
                'FunctionStatement',
                'FunctionExpression',
                'Block',
                'AssignmentStatement',
                'LiteralExpression',
                //if
                'IfStatement',
                'BinaryExpression',
                'VariableExpression',
                'LiteralExpression',
                'Block',
                'ReturnStatement',
                //else if
                'IfStatement',
                'BinaryExpression',
                'VariableExpression',
                'LiteralExpression',
                'Block',
                'ReturnStatement',
                'LiteralExpression',
                //else
                'Block',
                'ReturnStatement',
                'CommentStatement'
            ]);
        });
        it('walks TaggedTemplateStringExpression', () => {
            testWalk(`
                sub main()
                   print tag\`Hello \${worldVar}\`
                end sub
            `, [
                'FunctionStatement',
                'FunctionExpression',
                'Block',
                'PrintStatement',
                'TaggedTemplateStringExpression',
                'TemplateStringQuasiExpression',
                'LiteralExpression',
                'VariableExpression',
                'TemplateStringQuasiExpression',
                'LiteralExpression'
            ]);
        });
        it('walks CharCodeLiteral expression within TemplateLiteralExpression', () => {
            testWalk(`
                sub main()
                   print \`\\n\`
                end sub
            `, [
                'FunctionStatement',
                'FunctionExpression',
                'Block',
                'PrintStatement',
                'TemplateStringExpression',
                'TemplateStringQuasiExpression',
                'LiteralExpression',
                'EscapedCharCodeLiteralExpression',
                'LiteralExpression'
            ]);
        });
        it('walks NewExpression', () => {
            testWalk(`
                sub main()
                  person = new Person()
                end sub
            `, [
                'FunctionStatement',
                'FunctionExpression',
                'Block',
                'AssignmentStatement',
                'NewExpression',
                'CallExpression',
                'NamespacedVariableNameExpression',
                'VariableExpression'
            ]);
        });
        it('walks CallfuncExpression', () => {
            testWalk(`
                sub main()
                  person@.doSomething("arg1")
                end sub
            `, [
                'FunctionStatement',
                'FunctionExpression',
                'Block',
                'ExpressionStatement',
                'CallfuncExpression',
                'VariableExpression',
                'LiteralExpression'
            ]);
        });
        it('walks ClassStatement', () => {
            testWalk(`
                class Person
                    name as string
                    age as integer = 1
                    function getName()
                        return m.name
                    end function
                end class
            `, [
                'ClassStatement',
                'ClassFieldStatement',
                'ClassFieldStatement',
                'LiteralExpression',
                'ClassMethodStatement',
                'FunctionExpression',
                'Block',
                'ReturnStatement',
                'DottedGetExpression',
                'VariableExpression'
            ]);
        });
        it('visits all statements and no expressions', () => {
            testWalk(`
                sub main()
                    log = sub(message)
                        print "hello " + message
                    end sub
                    log("hello" + " world")
                end sub
            `, [
                'FunctionStatement',
                'Block',
                'AssignmentStatement',
                'Block',
                'PrintStatement',
                'ExpressionStatement'
            ], visitors_1.WalkMode.visitStatementsRecursive);
        });
        it('visits all expressions and no statement', () => {
            testWalk(`
                sub main()
                    log = sub(message)
                        print "hello " + message
                    end sub
                    log("hello" + " world")
                end sub
            `, [
                'FunctionExpression',
                'FunctionExpression',
                'FunctionParameterExpression',
                'BinaryExpression',
                'LiteralExpression',
                'VariableExpression',
                'CallExpression',
                'VariableExpression',
                'BinaryExpression',
                'LiteralExpression',
                'LiteralExpression'
            ], visitors_1.WalkMode.visitExpressionsRecursive);
        });
    });
});
//# sourceMappingURL=visitors.spec.js.map
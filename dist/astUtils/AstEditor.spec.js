"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const BrsTranspileState_1 = require("../parser/BrsTranspileState");
const AstEditor_1 = require("./AstEditor");
const util_1 = require("../util");
const creators_1 = require("../astUtils/creators");
const TokenKind_1 = require("../lexer/TokenKind");
const Program_1 = require("../Program");
const BrsFile_1 = require("../files/BrsFile");
const Expression_1 = require("../parser/Expression");
const source_map_1 = require("source-map");
describe('AstEditor', () => {
    let changer;
    let obj;
    beforeEach(() => {
        changer = new AstEditor_1.AstEditor();
        obj = getTestObject();
    });
    function getTestObject() {
        return {
            name: 'parent',
            hobbies: ['gaming', 'reading', 'cycling'],
            children: [{
                    name: 'oldest',
                    age: 15
                }, {
                    name: 'middle',
                    age: 10
                }, {
                    name: 'youngest',
                    age: 5
                }],
            jobs: [{
                    title: 'plumber',
                    annualSalary: 50000
                }, {
                    title: 'carpenter',
                    annualSalary: 75000
                }]
        };
    }
    it('applies single property change', () => {
        (0, chai_1.expect)(obj.name).to.eql('parent');
        changer.setProperty(obj, 'name', 'jack');
        (0, chai_1.expect)(obj.name).to.eql('jack');
        changer.undoAll();
        (0, chai_1.expect)(obj.name).to.eql('parent');
    });
    it('inserts at beginning of array', () => {
        (0, chai_1.expect)(obj.hobbies).to.eql(['gaming', 'reading', 'cycling']);
        changer.addToArray(obj.hobbies, 0, 'climbing');
        (0, chai_1.expect)(obj.hobbies).to.eql(['climbing', 'gaming', 'reading', 'cycling']);
        changer.undoAll();
        (0, chai_1.expect)(obj.hobbies).to.eql(['gaming', 'reading', 'cycling']);
    });
    it('inserts at middle of array', () => {
        (0, chai_1.expect)(obj.hobbies).to.eql(['gaming', 'reading', 'cycling']);
        changer.addToArray(obj.hobbies, 1, 'climbing');
        (0, chai_1.expect)(obj.hobbies).to.eql(['gaming', 'climbing', 'reading', 'cycling']);
        changer.undoAll();
        (0, chai_1.expect)(obj.hobbies).to.eql(['gaming', 'reading', 'cycling']);
    });
    it('changes the value at an array index', () => {
        (0, chai_1.expect)(obj.hobbies).to.eql(['gaming', 'reading', 'cycling']);
        changer.setArrayValue(obj.hobbies, 1, 'sleeping');
        (0, chai_1.expect)(obj.hobbies).to.eql(['gaming', 'sleeping', 'cycling']);
        changer.undoAll();
        (0, chai_1.expect)(obj.hobbies).to.eql(['gaming', 'reading', 'cycling']);
    });
    it('inserts at end of array', () => {
        (0, chai_1.expect)(obj.hobbies).to.eql(['gaming', 'reading', 'cycling']);
        changer.addToArray(obj.hobbies, 3, 'climbing');
        (0, chai_1.expect)(obj.hobbies).to.eql(['gaming', 'reading', 'cycling', 'climbing']);
        changer.undoAll();
        (0, chai_1.expect)(obj.hobbies).to.eql(['gaming', 'reading', 'cycling']);
    });
    it('removes at beginning of array', () => {
        (0, chai_1.expect)(obj.hobbies).to.eql(['gaming', 'reading', 'cycling']);
        changer.removeFromArray(obj.hobbies, 0);
        (0, chai_1.expect)(obj.hobbies).to.eql(['reading', 'cycling']);
        changer.undoAll();
        (0, chai_1.expect)(obj.hobbies).to.eql(['gaming', 'reading', 'cycling']);
    });
    it('removes at middle of array', () => {
        (0, chai_1.expect)(obj.hobbies).to.eql(['gaming', 'reading', 'cycling']);
        changer.removeFromArray(obj.hobbies, 1);
        (0, chai_1.expect)(obj.hobbies).to.eql(['gaming', 'cycling']);
        changer.undoAll();
        (0, chai_1.expect)(obj.hobbies).to.eql(['gaming', 'reading', 'cycling']);
    });
    it('removes at middle of array', () => {
        (0, chai_1.expect)(obj.hobbies).to.eql(['gaming', 'reading', 'cycling']);
        changer.removeFromArray(obj.hobbies, 2);
        (0, chai_1.expect)(obj.hobbies).to.eql(['gaming', 'reading']);
        changer.undoAll();
        (0, chai_1.expect)(obj.hobbies).to.eql(['gaming', 'reading', 'cycling']);
    });
    it('restores array after being removed', () => {
        changer.removeFromArray(obj.hobbies, 0);
        changer.setProperty(obj, 'hobbies', undefined);
        (0, chai_1.expect)(obj.hobbies).to.be.undefined;
        changer.undoAll();
        (0, chai_1.expect)(obj.hobbies).to.eql(['gaming', 'reading', 'cycling']);
    });
    it('works for many changes', () => {
        (0, chai_1.expect)(obj).to.eql(getTestObject());
        changer.setProperty(obj, 'name', 'bob');
        changer.setProperty(obj.children[0], 'name', 'jimmy');
        changer.addToArray(obj.children, obj.children.length, { name: 'sally', age: 1 });
        changer.removeFromArray(obj.jobs, 1);
        changer.removeFromArray(obj.hobbies, 0);
        changer.removeFromArray(obj.hobbies, 0);
        changer.removeFromArray(obj.hobbies, 0);
        changer.setProperty(obj, 'hobbies', undefined);
        (0, chai_1.expect)(obj).to.eql({
            name: 'bob',
            hobbies: undefined,
            children: [{
                    name: 'jimmy',
                    age: 15
                }, {
                    name: 'middle',
                    age: 10
                }, {
                    name: 'youngest',
                    age: 5
                }, {
                    name: 'sally',
                    age: 1
                }],
            jobs: [{
                    title: 'plumber',
                    annualSalary: 50000
                }]
        });
        changer.undoAll();
        (0, chai_1.expect)(obj).to.eql(getTestObject());
    });
    describe('overrideTranspileResult', () => {
        const state = new BrsTranspileState_1.BrsTranspileState(new BrsFile_1.BrsFile('', '', new Program_1.Program({})));
        function transpileToString(transpilable) {
            if (transpilable.transpile) {
                const result = transpilable.transpile(state);
                if (Array.isArray(result)) {
                    return new source_map_1.SourceNode(null, null, null, result).toString();
                }
            }
        }
        it('overrides existing transpile method', () => {
            const expression = new Expression_1.LiteralExpression((0, creators_1.createToken)(TokenKind_1.TokenKind.IntegerLiteral, 'original'));
            (0, chai_1.expect)(transpileToString(expression)).to.eql('original');
            changer.overrideTranspileResult(expression, 'replaced');
            (0, chai_1.expect)(transpileToString(expression)).to.eql('replaced');
            changer.undoAll();
            (0, chai_1.expect)(transpileToString(expression)).to.eql('original');
        });
        it('gracefully handles missing transpile method', () => {
            const expression = {
                range: util_1.util.createRange(1, 2, 3, 4)
            };
            (0, chai_1.expect)(expression.transpile).not.to.exist;
            changer.overrideTranspileResult(expression, 'replaced');
            (0, chai_1.expect)(transpileToString(expression)).to.eql('replaced');
            changer.undoAll();
            (0, chai_1.expect)(expression.transpile).not.to.exist;
        });
    });
});
//# sourceMappingURL=AstEditor.spec.js.map
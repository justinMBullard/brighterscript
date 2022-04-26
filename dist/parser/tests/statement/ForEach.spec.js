"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../../../util");
const Program_1 = require("../../../Program");
const sinon_1 = require("sinon");
const testHelpers_spec_1 = require("../../../testHelpers.spec");
const sinon = (0, sinon_1.createSandbox)();
describe('ForEachStatement', () => {
    let rootDir = (0, util_1.standardizePath) `${process.cwd()}/.tmp/rootDir`;
    let program;
    let testTranspile = (0, testHelpers_spec_1.getTestTranspile)(() => [program, rootDir]);
    beforeEach(() => {
        program = new Program_1.Program({ rootDir: rootDir, sourceMap: true });
    });
    afterEach(() => {
        sinon.restore();
        program.dispose();
    });
    it('transpiles a simple loop', () => {
        testTranspile(`
            sub doLoop(data)
                for each i in data
                    print i
                end for
            end sub
        `);
    });
    it('adds newline to end of empty loop declaration', () => {
        testTranspile(`
            sub doLoop(data)
                for each i in data
                end for
            end sub
        `);
    });
});
//# sourceMappingURL=ForEach.spec.js.map
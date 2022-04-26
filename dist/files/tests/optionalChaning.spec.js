"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sinonImport = require("sinon");
const fsExtra = require("fs-extra");
const Program_1 = require("../../Program");
const util_1 = require("../../util");
const testHelpers_spec_1 = require("../../testHelpers.spec");
let sinon = sinonImport.createSandbox();
let tmpPath = (0, util_1.standardizePath) `${process.cwd()}/.tmp`;
let rootDir = (0, util_1.standardizePath) `${tmpPath}/rootDir`;
let stagingFolderPath = (0, util_1.standardizePath) `${tmpPath}/staging`;
describe('optional chaining', () => {
    let program;
    const testTranspile = (0, testHelpers_spec_1.getTestTranspile)(() => [program, rootDir]);
    beforeEach(() => {
        fsExtra.ensureDirSync(tmpPath);
        fsExtra.emptyDirSync(tmpPath);
        program = new Program_1.Program({
            rootDir: rootDir,
            stagingFolderPath: stagingFolderPath
        });
    });
    afterEach(() => {
        sinon.restore();
        fsExtra.ensureDirSync(tmpPath);
        fsExtra.emptyDirSync(tmpPath);
        program.dispose();
    });
    it('transpiles ?. properly', () => {
        testTranspile(`
            sub main()
                print m?.value
            end sub
        `);
    });
    it('transpiles ?[ properly', () => {
        testTranspile(`
            sub main()
                print m?["value"]
            end sub
        `);
    });
    it(`transpiles '?.[`, () => {
        testTranspile(`
            sub main()
                print m?["value"]
            end sub
        `);
    });
    it(`transpiles '?@`, () => {
        testTranspile(`
            sub main()
                print xmlThing?@someAttr
            end sub
        `);
    });
    it(`transpiles '?(`, () => {
        testTranspile(`
            sub main()
                localFunc = sub()
                end sub
                print localFunc?()
                print m.someFunc?()
            end sub
        `);
    });
    it('transpiles various use cases', () => {
        testTranspile(`
            print arr?.["0"]
            print arr?.value
            print assocArray?.[0]
            print assocArray?.getName()?.first?.second
            print createObject("roByteArray")?.value
            print createObject("roByteArray")?["0"]
            print createObject("roList")?.value
            print createObject("roList")?["0"]
            print createObject("roXmlList")?["0"]
            print createObject("roDateTime")?.value
            print createObject("roDateTime")?.GetTimeZoneOffset
            print createObject("roSGNode", "Node")?[0]
            print pi?.first?.second
            print success?.first?.second
            print a.b.xmlThing?@someAttr
            print a.b.localFunc?()
        `);
    });
});
//# sourceMappingURL=optionalChaning.spec.js.map
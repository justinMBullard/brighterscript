"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const DiagnosticFilterer_1 = require("./DiagnosticFilterer");
const util_1 = require("./util");
const sinon_1 = require("sinon");
const sinon = (0, sinon_1.createSandbox)();
let rootDir = (0, util_1.standardizePath) `${process.cwd()}/rootDir`;
describe('DiagnosticFilterer', () => {
    let filterer;
    let options = {
        rootDir: rootDir,
        diagnosticFilters: [
            //ignore these codes globally
            { codes: [1, 2, 3, 'X4'] },
            //ignore all codes from lib
            { src: 'lib/**/*.brs' },
            //ignore all codes from `packages` with absolute path
            { src: `${rootDir}/packages/**/*.brs` },
            //ignore specific codes for main.brs
            { src: 'source/main.brs', codes: [4] }
        ]
    };
    afterEach(() => {
        sinon.restore();
    });
    beforeEach(() => {
        filterer = new DiagnosticFilterer_1.DiagnosticFilterer();
    });
    describe('filter', () => {
        it('removes duplicates', () => {
            let diagnostic = getDiagnostic(100, `${rootDir}/source/common.brs`);
            (0, chai_1.expect)(filterer.filter(options, [diagnostic, diagnostic])).to.eql([diagnostic]);
        });
        it('uses global code filter', () => {
            (0, chai_1.expect)(filterer.filter(options, [
                getDiagnostic(1, `${rootDir}/source/common.brs`),
                getDiagnostic(2, `${rootDir}/source/common.brs`),
                getDiagnostic(4, `${rootDir}/source/common.brs`),
                getDiagnostic('X4', `${rootDir}/source/common.brs`)
            ]).map(x => x.code)).to.eql([4]);
        });
        it('works with relative src globs', () => {
            (0, chai_1.expect)(filterer.filter(options, [
                getDiagnostic(10, `${rootDir}/source/common.brs`),
                getDiagnostic(11, `${rootDir}/lib/a.brs`),
                getDiagnostic(12, `${rootDir}/lib/a/b/b.brs`),
                getDiagnostic(13, `${rootDir}/lib/a/b/c/c.brs`) //remove
            ]).map(x => x.code)).to.eql([10]);
        });
        it('works with absolute src globs', () => {
            (0, chai_1.expect)(filterer.filter(options, [
                getDiagnostic(10, `${rootDir}/source/common.brs`),
                getDiagnostic(11, `${rootDir}/packages/a.brs`),
                getDiagnostic(12, `${rootDir}/packages/a/b/b.brs`),
                getDiagnostic(13, `${rootDir}/packages/a/b/c/c.brs`),
                getDiagnostic('X14', `${rootDir}/packages/a/b/c/c.brs`) //remove
            ]).map(x => x.code)).to.eql([10]);
        });
        it('works with single file src glob', () => {
            (0, chai_1.expect)(filterer.filter(options, [
                getDiagnostic(4, `${rootDir}/source/main.brs`),
                getDiagnostic(11, `${rootDir}/common/a.brs`),
                getDiagnostic(12, `${rootDir}/common/a/b/b.brs`),
                getDiagnostic(13, `${rootDir}/common/a/b/c/c.brs`),
                getDiagnostic('X14', `${rootDir}/common/a/b/c/c.brs`) //keep
            ]).map(x => x.code)).to.eql([11, 12, 13, 'X14']);
        });
    });
    describe('standardizeDiagnosticFilters', () => {
        it('handles null and falsey diagnostic filters', () => {
            (0, chai_1.expect)(filterer.getDiagnosticFilters({
                diagnosticFilters: [null, undefined, false, true]
            })).to.eql([]);
        });
        it('handles a completely empty diagnostic filter', () => {
            (0, chai_1.expect)(filterer.getDiagnosticFilters({
                diagnosticFilters: [{}]
            })).to.eql([]);
        });
        it('handles number diagnostic filters', () => {
            (0, chai_1.expect)(filterer.getDiagnosticFilters({
                diagnosticFilters: [1, 2, 3]
            })).to.eql([{ codes: [1, 2, 3] }]);
        });
        it('handles standard diagnostic filters', () => {
            (0, chai_1.expect)(filterer.getDiagnosticFilters({
                diagnosticFilters: [{ src: 'file.brs', codes: [1, 2, 'X3'] }]
            })).to.eql([{ src: 'file.brs', codes: [1, 2, 'X3'] }]);
        });
        it('handles string-only diagnostic filter object', () => {
            (0, chai_1.expect)(filterer.getDiagnosticFilters({
                diagnosticFilters: [{ src: 'file.brs' }]
            })).to.eql([{ src: 'file.brs' }]);
        });
        it('handles code-only diagnostic filter object', () => {
            (0, chai_1.expect)(filterer.getDiagnosticFilters({
                diagnosticFilters: [{ codes: [1, 2, 'X3'] }]
            })).to.eql([
                { codes: [1, 2, 'X3'] }
            ]);
        });
        it('handles string diagnostic filter', () => {
            (0, chai_1.expect)(filterer.getDiagnosticFilters({
                diagnosticFilters: ['file.brs']
            })).to.eql([{ src: 'file.brs' }]);
        });
        it('converts ignoreErrorCodes to diagnosticFilters', () => {
            (0, chai_1.expect)(filterer.getDiagnosticFilters({
                ignoreErrorCodes: [1, 2, 'X3']
            })).to.eql([
                { codes: [1, 2, 'X3'] }
            ]);
        });
    });
    it('only filters by file once per unique file (case-insensitive)', () => {
        const stub = sinon.stub(filterer, 'filterFile').returns(null);
        filterer.filter(options, [
            getDiagnostic(1, (0, util_1.standardizePath) `${rootDir}/source/common1.brs`),
            getDiagnostic(2, (0, util_1.standardizePath) `${rootDir}/source/Common1.brs`),
            getDiagnostic(3, (0, util_1.standardizePath) `${rootDir}/source/common2.brs`),
            getDiagnostic(4, (0, util_1.standardizePath) `${rootDir}/source/Common2.brs`)
        ]);
        (0, chai_1.expect)(stub.callCount).to.eql(2);
        (0, chai_1.expect)(stub.getCalls().map(x => x.args[1])).to.eql([
            (0, util_1.standardizePath) `${rootDir.toLowerCase()}/source/common1.brs`,
            (0, util_1.standardizePath) `${rootDir.toLowerCase()}/source/common2.brs`
        ]);
    });
});
function getDiagnostic(code, pathAbsolute) {
    return {
        file: {
            pathAbsolute: (0, util_1.standardizePath) `${pathAbsolute}`
        },
        code: code
    };
}
//# sourceMappingURL=DiagnosticFilterer.spec.js.map
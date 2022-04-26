"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DiagnosticCollection_1 = require("./DiagnosticCollection");
const util_1 = require("./util");
const chai_1 = require("chai");
describe('DiagnosticCollection', () => {
    let collection;
    let diagnostics;
    let workspaces;
    beforeEach(() => {
        collection = new DiagnosticCollection_1.DiagnosticCollection();
        diagnostics = [];
        //make simple mock of workspace to pass tests
        workspaces = [{
                firstRunPromise: Promise.resolve(),
                builder: {
                    getDiagnostics: () => diagnostics
                }
            }];
    });
    async function testPatch(expected) {
        const patch = await collection.getPatch(workspaces);
        //convert the patch into our test structure
        const actual = {};
        for (const filePath in patch) {
            actual[filePath] = patch[filePath].map(x => x.message);
        }
        (0, chai_1.expect)(actual).to.eql(expected);
    }
    it('returns full list of diagnostics on first call, and nothing on second call', async () => {
        addDiagnostics('file1.brs', ['message1', 'message2']);
        addDiagnostics('file2.brs', ['message3', 'message4']);
        //first patch should return all
        await testPatch({
            'file1.brs': ['message1', 'message2'],
            'file2.brs': ['message3', 'message4']
        });
        //second patch should return empty (because nothing has changed)
        await testPatch({});
    });
    it('removes diagnostics in patch', async () => {
        addDiagnostics('file1.brs', ['message1', 'message2']);
        addDiagnostics('file2.brs', ['message3', 'message4']);
        //first patch should return all
        await testPatch({
            'file1.brs': ['message1', 'message2'],
            'file2.brs': ['message3', 'message4']
        });
        removeDiagnostic('file1.brs', 'message1');
        removeDiagnostic('file1.brs', 'message2');
        await testPatch({
            'file1.brs': []
        });
    });
    it('adds diagnostics in patch', async () => {
        addDiagnostics('file1.brs', ['message1', 'message2']);
        await testPatch({
            'file1.brs': ['message1', 'message2']
        });
        addDiagnostics('file2.brs', ['message3', 'message4']);
        await testPatch({
            'file2.brs': ['message3', 'message4']
        });
    });
    it('sends full list when file diagnostics have changed', async () => {
        addDiagnostics('file1.brs', ['message1', 'message2']);
        await testPatch({
            'file1.brs': ['message1', 'message2']
        });
        addDiagnostics('file1.brs', ['message3', 'message4']);
        await testPatch({
            'file1.brs': ['message1', 'message2', 'message3', 'message4']
        });
    });
    function removeDiagnostic(filePath, message) {
        for (let i = 0; i < diagnostics.length; i++) {
            const diagnostic = diagnostics[i];
            if (diagnostic.file.pathAbsolute === filePath && diagnostic.message === message) {
                diagnostics.splice(i, 1);
                return;
            }
        }
        throw new Error(`Cannot find diagnostic ${filePath}:${message}`);
    }
    function addDiagnostics(filePath, messages) {
        for (const message of messages) {
            diagnostics.push({
                file: {
                    pathAbsolute: filePath
                },
                range: util_1.default.createRange(0, 0, 0, 0),
                //the code doesn't matter as long as the messages are different, so just enforce unique messages for this test files
                code: 123,
                message: message
            });
        }
    }
});
//# sourceMappingURL=DiagnosticCollection.spec.js.map
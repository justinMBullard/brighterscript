"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileProtocolPath = void 0;
const chai_1 = require("chai");
const fsExtra = require("fs-extra");
const glob = require("glob");
const path = require("path");
const vscode_languageserver_1 = require("vscode-languageserver");
const deferred_1 = require("./deferred");
const LanguageServer_1 = require("./LanguageServer");
const sinonImport = require("sinon");
const util_1 = require("./util");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const assert = require("assert");
const testHelpers_spec_1 = require("./testHelpers.spec");
let sinon;
beforeEach(() => {
    sinon = sinonImport.createSandbox();
});
afterEach(() => {
    sinon.restore();
});
let rootDir = (0, util_1.standardizePath) `${process.cwd()}`;
describe('LanguageServer', () => {
    let server;
    //an any version of the server for easier private testing
    let svr;
    let workspaceFolders;
    let vfs = {};
    let physicalFilePaths = [];
    let connection = {
        onInitialize: () => null,
        onInitialized: () => null,
        onDidChangeConfiguration: () => null,
        onDidChangeWatchedFiles: () => null,
        onCompletion: () => null,
        onCompletionResolve: () => null,
        onDocumentSymbol: () => null,
        onWorkspaceSymbol: () => null,
        onDefinition: () => null,
        onSignatureHelp: () => null,
        onReferences: () => null,
        onHover: () => null,
        listen: () => null,
        sendNotification: () => null,
        sendDiagnostics: () => null,
        onExecuteCommand: () => null,
        onCodeAction: () => null,
        onDidOpenTextDocument: () => null,
        onDidChangeTextDocument: () => null,
        onDidCloseTextDocument: () => null,
        onWillSaveTextDocument: () => null,
        onWillSaveTextDocumentWaitUntil: () => null,
        onDidSaveTextDocument: () => null,
        onRequest: () => null,
        workspace: {
            getWorkspaceFolders: () => workspaceFolders,
            getConfiguration: () => {
                return {};
            }
        },
        tracer: {
            log: () => { }
        }
    };
    let program;
    beforeEach(() => {
        server = new LanguageServer_1.LanguageServer();
        svr = server;
        workspaceFolders = [];
        vfs = {};
        physicalFilePaths = [];
        //hijack the file resolver so we can inject in-memory files for our tests
        let originalResolver = svr.documentFileResolver;
        svr.documentFileResolver = (pathAbsolute) => {
            if (vfs[pathAbsolute]) {
                return vfs[pathAbsolute];
            }
            else {
                return originalResolver.call(svr, pathAbsolute);
            }
        };
        //mock the connection stuff
        svr.createConnection = () => {
            return connection;
        };
    });
    afterEach(async () => {
        try {
            await Promise.all(physicalFilePaths.map(pathAbsolute => fsExtra.unlinkSync(pathAbsolute)));
        }
        catch (e) {
        }
        server.dispose();
    });
    function addXmlFile(name, additionalXmlContents = '') {
        const filePath = `components/${name}.xml`;
        const contents = `<?xml version="1.0" encoding="utf-8"?>
        <component name="${name}" extends="Group">
            ${additionalXmlContents}
            <script type="text/brightscript" uri="${name}.brs" />
        </component>`;
        program.setFile(filePath, contents);
    }
    function addScriptFile(name, contents, extension = 'brs') {
        const filePath = (0, util_1.standardizePath) `components/${name}.${extension}`;
        const file = program.setFile(filePath, contents);
        if (file) {
            const document = vscode_languageserver_textdocument_1.TextDocument.create(util_1.util.pathToUri(file.pathAbsolute), 'brightscript', 1, contents);
            svr.documents._documents[document.uri] = document;
            return document;
        }
    }
    function writeToFs(pathAbsolute, contents) {
        physicalFilePaths.push(pathAbsolute);
        fsExtra.ensureDirSync(path.dirname(pathAbsolute));
        fsExtra.writeFileSync(pathAbsolute, contents);
    }
    describe('createStandaloneFileWorkspace', () => {
        it('never returns undefined', async () => {
            let filePath = `${rootDir}/.tmp/main.brs`;
            writeToFs(filePath, `sub main(): return: end sub`);
            let firstWorkspace = await svr.createStandaloneFileWorkspace(filePath);
            let secondWorkspace = await svr.createStandaloneFileWorkspace(filePath);
            (0, chai_1.expect)(firstWorkspace).to.equal(secondWorkspace);
        });
        it('filters out certain diagnostics', async () => {
            let filePath = `${rootDir}/.tmp/main.brs`;
            writeToFs(filePath, `sub main(): return: end sub`);
            let firstWorkspace = await svr.createStandaloneFileWorkspace(filePath);
            (0, testHelpers_spec_1.expectZeroDiagnostics)(firstWorkspace.builder.program);
        });
    });
    describe('sendDiagnostics', () => {
        it('waits for program to finish loading before sending diagnostics', async () => {
            svr.onInitialize({
                capabilities: {
                    workspace: {
                        workspaceFolders: true
                    }
                }
            });
            (0, chai_1.expect)(svr.clientHasWorkspaceFolderCapability).to.be.true;
            server.run();
            let deferred = new deferred_1.Deferred();
            let workspace = {
                builder: {
                    getDiagnostics: () => []
                },
                firstRunPromise: deferred.promise
            };
            //make a new not-completed workspace
            server.workspaces.push(workspace);
            //this call should wait for the builder to finish
            let p = svr.sendDiagnostics();
            // await s.createWorkspaces(
            await util_1.util.sleep(50);
            //simulate the program being created
            workspace.builder.program = {
                files: {}
            };
            deferred.resolve();
            await p;
            //test passed because no exceptions were thrown
        });
        it('dedupes diagnostics found at same location from multiple projects', async () => {
            var _a, _b;
            server.workspaces.push({
                firstRunPromise: Promise.resolve(),
                builder: {
                    getDiagnostics: () => {
                        return [{
                                file: {
                                    pathAbsolute: (0, util_1.standardizePath) `${rootDir}/source/main.brs`
                                },
                                code: 1000,
                                range: vscode_languageserver_1.Range.create(1, 2, 3, 4)
                            }];
                    }
                }
            }, {
                firstRunPromise: Promise.resolve(),
                builder: {
                    getDiagnostics: () => {
                        return [{
                                file: {
                                    pathAbsolute: (0, util_1.standardizePath) `${rootDir}/source/main.brs`
                                },
                                code: 1000,
                                range: vscode_languageserver_1.Range.create(1, 2, 3, 4)
                            }];
                    }
                }
            });
            svr.connection = connection;
            let stub = sinon.stub(svr.connection, 'sendDiagnostics');
            await svr.sendDiagnostics();
            (0, chai_1.expect)((_b = (_a = stub.getCall(0).args) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.diagnostics).to.be.lengthOf(1);
        });
    });
    describe('createWorkspace', () => {
        it('prevents creating package on first run', async () => {
            svr.connection = svr.createConnection();
            await svr.createWorkspace((0, util_1.standardizePath) `${rootDir}/TestRokuApp`);
            (0, chai_1.expect)(svr.workspaces[0].builder.program.options.copyToStaging).to.be.false;
        });
    });
    describe('onDidChangeWatchedFiles', () => {
        let workspacePath = (0, util_1.standardizePath) `${rootDir}/TestRokuApp`;
        let mainPath = (0, util_1.standardizePath) `${workspacePath}/source/main.brs`;
        it('picks up new files', async () => {
            workspaceFolders = [{
                    uri: getFileProtocolPath(workspacePath),
                    name: 'TestProject'
                }];
            svr.run();
            svr.onInitialize({
                capabilities: {}
            });
            writeToFs(mainPath, `sub main(): return: end sub`);
            await svr.onInitialized();
            (0, chai_1.expect)(server.workspaces[0].builder.program.hasFile(mainPath)).to.be.true;
            //move a file into the directory...the program should detect it
            let libPath = (0, util_1.standardizePath) `${workspacePath}/source/lib.brs`;
            writeToFs(libPath, 'sub lib(): return : end sub');
            server.workspaces[0].configFilePath = `${workspacePath}/bsconfig.json`;
            await svr.onDidChangeWatchedFiles({
                changes: [{
                        uri: getFileProtocolPath(libPath),
                        type: 1 //created
                    },
                    {
                        uri: getFileProtocolPath((0, util_1.standardizePath) `${workspacePath}/source`),
                        type: 2 //changed
                    }
                    // ,{
                    //     uri: 'file:///c%3A/projects/PlumMediaCenter/Roku/appconfig.brs',
                    //     type: 3 //deleted
                    // }
                ]
            });
            (0, chai_1.expect)(server.workspaces[0].builder.program.hasFile(libPath)).to.be.true;
        });
    });
    describe('handleFileChanges', () => {
        it('only adds files that match the files array', async () => {
            var _a;
            let setFileStub = sinon.stub().returns(Promise.resolve());
            const workspace = {
                builder: {
                    options: {
                        files: [
                            'source/**/*'
                        ]
                    },
                    getFileContents: sinon.stub().callsFake(() => Promise.resolve('')),
                    rootDir: rootDir,
                    program: {
                        setFile: setFileStub
                    }
                }
            };
            let mainPath = (0, util_1.standardizePath) `${rootDir}/source/main.brs`;
            // setVfsFile(mainPath, 'sub main()\nend sub');
            await server.handleFileChanges(workspace, [{
                    type: vscode_languageserver_1.FileChangeType.Created,
                    pathAbsolute: mainPath
                }]);
            (0, chai_1.expect)((_a = setFileStub.getCalls()[0]) === null || _a === void 0 ? void 0 : _a.args[0]).to.eql({
                src: mainPath,
                dest: (0, util_1.standardizePath) `source/main.brs`
            });
            let libPath = (0, util_1.standardizePath) `${rootDir}/components/lib.brs`;
            (0, chai_1.expect)(setFileStub.callCount).to.equal(1);
            await server.handleFileChanges(workspace, [{
                    type: vscode_languageserver_1.FileChangeType.Created,
                    pathAbsolute: libPath
                }]);
            //the function should have ignored the lib file, so no additional files were added
            (0, chai_1.expect)(setFileStub.callCount).to.equal(1);
        });
    });
    describe('onDidChangeWatchedFiles', () => {
        it('converts folder paths into an array of file paths', async () => {
            svr.connection = {
                sendNotification: () => { }
            };
            svr.workspaces.push({
                builder: {
                    getDiagnostics: () => [],
                    program: {
                        validate: () => { }
                    }
                }
            });
            sinon.stub(util_1.util, 'isDirectorySync').returns(true);
            sinon.stub(glob, 'sync').returns([
                (0, util_1.standardizePath) `${rootDir}/source/main.brs`,
                (0, util_1.standardizePath) `${rootDir}/source/lib.brs`
            ]);
            const stub = sinon.stub(server, 'handleFileChanges').returns(Promise.resolve());
            let sourcePath = (0, util_1.standardizePath) `${rootDir}/source`;
            await server.onDidChangeWatchedFiles({
                changes: [{
                        type: vscode_languageserver_1.FileChangeType.Created,
                        uri: getFileProtocolPath(sourcePath)
                    }]
            });
            (0, chai_1.expect)(stub.callCount).to.equal(1);
            (0, chai_1.expect)(stub.getCalls()[0].args[1]).to.eql([{
                    type: vscode_languageserver_1.FileChangeType.Created,
                    pathAbsolute: (0, util_1.standardizePath) `${rootDir}/source/main.brs`
                }, {
                    type: vscode_languageserver_1.FileChangeType.Created,
                    pathAbsolute: (0, util_1.standardizePath) `${rootDir}/source/lib.brs`
                }]);
        });
        it('does not trigger revalidates when changes are in files which are not tracked', async () => {
            svr.connection = {
                sendNotification: () => { }
            };
            svr.workspaces.push({
                builder: {
                    getDiagnostics: () => [],
                    program: {
                        validate: () => { }
                    }
                }
            });
            sinon.stub(util_1.util, 'isDirectorySync').returns(true);
            sinon.stub(glob, 'sync').returns([
                (0, util_1.standardizePath) `${rootDir}/source/main.brs`,
                (0, util_1.standardizePath) `${rootDir}/source/lib.brs`
            ]);
            const stub = sinon.stub(server, 'handleFileChanges').returns(Promise.resolve());
            await server.onDidChangeWatchedFiles({
                changes: [{
                        type: vscode_languageserver_1.FileChangeType.Created,
                        uri: getFileProtocolPath('some/other/folder/maybe/some/vscode/settings')
                    }]
            });
            (0, chai_1.expect)(stub.callCount).to.equal(1);
            (0, chai_1.expect)(stub.getCalls()[0].args[1]).to.eql([{
                    type: vscode_languageserver_1.FileChangeType.Created,
                    pathAbsolute: (0, util_1.standardizePath) `${rootDir}/source/main.brs`
                }, {
                    type: vscode_languageserver_1.FileChangeType.Created,
                    pathAbsolute: (0, util_1.standardizePath) `${rootDir}/source/lib.brs`
                }]);
        });
    });
    describe('onSignatureHelp', () => {
        let callDocument;
        const functionFileBaseName = 'buildAwesome';
        const funcDefinitionLine = 'function buildAwesome(confirm = true as Boolean)';
        beforeEach(async () => {
            svr.connection = svr.createConnection();
            await svr.createWorkspace((0, util_1.standardizePath) `${rootDir}/TestRokuApp`);
            program = svr.workspaces[0].builder.program;
            const name = `CallComponent`;
            callDocument = addScriptFile(name, `
                sub init()
                    shouldBuildAwesome = true
                    if shouldBuildAwesome then
                        buildAwesome()
                    else
                        m.buildAwesome()
                    end if
                end sub
            `);
            addXmlFile(name, `<script type="text/brightscript" uri="${functionFileBaseName}.bs" />`);
        });
        it('should return the expected signature info when documentation is included', async () => {
            const funcDescriptionComment = '@description Builds awesome for you';
            const funcReturnComment = '@return {Integer} The key to everything';
            addScriptFile(functionFileBaseName, `
                ' /**
                ' * ${funcDescriptionComment}
                ' * ${funcReturnComment}
                ' */
                ${funcDefinitionLine}
                    return 42
                end function
            `, 'bs');
            const result = await svr.onSignatureHelp({
                textDocument: {
                    uri: callDocument.uri
                },
                position: util_1.util.createPosition(4, 37)
            });
            (0, chai_1.expect)(result.signatures).to.not.be.empty;
            const signature = result.signatures[0];
            (0, chai_1.expect)(signature.label).to.equal(funcDefinitionLine);
            (0, chai_1.expect)(signature.documentation).to.include(funcDescriptionComment);
            (0, chai_1.expect)(signature.documentation).to.include(funcReturnComment);
        });
        it('should work if used on a property value', async () => {
            addScriptFile(functionFileBaseName, `
                ${funcDefinitionLine}
                    return 42
                end function
            `, 'bs');
            const result = await svr.onSignatureHelp({
                textDocument: {
                    uri: callDocument.uri
                },
                position: util_1.util.createPosition(6, 39)
            });
            (0, chai_1.expect)(result.signatures).to.not.be.empty;
            const signature = result.signatures[0];
            (0, chai_1.expect)(signature.label).to.equal(funcDefinitionLine);
        });
        it('should give the correct signature for a class method', async () => {
            const classMethodDefinitionLine = 'function buildAwesome(classVersion = true as Boolean)';
            addScriptFile(functionFileBaseName, `
                class ${functionFileBaseName}
                    ${classMethodDefinitionLine}
                        return 42
                    end function
                end class
            `, 'bs');
            const result = await svr.onSignatureHelp({
                textDocument: {
                    uri: callDocument.uri
                },
                position: util_1.util.createPosition(6, 39)
            });
            (0, chai_1.expect)(result.signatures).to.not.be.empty;
            const signature = result.signatures[0];
            (0, chai_1.expect)(signature.label).to.equal(classMethodDefinitionLine);
        });
    });
    describe('onReferences', () => {
        let functionDocument;
        let referenceFileUris = [];
        beforeEach(async () => {
            svr.connection = svr.createConnection();
            await svr.createWorkspace((0, util_1.standardizePath) `${rootDir}/TestRokuApp`);
            program = svr.workspaces[0].builder.program;
            const functionFileBaseName = 'buildAwesome';
            functionDocument = addScriptFile(functionFileBaseName, `
                function buildAwesome()
                    return 42
                end function
            `);
            for (let i = 0; i < 5; i++) {
                let name = `CallComponent${i}`;
                const document = addScriptFile(name, `
                    sub init()
                        shouldBuildAwesome = true
                        if shouldBuildAwesome then
                            buildAwesome()
                        end if
                    end sub
                `);
                addXmlFile(name, `<script type="text/brightscript" uri="${functionFileBaseName}.brs" />`);
                referenceFileUris.push(document.uri);
            }
        });
        it('should return the expected results if we entered on an identifier token', async () => {
            const references = await svr.onReferences({
                textDocument: {
                    uri: functionDocument.uri
                },
                position: util_1.util.createPosition(1, 32)
            });
            (0, chai_1.expect)(references.length).to.equal(referenceFileUris.length);
            for (const reference of references) {
                (0, chai_1.expect)(referenceFileUris).to.contain(reference.uri);
            }
        });
        it('should return an empty response if we entered on a token that should not return any results', async () => {
            let references = await svr.onReferences({
                textDocument: {
                    uri: functionDocument.uri
                },
                position: util_1.util.createPosition(1, 20) // function token
            });
            (0, chai_1.expect)(references).to.be.empty;
            references = await svr.onReferences({
                textDocument: {
                    uri: functionDocument.uri
                },
                position: util_1.util.createPosition(1, 20) // return token
            });
            (0, chai_1.expect)(references).to.be.empty;
        });
    });
    describe('onDefinition', () => {
        let functionDocument;
        let referenceDocument;
        beforeEach(async () => {
            svr.connection = svr.createConnection();
            await svr.createWorkspace((0, util_1.standardizePath) `${rootDir}/TestRokuApp`);
            program = svr.workspaces[0].builder.program;
            const functionFileBaseName = 'buildAwesome';
            functionDocument = addScriptFile(functionFileBaseName, `
                function pi()
                    return 3.141592653589793
                end function

                function buildAwesome()
                    return 42
                end function
            `);
            const name = `CallComponent`;
            referenceDocument = addScriptFile(name, `
                sub init()
                    shouldBuildAwesome = true
                    if shouldBuildAwesome then
                        buildAwesome()
                    else
                        m.top.observeFieldScope("loadFinished", "buildAwesome")
                    end if
                end sub
            `);
            addXmlFile(name, `<script type="text/brightscript" uri="${functionFileBaseName}.brs" />`);
        });
        it('should return the expected location if we entered on an identifier token', async () => {
            const locations = await svr.onDefinition({
                textDocument: {
                    uri: referenceDocument.uri
                },
                position: util_1.util.createPosition(4, 33)
            });
            (0, chai_1.expect)(locations.length).to.equal(1);
            const location = locations[0];
            (0, chai_1.expect)(location.uri).to.equal(functionDocument.uri);
            (0, chai_1.expect)(location.range.start.line).to.equal(5);
            (0, chai_1.expect)(location.range.start.character).to.equal(16);
        });
        it('should return the expected location if we entered on a StringLiteral token', async () => {
            const locations = await svr.onDefinition({
                textDocument: {
                    uri: referenceDocument.uri
                },
                position: util_1.util.createPosition(6, 77)
            });
            (0, chai_1.expect)(locations.length).to.equal(1);
            const location = locations[0];
            (0, chai_1.expect)(location.uri).to.equal(functionDocument.uri);
            (0, chai_1.expect)(location.range.start.line).to.equal(5);
            (0, chai_1.expect)(location.range.start.character).to.equal(16);
        });
        it('should return nothing if neither StringLiteral or identifier token entry point', async () => {
            const locations = await svr.onDefinition({
                textDocument: {
                    uri: referenceDocument.uri
                },
                position: util_1.util.createPosition(1, 18)
            });
            (0, chai_1.expect)(locations).to.be.empty;
        });
        it('should work on local variables as well', async () => {
            const locations = await svr.onDefinition({
                textDocument: {
                    uri: referenceDocument.uri
                },
                position: util_1.util.createPosition(3, 36)
            });
            (0, chai_1.expect)(locations.length).to.equal(1);
            const location = locations[0];
            (0, chai_1.expect)(location.uri).to.equal(referenceDocument.uri);
            (0, chai_1.expect)(location.range.start.line).to.equal(2);
            (0, chai_1.expect)(location.range.start.character).to.equal(20);
            (0, chai_1.expect)(location.range.end.line).to.equal(2);
            (0, chai_1.expect)(location.range.end.character).to.equal(38);
        });
        it('should work for bs class functions as well', async () => {
            const functionFileBaseName = 'Build';
            functionDocument = addScriptFile(functionFileBaseName, `
                class ${functionFileBaseName}
                    function awesome()
                        return 42
                    end function
                end class
            `, 'bs');
            const name = `CallComponent`;
            referenceDocument = addScriptFile(name, `
                sub init()
                    build = new Build()
                    build.awesome()
                end sub
            `);
            addXmlFile(name, `<script type="text/brightscript" uri="${functionFileBaseName}.bs" />`);
            const locations = await svr.onDefinition({
                textDocument: {
                    uri: referenceDocument.uri
                },
                position: util_1.util.createPosition(3, 30)
            });
            (0, chai_1.expect)(locations.length).to.equal(1);
            const location = locations[0];
            (0, chai_1.expect)(location.uri).to.equal(functionDocument.uri);
            (0, chai_1.expect)(location.range.start.line).to.equal(2);
            (0, chai_1.expect)(location.range.start.character).to.equal(20);
            (0, chai_1.expect)(location.range.end.line).to.equal(4);
            (0, chai_1.expect)(location.range.end.character).to.equal(32);
        });
    });
    describe('onDocumentSymbol', () => {
        beforeEach(async () => {
            svr.connection = svr.createConnection();
            await svr.createWorkspace((0, util_1.standardizePath) `${rootDir}/TestRokuApp`);
            program = svr.workspaces[0].builder.program;
        });
        it('should return the expected symbols even if pulled from cache', async () => {
            const document = addScriptFile('buildAwesome', `
                function pi()
                    return 3.141592653589793
                end function

                function buildAwesome()
                    return 42
                end function
            `);
            // We run the check twice as the first time is with it not cached and second time is with it cached
            for (let i = 0; i < 2; i++) {
                const symbols = await svr.onDocumentSymbol({
                    textDocument: document
                });
                (0, chai_1.expect)(symbols.length).to.equal(2);
                (0, chai_1.expect)(symbols[0].name).to.equal('pi');
                (0, chai_1.expect)(symbols[1].name).to.equal('buildAwesome');
            }
        });
        it('should work for brightscript classes as well', async () => {
            const document = addScriptFile('MyFirstClass', `
                class MyFirstClass
                    function pi()
                        return 3.141592653589793
                    end function

                    function buildAwesome()
                        return 42
                    end function
                end class
            `, 'bs');
            // We run the check twice as the first time is with it not cached and second time is with it cached
            for (let i = 0; i < 2; i++) {
                const symbols = await svr.onDocumentSymbol({
                    textDocument: document
                });
                (0, chai_1.expect)(symbols.length).to.equal(1);
                const classSymbol = symbols[0];
                (0, chai_1.expect)(classSymbol.name).to.equal('MyFirstClass');
                const classChildrenSymbols = classSymbol.children;
                (0, chai_1.expect)(classChildrenSymbols.length).to.equal(2);
                (0, chai_1.expect)(classChildrenSymbols[0].name).to.equal('pi');
                (0, chai_1.expect)(classChildrenSymbols[1].name).to.equal('buildAwesome');
            }
        });
        it('should work for brightscript namespaces as well', async () => {
            const document = addScriptFile('MyFirstNamespace', `
                namespace MyFirstNamespace
                    function pi()
                        return 3.141592653589793
                    end function

                    function buildAwesome()
                        return 42
                    end function
                end namespace
            `, 'bs');
            // We run the check twice as the first time is with it not cached and second time is with it cached
            for (let i = 0; i < 2; i++) {
                const symbols = await svr.onDocumentSymbol({
                    textDocument: document
                });
                (0, chai_1.expect)(symbols.length).to.equal(1);
                const namespaceSymbol = symbols[0];
                (0, chai_1.expect)(namespaceSymbol.name).to.equal('MyFirstNamespace');
                const classChildrenSymbols = namespaceSymbol.children;
                (0, chai_1.expect)(classChildrenSymbols.length).to.equal(2);
                (0, chai_1.expect)(classChildrenSymbols[0].name).to.equal('MyFirstNamespace.pi');
                (0, chai_1.expect)(classChildrenSymbols[1].name).to.equal('MyFirstNamespace.buildAwesome');
            }
        });
    });
    describe('onWorkspaceSymbol', () => {
        beforeEach(async () => {
            svr.connection = svr.createConnection();
            await svr.createWorkspace((0, util_1.standardizePath) `${rootDir}/TestRokuApp`);
            program = svr.workspaces[0].builder.program;
        });
        it('should return the expected symbols even if pulled from cache', async () => {
            const className = 'MyFirstClass';
            const namespaceName = 'MyFirstNamespace';
            addScriptFile('buildAwesome', `
                function pi()
                    return 3.141592653589793
                end function

                function buildAwesome()
                    return 42
                end function
            `);
            addScriptFile(className, `
                class ${className}
                    function ${className}pi()
                        return 3.141592653589793
                    end function

                    function ${className}buildAwesome()
                        return 42
                    end function
                end class
            `, 'bs');
            addScriptFile(namespaceName, `
                namespace ${namespaceName}
                    function pi()
                        return 3.141592653589793
                    end function

                    function buildAwesome()
                        return 42
                    end function
                end namespace
            `, 'bs');
            // We run the check twice as the first time is with it not cached and second time is with it cached
            for (let i = 0; i < 2; i++) {
                const symbols = await svr.onWorkspaceSymbol();
                (0, chai_1.expect)(symbols.length).to.equal(8);
                for (const symbol of symbols) {
                    switch (symbol.name) {
                        case 'pi':
                            break;
                        case 'buildAwesome':
                            break;
                        case `${className}`:
                            break;
                        case `${className}pi`:
                            (0, chai_1.expect)(symbol.containerName).to.equal(className);
                            break;
                        case `${className}buildAwesome`:
                            (0, chai_1.expect)(symbol.containerName).to.equal(className);
                            break;
                        case `${namespaceName}`:
                            break;
                        case `${namespaceName}.pi`:
                            (0, chai_1.expect)(symbol.containerName).to.equal(namespaceName);
                            break;
                        case `${namespaceName}.buildAwesome`:
                            (0, chai_1.expect)(symbol.containerName).to.equal(namespaceName);
                            break;
                        default:
                            assert.fail(`'${symbol.name}' was not expected in list of symbols`);
                    }
                }
            }
        });
        it('should work for nested class as well', async () => {
            const nestedNamespace = 'containerNamespace';
            const nestedClassName = 'nestedClass';
            addScriptFile('nested', `
                namespace ${nestedNamespace}
                    class ${nestedClassName}
                        function pi()
                            return 3.141592653589793
                        end function

                        function buildAwesome()
                            return 42
                        end function
                    end class
                end namespace
            `, 'bs');
            // We run the check twice as the first time is with it not cached and second time is with it cached
            for (let i = 0; i < 2; i++) {
                const symbols = await svr.onWorkspaceSymbol();
                (0, chai_1.expect)(symbols.length).to.equal(4);
                (0, chai_1.expect)(symbols[0].name).to.equal(`pi`);
                (0, chai_1.expect)(symbols[0].containerName).to.equal(`${nestedNamespace}.${nestedClassName}`);
                (0, chai_1.expect)(symbols[1].name).to.equal(`buildAwesome`);
                (0, chai_1.expect)(symbols[1].containerName).to.equal(`${nestedNamespace}.${nestedClassName}`);
                (0, chai_1.expect)(symbols[2].name).to.equal(`${nestedNamespace}.${nestedClassName}`);
                (0, chai_1.expect)(symbols[2].containerName).to.equal(nestedNamespace);
                (0, chai_1.expect)(symbols[3].name).to.equal(nestedNamespace);
            }
        });
    });
});
function getFileProtocolPath(fullPath) {
    let result;
    if (fullPath.startsWith('/') || fullPath.startsWith('\\')) {
        result = `file://${fullPath}`;
    }
    else {
        result = `file:///${fullPath}`;
    }
    return result;
}
exports.getFileProtocolPath = getFileProtocolPath;
//# sourceMappingURL=LanguageServer.spec.js.map
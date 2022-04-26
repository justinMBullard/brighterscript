"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const fsExtra = require("fs-extra");
const sinon_1 = require("sinon");
const sinon = (0, sinon_1.createSandbox)();
const Program_1 = require("./Program");
const ProgramBuilder_1 = require("./ProgramBuilder");
const util_1 = require("./util");
const Logger_1 = require("./Logger");
const diagnosticUtils = require("./diagnosticUtils");
const _1 = require(".");
const vscode_languageserver_1 = require("vscode-languageserver");
const BrsFile_1 = require("./files/BrsFile");
const testHelpers_spec_1 = require("./testHelpers.spec");
describe('ProgramBuilder', () => {
    let tmpPath = (0, util_1.standardizePath) `${process.cwd()}/.tmp`;
    let rootDir = (0, util_1.standardizePath) `${tmpPath}/rootDir`;
    let stagingFolderPath = (0, util_1.standardizePath) `${tmpPath}/staging`;
    beforeEach(() => {
        fsExtra.ensureDirSync(rootDir);
        fsExtra.emptyDirSync(tmpPath);
    });
    afterEach(() => {
        sinon.restore();
        fsExtra.ensureDirSync(tmpPath);
        fsExtra.emptyDirSync(tmpPath);
    });
    let builder;
    beforeEach(() => {
        builder = new ProgramBuilder_1.ProgramBuilder();
        builder.options = util_1.util.normalizeAndResolveConfig({
            rootDir: rootDir
        });
        builder.program = new Program_1.Program(builder.options);
        builder.logger = new Logger_1.Logger();
    });
    afterEach(() => {
        builder.dispose();
    });
    describe('loadAllFilesAST', () => {
        it('loads .bs, .brs, .xml files', async () => {
            sinon.stub(util_1.util, 'getFilePaths').returns(Promise.resolve([{
                    src: 'file1.brs',
                    dest: 'file1.brs'
                }, {
                    src: 'file2.bs',
                    dest: 'file2.bs'
                }, {
                    src: 'file3.xml',
                    dest: 'file4.xml'
                }]));
            let stub = sinon.stub(builder.program, 'setFile');
            sinon.stub(builder, 'getFileContents').returns(Promise.resolve(''));
            await builder['loadAllFilesAST']();
            (0, chai_1.expect)(stub.getCalls()).to.be.lengthOf(3);
        });
        it('loads all type definitions first', async () => {
            const requestedFiles = [];
            builder['fileResolvers'].push((filePath) => {
                requestedFiles.push((0, util_1.standardizePath)(filePath));
            });
            fsExtra.outputFileSync((0, util_1.standardizePath) `${rootDir}/source/main.brs`, '');
            fsExtra.outputFileSync((0, util_1.standardizePath) `${rootDir}/source/main.d.bs`, '');
            fsExtra.outputFileSync((0, util_1.standardizePath) `${rootDir}/source/lib.d.bs`, '');
            fsExtra.outputFileSync((0, util_1.standardizePath) `${rootDir}/source/lib.brs`, '');
            const stub = sinon.stub(builder.program, 'setFile');
            await builder['loadAllFilesAST']();
            const srcPaths = stub.getCalls().map(x => x.args[0].src);
            //the d files should be first
            (0, chai_1.expect)(srcPaths.indexOf((0, util_1.standardizePath) `${rootDir}/source/main.d.bs`)).within(0, 1);
            (0, chai_1.expect)(srcPaths.indexOf((0, util_1.standardizePath) `${rootDir}/source/lib.d.bs`)).within(0, 1);
            //the non-d files should be last
            (0, chai_1.expect)(srcPaths.indexOf((0, util_1.standardizePath) `${rootDir}/source/main.brs`)).within(2, 3);
            (0, chai_1.expect)(srcPaths.indexOf((0, util_1.standardizePath) `${rootDir}/source/lib.brs`)).within(2, 3);
        });
        it('does not load non-existent type definition file', async () => {
            const requestedFiles = [];
            builder['fileResolvers'].push((filePath) => {
                requestedFiles.push((0, util_1.standardizePath)(filePath));
            });
            fsExtra.outputFileSync((0, util_1.standardizePath) `${rootDir}/source/main.brs`, '');
            await builder['loadAllFilesAST']();
            //the d file should not be requested because `loadAllFilesAST` knows it doesn't exist
            (0, chai_1.expect)(requestedFiles).not.to.include((0, util_1.standardizePath) `${rootDir}/source/main.d.bs`);
            (0, chai_1.expect)(requestedFiles).to.include((0, util_1.standardizePath) `${rootDir}/source/main.brs`);
        });
    });
    describe('run', () => {
        it('uses default options when the config file fails to parse', async () => {
            //supress the console log statements for the bsconfig parse errors
            sinon.stub(console, 'log').returns(undefined);
            //totally bogus config file
            fsExtra.outputFileSync((0, util_1.standardizePath) `${rootDir}/bsconfig.json`, '{');
            await builder.run({
                project: (0, util_1.standardizePath) `${rootDir}/bsconfig.json`,
                username: 'john'
            });
            (0, chai_1.expect)(builder.program.options.username).to.equal('rokudev');
        });
        //this fails on the windows travis build for some reason. skipping for now since it's not critical
        it.skip('throws an exception when run is called twice', async () => {
            await builder.run({});
            try {
                await builder.run({});
                (0, chai_1.expect)(true).to.be.false('Should have thrown exception');
            }
            catch (e) { }
        });
        afterEach(() => {
            try {
                fsExtra.removeSync(`${rootDir}/testProject`);
            }
            catch (e) {
                console.error(e);
            }
        });
        it('only adds the last file with the same pkg path', async () => {
            //undo the vfs for this test
            sinon.restore();
            fsExtra.ensureDirSync(`${rootDir}/testProject/source`);
            fsExtra.writeFileSync(`${rootDir}/testProject/source/lib1.brs`, 'sub doSomething()\nprint "lib1"\nend sub');
            fsExtra.writeFileSync(`${rootDir}/testProject/source/lib2.brs`, 'sub doSomething()\nprint "lib2"\nend sub');
            await builder.run({
                rootDir: (0, util_1.standardizePath) `${rootDir}/testProject`,
                createPackage: false,
                deploy: false,
                copyToStaging: false,
                //both files should want to be the `source/lib.brs` file...but only the last one should win
                files: [{
                        src: (0, util_1.standardizePath) `${rootDir}/testProject/source/lib1.brs`,
                        dest: 'source/lib.brs'
                    }, {
                        src: (0, util_1.standardizePath) `${rootDir}/testProject/source/lib2.brs`,
                        dest: 'source/lib.brs'
                    }]
            });
            (0, testHelpers_spec_1.expectZeroDiagnostics)(builder);
            (0, chai_1.expect)(builder.program.getFileByPathAbsolute((0, util_1.standardizePath) ``));
        });
    });
    it('uses a unique logger for each builder', async () => {
        let builder1 = new ProgramBuilder_1.ProgramBuilder();
        sinon.stub(builder1, 'runOnce').returns(Promise.resolve());
        sinon.stub(builder1, 'loadAllFilesAST').returns(Promise.resolve());
        let builder2 = new ProgramBuilder_1.ProgramBuilder();
        sinon.stub(builder2, 'runOnce').returns(Promise.resolve());
        sinon.stub(builder2, 'loadAllFilesAST').returns(Promise.resolve());
        (0, chai_1.expect)(builder1.logger).not.to.equal(builder2.logger);
        await Promise.all([
            builder1.run({
                logLevel: Logger_1.LogLevel.info,
                rootDir: rootDir,
                stagingFolderPath: stagingFolderPath,
                watch: false
            }),
            builder2.run({
                logLevel: Logger_1.LogLevel.error,
                rootDir: rootDir,
                stagingFolderPath: stagingFolderPath,
                watch: false
            })
        ]);
        //the loggers should have different log levels
        (0, chai_1.expect)(builder1.logger.logLevel).to.equal(Logger_1.LogLevel.info);
        (0, chai_1.expect)(builder2.logger.logLevel).to.equal(Logger_1.LogLevel.error);
    });
    it('does not error when loading stagingFolderPath from bsconfig.json', async () => {
        fsExtra.ensureDirSync(rootDir);
        fsExtra.writeFileSync(`${rootDir}/bsconfig.json`, `{
            "stagingFolderPath": "./out"
        }`);
        let builder = new ProgramBuilder_1.ProgramBuilder();
        await builder.run({
            cwd: rootDir,
            createPackage: false
        });
    });
    it('forwards program events', async () => {
        const beforeProgramValidate = sinon.spy();
        const afterProgramValidate = sinon.spy();
        builder.plugins.add({
            name: 'forwards program events',
            beforeProgramValidate: beforeProgramValidate,
            afterProgramValidate: afterProgramValidate
        });
        await builder.run({
            createPackage: false
        });
        (0, chai_1.expect)(beforeProgramValidate.callCount).to.equal(1);
        (0, chai_1.expect)(afterProgramValidate.callCount).to.equal(1);
    });
    describe('printDiagnostics', () => {
        it('prints no diagnostics when showDiagnosticsInConsole is false', () => {
            builder.options.showDiagnosticsInConsole = false;
            let stub = sinon.stub(builder, 'getDiagnostics').returns([]);
            (0, chai_1.expect)(stub.called).to.be.false;
            builder['printDiagnostics']();
        });
        it('prints nothing when there are no diagnostics', () => {
            builder.options.showDiagnosticsInConsole = true;
            sinon.stub(builder, 'getDiagnostics').returns([]);
            let printStub = sinon.stub(diagnosticUtils, 'printDiagnostic');
            builder['printDiagnostics']();
            (0, chai_1.expect)(printStub.called).to.be.false;
        });
        it('prints diagnostic, when file is present in project', () => {
            builder.options.showDiagnosticsInConsole = true;
            let diagnostics = createBsDiagnostic('p1', ['m1']);
            let f1 = diagnostics[0].file;
            f1.fileContents = `l1\nl2\nl3`;
            sinon.stub(builder, 'getDiagnostics').returns(diagnostics);
            sinon.stub(builder.program, 'getFileByPathAbsolute').returns(f1);
            let printStub = sinon.stub(diagnosticUtils, 'printDiagnostic');
            builder['printDiagnostics']();
            (0, chai_1.expect)(printStub.called).to.be.true;
        });
    });
    it('prints diagnostic, when file has no lines', () => {
        builder.options.showDiagnosticsInConsole = true;
        let diagnostics = createBsDiagnostic('p1', ['m1']);
        let f1 = diagnostics[0].file;
        f1.fileContents = null;
        sinon.stub(builder, 'getDiagnostics').returns(diagnostics);
        sinon.stub(builder.program, 'getFileByPathAbsolute').returns(f1);
        let printStub = sinon.stub(diagnosticUtils, 'printDiagnostic');
        builder['printDiagnostics']();
        (0, chai_1.expect)(printStub.called).to.be.true;
    });
    it('prints diagnostic, when no file present', () => {
        builder.options.showDiagnosticsInConsole = true;
        let diagnostics = createBsDiagnostic('p1', ['m1']);
        sinon.stub(builder, 'getDiagnostics').returns(diagnostics);
        sinon.stub(builder.program, 'getFileByPathAbsolute').returns(null);
        let printStub = sinon.stub(diagnosticUtils, 'printDiagnostic');
        builder['printDiagnostics']();
        (0, chai_1.expect)(printStub.called).to.be.true;
    });
    describe('require', () => {
        it('loads relative and absolute items', async () => {
            const workingDir = (0, util_1.standardizePath) `${tmpPath}/require-test`;
            const relativeOutputPath = `${tmpPath}/relative.txt`.replace(/\\+/g, '/');
            const moduleOutputPath = `${tmpPath}/brighterscript-require-test.txt`.replace(/\\+/g, '/');
            //create roku project files
            fsExtra.outputFileSync((0, util_1.standardizePath) `${workingDir}/src/manifest`, '');
            //create "modules"
            fsExtra.outputFileSync((0, util_1.standardizePath) `${workingDir}/relative.js`, `
                var fs = require('fs');
                fs.writeFileSync('${relativeOutputPath}', '');
            `);
            fsExtra.outputJsonSync((0, util_1.standardizePath) `${workingDir}/node_modules/brighterscript-require-test/package.json`, {
                name: 'brighterscript-require-test',
                version: '1.0.0',
                main: 'index.js'
            });
            fsExtra.outputFileSync((0, util_1.standardizePath) `${workingDir}/node_modules/brighterscript-require-test/index.js`, `
                var fs = require('fs');
                fs.writeFileSync('${moduleOutputPath}', '');
            `);
            //create the bsconfig file
            fsExtra.outputJsonSync((0, util_1.standardizePath) `${workingDir}/bsconfig.json`, {
                rootDir: 'src',
                require: [
                    //relative script
                    './relative.js',
                    //script from node_modules
                    'brighterscript-require-test'
                ]
            });
            builder = new ProgramBuilder_1.ProgramBuilder();
            await builder.run({
                cwd: workingDir
            });
            (0, chai_1.expect)(fsExtra.pathExistsSync(relativeOutputPath)).to.be.true;
            (0, chai_1.expect)(fsExtra.pathExistsSync(moduleOutputPath)).to.be.true;
        });
    });
});
function createBsDiagnostic(filePath, messages) {
    let file = new BrsFile_1.BrsFile(filePath, filePath, null);
    let diagnostics = [];
    for (let message of messages) {
        let d = createDiagnostic(file, 1, message);
        d.file = file;
        diagnostics.push(d);
    }
    return diagnostics;
}
function createDiagnostic(bscFile, code, message, startLine = 0, startCol = 99999, endLine = 0, endCol = 99999, severity = vscode_languageserver_1.DiagnosticSeverity.Error) {
    const diagnostic = {
        code: code,
        message: message,
        range: _1.Range.create(startLine, startCol, endLine, endCol),
        file: bscFile,
        severity: severity
    };
    return diagnostic;
}
//# sourceMappingURL=ProgramBuilder.spec.js.map
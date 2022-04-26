"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const path = require("path");
const util_1 = require("./util");
const vscode_languageserver_1 = require("vscode-languageserver");
const fsExtra = require("fs-extra");
const sinon_1 = require("sinon");
const sinon = (0, sinon_1.createSandbox)();
let tempDir = (0, util_1.standardizePath) `${process.cwd()}/.tmp`;
let rootDir = (0, util_1.standardizePath) `${tempDir}/rootDir`;
let cwd = process.cwd();
describe('util', () => {
    beforeEach(() => {
        sinon.restore();
        fsExtra.ensureDirSync(tempDir);
        fsExtra.emptyDirSync(tempDir);
    });
    afterEach(() => {
        sinon.restore();
        fsExtra.ensureDirSync(tempDir);
        fsExtra.emptyDirSync(tempDir);
    });
    describe('fileExists', () => {
        it('returns false when no value is passed', async () => {
            (0, chai_1.expect)(await util_1.default.pathExists(undefined)).to.be.false;
        });
    });
    describe('uriToPath', () => {
        it('retains original drive casing for windows', () => {
            (0, chai_1.expect)(util_1.default.uriToPath(`file:///C:${path.sep}something`)).to.equal(`C:${path.sep}something`);
            (0, chai_1.expect)(util_1.default.uriToPath(`file:///c:${path.sep}something`)).to.equal(`c:${path.sep}something`);
        });
    });
    describe('getRokuPkgPath', () => {
        it('replaces more than one windows slash in a path', () => {
            (0, chai_1.expect)(util_1.default.getRokuPkgPath('source\\folder1\\folder2\\file.brs')).to.eql('pkg:/source/folder1/folder2/file.brs');
        });
    });
    describe('loadConfigFile', () => {
        it('returns undefined when no path is provided', () => {
            (0, chai_1.expect)(util_1.default.loadConfigFile(undefined)).to.be.undefined;
        });
        it('returns undefined when the path does not exist', () => {
            (0, chai_1.expect)(util_1.default.loadConfigFile(`?${rootDir}/donotexist.json`)).to.be.undefined;
        });
        it('returns proper list of ancestor project paths', () => {
            fsExtra.outputFileSync((0, util_1.standardizePath) `${rootDir}/child.json`, `{"extends": "parent.json"}`);
            fsExtra.outputFileSync((0, util_1.standardizePath) `${rootDir}/parent.json`, `{"extends": "grandparent.json"}`);
            fsExtra.outputFileSync((0, util_1.standardizePath) `${rootDir}/grandparent.json`, `{"extends": "greatgrandparent.json"}`);
            fsExtra.outputFileSync((0, util_1.standardizePath) `${rootDir}/greatgrandparent.json`, `{}`);
            (0, chai_1.expect)(util_1.default.loadConfigFile((0, util_1.standardizePath) `${rootDir}/child.json`)._ancestors.map(x => (0, util_1.standardizePath)(x))).to.eql([
                (0, util_1.standardizePath) `${rootDir}/child.json`,
                (0, util_1.standardizePath) `${rootDir}/parent.json`,
                (0, util_1.standardizePath) `${rootDir}/grandparent.json`,
                (0, util_1.standardizePath) `${rootDir}/greatgrandparent.json`
            ]);
        });
        it('returns empty ancestors list for non-extends files', () => {
            fsExtra.outputFileSync((0, util_1.standardizePath) `${rootDir}/child.json`, `{}`);
            let config = util_1.default.loadConfigFile((0, util_1.standardizePath) `${rootDir}/child.json`);
            (0, chai_1.expect)(config._ancestors.map(x => (0, util_1.standardizePath)(x))).to.eql([
                (0, util_1.standardizePath) `${rootDir}/child.json`
            ]);
        });
        it('resolves plugins path relatively to config file', () => {
            const config = {
                plugins: [
                    './plugins.js',
                    './scripts/plugins.js',
                    '../scripts/plugins.js',
                    'bsplugin'
                ]
            };
            util_1.default.resolvePathsRelativeTo(config, 'plugins', (0, util_1.standardizePath) `${rootDir}/config`);
            (0, chai_1.expect)(config.plugins.map(p => (p ? util_1.default.pathSepNormalize(p, '/') : undefined))).to.deep.equal([
                `${rootDir}/config/plugins.js`,
                `${rootDir}/config/scripts/plugins.js`,
                `${rootDir}/scripts/plugins.js`,
                'bsplugin'
            ].map(p => util_1.default.pathSepNormalize(p, '/')));
        });
        it('removes duplicate plugins and undefined values', () => {
            const config = {
                plugins: [
                    './plugins.js',
                    'bsplugin',
                    '../config/plugins.js',
                    'bsplugin',
                    undefined
                ]
            };
            util_1.default.resolvePathsRelativeTo(config, 'plugins', (0, util_1.standardizePath) `${process.cwd()}/config`);
            (0, chai_1.expect)(config.plugins.map(p => (p ? util_1.default.pathSepNormalize(p, '/') : undefined))).to.deep.equal([
                (0, util_1.standardizePath) `${process.cwd()}/config/plugins.js`,
                'bsplugin'
            ].map(p => util_1.default.pathSepNormalize(p, '/')));
        });
    });
    describe('getConfigFilePath', () => {
        it('returns undefined when it does not find the file', () => {
            let configFilePath = util_1.default.getConfigFilePath((0, util_1.standardizePath) `${process.cwd()}/testProject/project1`);
            (0, chai_1.expect)(configFilePath).not.to.exist;
        });
        it('returns path to file when found', () => {
            fsExtra.outputFileSync((0, util_1.standardizePath) `${tempDir}/rootDir/bsconfig.json`, '');
            (0, chai_1.expect)(util_1.default.getConfigFilePath((0, util_1.standardizePath) `${tempDir}/rootDir`)).to.equal((0, util_1.standardizePath) `${tempDir}/rootDir/bsconfig.json`);
        });
        it('finds config file in parent directory', () => {
            const bsconfigPath = (0, util_1.standardizePath) `${tempDir}/rootDir/bsconfig.json`;
            fsExtra.outputFileSync(bsconfigPath, '');
            fsExtra.ensureDirSync(`${tempDir}/rootDir/source`);
            (0, chai_1.expect)(util_1.default.getConfigFilePath((0, util_1.standardizePath) `${tempDir}/rootDir/source`)).to.equal((0, util_1.standardizePath) `${tempDir}/rootDir/bsconfig.json`);
        });
        it('uses cwd when not provided', () => {
            //sanity check
            (0, chai_1.expect)(util_1.default.getConfigFilePath()).not.to.exist;
            const rootDir = (0, util_1.standardizePath) `${tempDir}/rootDir`;
            fsExtra.outputFileSync(`${rootDir}/bsconfig.json`, '');
            fsExtra.ensureDirSync(rootDir);
            process.chdir(rootDir);
            try {
                (0, chai_1.expect)(util_1.default.getConfigFilePath()).to.equal((0, util_1.standardizePath) `${rootDir}/bsconfig.json`);
            }
            finally {
                process.chdir(cwd);
            }
        });
    });
    describe('pathSepNormalize', () => {
        it('works for both types of separators', () => {
            (0, chai_1.expect)(util_1.default.pathSepNormalize('c:/some\\path', '\\')).to.equal('c:\\some\\path');
            (0, chai_1.expect)(util_1.default.pathSepNormalize('c:/some\\path', '/')).to.equal('c:/some/path');
        });
        it('does not throw when given `undefined`', () => {
            (0, chai_1.expect)(undefined).to.be.undefined;
        });
    });
    describe('lowerDrivePath', () => {
        it('forces drive letters to lower case', () => {
            //unix slashes
            (0, chai_1.expect)(util_1.default.driveLetterToLower('C:/projects')).to.equal('c:/projects');
            //windows slashes
            (0, chai_1.expect)(util_1.default.driveLetterToLower('C:\\projects')).to.equal(('c:\\projects'));
        });
    });
    describe('findClosestConfigFile', () => {
        it('finds config up the chain', async () => {
            const brsFilePath = (0, util_1.standardizePath) `${rootDir}/src/app.brs`;
            const currentDirBsConfigPath = (0, util_1.standardizePath) `${rootDir}/src/bsconfig.json`;
            const currentDirBrsConfigPath = (0, util_1.standardizePath) `${rootDir}/src/brsconfig.json`;
            const parentDirBsConfigPath = (0, util_1.standardizePath) `${rootDir}/bsconfig.json`;
            const parentDirBrsConfigPath = (0, util_1.standardizePath) `${rootDir}/brsconfig.json`;
            fsExtra.outputFileSync(brsFilePath, '');
            fsExtra.outputFileSync(currentDirBsConfigPath, '');
            fsExtra.outputFileSync(currentDirBrsConfigPath, '');
            fsExtra.outputFileSync(parentDirBsConfigPath, '');
            fsExtra.outputFileSync(parentDirBrsConfigPath, '');
            (0, chai_1.expect)(await util_1.default.findClosestConfigFile(brsFilePath)).to.equal(currentDirBsConfigPath);
            fsExtra.removeSync(currentDirBsConfigPath);
            (0, chai_1.expect)(await util_1.default.findClosestConfigFile(brsFilePath)).to.equal(currentDirBrsConfigPath);
            fsExtra.removeSync(currentDirBrsConfigPath);
            (0, chai_1.expect)(await util_1.default.findClosestConfigFile(brsFilePath)).to.equal(parentDirBsConfigPath);
            fsExtra.removeSync(parentDirBsConfigPath);
            (0, chai_1.expect)(await util_1.default.findClosestConfigFile(brsFilePath)).to.equal(parentDirBrsConfigPath);
        });
    });
    describe('normalizeAndResolveConfig', () => {
        it('throws for missing project file', () => {
            (0, chai_1.expect)(() => {
                util_1.default.normalizeAndResolveConfig({ project: 'path/does/not/exist/bsconfig.json' });
            }).to.throw;
        });
        it('does not throw for optional missing', () => {
            (0, chai_1.expect)(() => {
                util_1.default.normalizeAndResolveConfig({ project: '?path/does/not/exist/bsconfig.json' });
            }).not.to.throw;
        });
        it('throws for missing extends file', () => {
            try {
                fsExtra.outputFileSync((0, util_1.standardizePath) `${rootDir}/bsconfig.json`, `{ "extends": "path/does/not/exist/bsconfig.json" }`);
                (0, chai_1.expect)(() => {
                    util_1.default.normalizeAndResolveConfig({
                        project: (0, util_1.standardizePath) `${rootDir}/bsconfig.json`
                    });
                }).to.throw;
            }
            finally {
                process.chdir(cwd);
            }
        });
        it('throws for missing extends file', () => {
            fsExtra.outputFileSync((0, util_1.standardizePath) `${rootDir}/bsconfig.json`, `{ "extends": "?path/does/not/exist/bsconfig.json" }`);
            (0, chai_1.expect)(() => {
                util_1.default.normalizeAndResolveConfig({
                    project: (0, util_1.standardizePath) `${rootDir}/bsconfig.json`
                });
            }).not.to.throw;
        });
    });
    describe('normalizeConfig', () => {
        it('sets emitDefinitions to false by default and in edge cases', () => {
            (0, chai_1.expect)(util_1.default.normalizeConfig({}).emitDefinitions).to.be.false;
            (0, chai_1.expect)(util_1.default.normalizeConfig().emitDefinitions).to.be.false;
            (0, chai_1.expect)(util_1.default.normalizeConfig({ emitDefinitions: 123 }).emitDefinitions).to.be.false;
            (0, chai_1.expect)(util_1.default.normalizeConfig({ emitDefinitions: undefined }).emitDefinitions).to.be.false;
            (0, chai_1.expect)(util_1.default.normalizeConfig({ emitDefinitions: 'true' }).emitDefinitions).to.be.false;
        });
        it('loads project from disc', () => {
            fsExtra.outputFileSync((0, util_1.standardizePath) `${tempDir}/rootDir/bsconfig.json`, `{ "outFile": "customOutDir/pkg.zip" }`);
            let config = util_1.default.normalizeAndResolveConfig({
                project: (0, util_1.standardizePath) `${tempDir}/rootDir/bsconfig.json`
            });
            (0, chai_1.expect)(config.outFile).to.equal((0, util_1.standardizePath) `${tempDir}/rootDir/customOutDir/pkg.zip`);
        });
        it('loads project from disc and extends it', () => {
            //the extends file
            fsExtra.outputFileSync((0, util_1.standardizePath) `${tempDir}/rootDir/bsconfig.base.json`, `{
                "outFile": "customOutDir/pkg1.zip",
                "rootDir": "core"
            }`);
            //the project file
            fsExtra.outputFileSync((0, util_1.standardizePath) `${tempDir}/rootDir/bsconfig.json`, `{
                "extends": "bsconfig.base.json",
                "watch": true
            }`);
            let config = util_1.default.normalizeAndResolveConfig({ project: (0, util_1.standardizePath) `${tempDir}/rootDir/bsconfig.json` });
            (0, chai_1.expect)(config.outFile).to.equal((0, util_1.standardizePath) `${tempDir}/rootDir/customOutDir/pkg1.zip`);
            (0, chai_1.expect)(config.rootDir).to.equal((0, util_1.standardizePath) `${tempDir}/rootDir/core`);
            (0, chai_1.expect)(config.watch).to.equal(true);
        });
        it('overrides parent files array with child files array', () => {
            //the parent file
            fsExtra.outputFileSync((0, util_1.standardizePath) `${tempDir}/rootDir/bsconfig.parent.json`, `{
                "files": ["base.brs"]
            }`);
            //the project file
            fsExtra.outputFileSync((0, util_1.standardizePath) `${tempDir}/rootDir/bsconfig.json`, `{
                "extends": "bsconfig.parent.json",
                "files": ["child.brs"]
            }`);
            let config = util_1.default.normalizeAndResolveConfig({ project: (0, util_1.standardizePath) `${tempDir}/rootDir/bsconfig.json` });
            (0, chai_1.expect)(config.files).to.eql(['child.brs']);
        });
        it('catches circular dependencies', () => {
            fsExtra.outputFileSync((0, util_1.standardizePath) `${rootDir}/bsconfig.json`, `{
                "extends": "bsconfig2.json"
            }`);
            fsExtra.outputFileSync((0, util_1.standardizePath) `${rootDir}/bsconfig2.json`, `{
                "extends": "bsconfig.json"
            }`);
            let threw = false;
            try {
                util_1.default.normalizeAndResolveConfig({ project: (0, util_1.standardizePath) `${rootDir}/bsconfig.json` });
            }
            catch (e) {
                threw = true;
            }
            process.chdir(cwd);
            (0, chai_1.expect)(threw).to.equal(true, 'Should have thrown an error');
            //the test passed
        });
        it('properly handles default for watch', () => {
            let config = util_1.default.normalizeAndResolveConfig({ watch: true });
            (0, chai_1.expect)(config.watch).to.be.true;
        });
    });
    describe('areArraysEqual', () => {
        it('finds equal arrays', () => {
            (0, chai_1.expect)(util_1.default.areArraysEqual([1, 2], [1, 2])).to.be.true;
            (0, chai_1.expect)(util_1.default.areArraysEqual(['cat', 'dog'], ['cat', 'dog'])).to.be.true;
        });
        it('detects non-equal arrays', () => {
            (0, chai_1.expect)(util_1.default.areArraysEqual([1, 2], [1])).to.be.false;
            (0, chai_1.expect)(util_1.default.areArraysEqual([1, 2], [2])).to.be.false;
            (0, chai_1.expect)(util_1.default.areArraysEqual([2], [1])).to.be.false;
            (0, chai_1.expect)(util_1.default.areArraysEqual([2], [0])).to.be.false;
            (0, chai_1.expect)(util_1.default.areArraysEqual(['cat', 'dog'], ['cat', 'dog', 'mouse'])).to.be.false;
            (0, chai_1.expect)(util_1.default.areArraysEqual(['cat', 'dog'], ['dog', 'cat'])).to.be.false;
        });
    });
    describe('stringFormat', () => {
        it('handles out-of-order replacements', () => {
            (0, chai_1.expect)(util_1.default.stringFormat('{1}{0}', 'b', 'a')).to.equal('ab');
        });
        it('does not fail on arguments not provided', () => {
            (0, chai_1.expect)(util_1.default.stringFormat('{0}{1}', 'a')).to.equal('a{1}');
        });
    });
    describe('getPkgPathFromTarget', () => {
        it('works with both types of separators', () => {
            (0, chai_1.expect)(util_1.default.getPkgPathFromTarget('components/component1.xml', '../lib.brs')).to.equal('lib.brs');
            (0, chai_1.expect)(util_1.default.getPkgPathFromTarget('components\\component1.xml', '../lib.brs')).to.equal('lib.brs');
        });
        it('resolves single dot directory', () => {
            (0, chai_1.expect)(util_1.default.getPkgPathFromTarget('components/component1.xml', './lib.brs')).to.equal((0, util_1.standardizePath) `components/lib.brs`);
        });
        it('resolves absolute pkg paths as relative paths', () => {
            (0, chai_1.expect)(util_1.default.getPkgPathFromTarget('components/component1.xml', 'pkg:/source/lib.brs')).to.equal((0, util_1.standardizePath) `source/lib.brs`);
            (0, chai_1.expect)(util_1.default.getPkgPathFromTarget('components/component1.xml', 'pkg:/lib.brs')).to.equal(`lib.brs`);
        });
        it('resolves gracefully for invalid values', () => {
            (0, chai_1.expect)(util_1.default.getPkgPathFromTarget('components/component1.xml', 'pkg:/')).to.equal(null);
            (0, chai_1.expect)(util_1.default.getPkgPathFromTarget('components/component1.xml', 'pkg:')).to.equal(null);
            (0, chai_1.expect)(util_1.default.getPkgPathFromTarget('components/component1.xml', 'pkg')).to.equal((0, util_1.standardizePath) `components/pkg`);
        });
    });
    describe('getRelativePath', () => {
        it('works when both files are at the root', () => {
            (0, chai_1.expect)(util_1.default.getRelativePath('file.xml', 'file.brs')).to.equal('file.brs');
        });
        it('works when both files are in subfolder', () => {
            (0, chai_1.expect)(util_1.default.getRelativePath('sub/file.xml', 'sub/file.brs')).to.equal('file.brs');
        });
        it('works when source in root, target in subdir', () => {
            (0, chai_1.expect)(util_1.default.getRelativePath('file.xml', 'sub/file.brs')).to.equal((0, util_1.standardizePath) `sub/file.brs`);
        });
        it('works when source in sub, target in root', () => {
            (0, chai_1.expect)(util_1.default.getRelativePath('sub/file.xml', 'file.brs')).to.equal((0, util_1.standardizePath) `../file.brs`);
        });
        it('works when source and target are in different subs', () => {
            (0, chai_1.expect)(util_1.default.getRelativePath('sub1/file.xml', 'sub2/file.brs')).to.equal((0, util_1.standardizePath) `../sub2/file.brs`);
        });
    });
    describe('padLeft', () => {
        it('stops at an upper limit to prevent terrible memory explosions', () => {
            (0, chai_1.expect)(util_1.default.padLeft('', Number.MAX_VALUE, ' ')).to.be.lengthOf(1000);
        });
    });
    describe('getTextForRange', () => {
        const testArray = ['The quick', 'brown fox', 'jumps over', 'the lazy dog'];
        const testString = testArray.join('\n');
        it('should work if string is passed in', () => {
            const result = util_1.default.getTextForRange(testString, vscode_languageserver_1.Range.create(0, 0, 1, 5));
            (0, chai_1.expect)(result).to.equal('The quick\nbrown');
        });
        it('should work if array is passed in', () => {
            const result = util_1.default.getTextForRange(testArray, vscode_languageserver_1.Range.create(0, 0, 1, 5));
            (0, chai_1.expect)(result).to.equal('The quick\nbrown');
        });
        it('should work if start and end are on the same line', () => {
            const result = util_1.default.getTextForRange(testArray, vscode_languageserver_1.Range.create(0, 4, 0, 7));
            (0, chai_1.expect)(result).to.equal('qui');
        });
    });
    describe('compareRangeToPosition', () => {
        it('correctly compares positions to ranges with one line range line', () => {
            let range = vscode_languageserver_1.Range.create(1, 10, 1, 15);
            (0, chai_1.expect)(util_1.default.comparePositionToRange(vscode_languageserver_1.Position.create(0, 13), range)).to.equal(-1);
            (0, chai_1.expect)(util_1.default.comparePositionToRange(vscode_languageserver_1.Position.create(1, 1), range)).to.equal(-1);
            (0, chai_1.expect)(util_1.default.comparePositionToRange(vscode_languageserver_1.Position.create(1, 9), range)).to.equal(-1);
            (0, chai_1.expect)(util_1.default.comparePositionToRange(vscode_languageserver_1.Position.create(1, 10), range)).to.equal(0);
            (0, chai_1.expect)(util_1.default.comparePositionToRange(vscode_languageserver_1.Position.create(1, 13), range)).to.equal(0);
            (0, chai_1.expect)(util_1.default.comparePositionToRange(vscode_languageserver_1.Position.create(1, 15), range)).to.equal(0);
            (0, chai_1.expect)(util_1.default.comparePositionToRange(vscode_languageserver_1.Position.create(1, 16), range)).to.equal(1);
            (0, chai_1.expect)(util_1.default.comparePositionToRange(vscode_languageserver_1.Position.create(2, 10), range)).to.equal(1);
        });
        it('correctly compares positions to ranges with multiline range', () => {
            let range = vscode_languageserver_1.Range.create(1, 10, 3, 15);
            (0, chai_1.expect)(util_1.default.comparePositionToRange(vscode_languageserver_1.Position.create(0, 13), range)).to.equal(-1);
            (0, chai_1.expect)(util_1.default.comparePositionToRange(vscode_languageserver_1.Position.create(1, 1), range)).to.equal(-1);
            (0, chai_1.expect)(util_1.default.comparePositionToRange(vscode_languageserver_1.Position.create(1, 9), range)).to.equal(-1);
            (0, chai_1.expect)(util_1.default.comparePositionToRange(vscode_languageserver_1.Position.create(1, 10), range)).to.equal(0);
            (0, chai_1.expect)(util_1.default.comparePositionToRange(vscode_languageserver_1.Position.create(1, 13), range)).to.equal(0);
            (0, chai_1.expect)(util_1.default.comparePositionToRange(vscode_languageserver_1.Position.create(1, 15), range)).to.equal(0);
            (0, chai_1.expect)(util_1.default.comparePositionToRange(vscode_languageserver_1.Position.create(2, 0), range)).to.equal(0);
            (0, chai_1.expect)(util_1.default.comparePositionToRange(vscode_languageserver_1.Position.create(2, 10), range)).to.equal(0);
            (0, chai_1.expect)(util_1.default.comparePositionToRange(vscode_languageserver_1.Position.create(2, 13), range)).to.equal(0);
            (0, chai_1.expect)(util_1.default.comparePositionToRange(vscode_languageserver_1.Position.create(3, 0), range)).to.equal(0);
            (0, chai_1.expect)(util_1.default.comparePositionToRange(vscode_languageserver_1.Position.create(3, 10), range)).to.equal(0);
            (0, chai_1.expect)(util_1.default.comparePositionToRange(vscode_languageserver_1.Position.create(3, 13), range)).to.equal(0);
            (0, chai_1.expect)(util_1.default.comparePositionToRange(vscode_languageserver_1.Position.create(3, 16), range)).to.equal(1);
            (0, chai_1.expect)(util_1.default.comparePositionToRange(vscode_languageserver_1.Position.create(4, 10), range)).to.equal(1);
        });
    });
    describe('getExtension', () => {
        it('handles edge cases', () => {
            (0, chai_1.expect)(util_1.default.getExtension('main.bs')).to.eql('.bs');
            (0, chai_1.expect)(util_1.default.getExtension('main.brs')).to.eql('.brs');
            (0, chai_1.expect)(util_1.default.getExtension('main.spec.bs')).to.eql('.bs');
            (0, chai_1.expect)(util_1.default.getExtension('main.d.bs')).to.eql('.d.bs');
            (0, chai_1.expect)(util_1.default.getExtension('main.xml')).to.eql('.xml');
            (0, chai_1.expect)(util_1.default.getExtension('main.component.xml')).to.eql('.xml');
        });
    });
    describe('loadPlugins', () => {
        let pluginPath;
        let id = 1;
        beforeEach(() => {
            // `require` caches plugins, so  generate a unique plugin name for every test
            pluginPath = `${tempDir}/plugin${id++}.js`;
        });
        it('shows warning when loading plugin with old "object" format', () => {
            fsExtra.writeFileSync(pluginPath, `
                module.exports = {
                    name: 'AwesomePlugin'
                };
            `);
            const stub = sinon.stub(console, 'warn').callThrough();
            const plugins = util_1.default.loadPlugins(cwd, [pluginPath]);
            (0, chai_1.expect)(plugins[0].name).to.eql('AwesomePlugin');
            (0, chai_1.expect)(stub.callCount).to.equal(1);
        });
        it('shows warning when loading plugin with old "object" format and exports.default', () => {
            fsExtra.writeFileSync(pluginPath, `
                module.exports.default = {
                    name: 'AwesomePlugin'
                };
            `);
            const stub = sinon.stub(console, 'warn').callThrough();
            const plugins = util_1.default.loadPlugins(cwd, [pluginPath]);
            (0, chai_1.expect)(plugins[0].name).to.eql('AwesomePlugin');
            (0, chai_1.expect)(stub.callCount).to.equal(1);
        });
        it('loads plugin with factory pattern', () => {
            fsExtra.writeFileSync(pluginPath, `
                module.exports = function() {
                    return {
                        name: 'AwesomePlugin'
                    };
                };
            `);
            const stub = sinon.stub(console, 'warn').callThrough();
            const plugins = util_1.default.loadPlugins(cwd, [pluginPath]);
            (0, chai_1.expect)(plugins[0].name).to.eql('AwesomePlugin');
            //does not warn about factory pattern
            (0, chai_1.expect)(stub.callCount).to.equal(0);
        });
        it('loads plugin with factory pattern and `default`', () => {
            fsExtra.writeFileSync(pluginPath, `
                module.exports.default = function() {
                    return {
                        name: 'AwesomePlugin'
                    };
                };
            `);
            const stub = sinon.stub(console, 'warn').callThrough();
            const plugins = util_1.default.loadPlugins(cwd, [pluginPath]);
            (0, chai_1.expect)(plugins[0].name).to.eql('AwesomePlugin');
            //does not warn about factory pattern
            (0, chai_1.expect)(stub.callCount).to.equal(0);
        });
    });
    describe('copyBslibToStaging', () => {
        it('copies from local bslib dependency', async () => {
            await util_1.default.copyBslibToStaging(tempDir);
            (0, chai_1.expect)(fsExtra.pathExistsSync(`${tempDir}/source/bslib.brs`)).to.be.true;
            (0, chai_1.expect)(/^function bslib_toString\(/mg.exec(fsExtra.readFileSync(`${tempDir}/source/bslib.brs`).toString())).not.to.be.null;
        });
    });
    describe('rangesIntersect', () => {
        it('does not match when ranges touch at right edge', () => {
            // AABB
            (0, chai_1.expect)(util_1.default.rangesIntersect(util_1.default.createRange(0, 0, 0, 1), util_1.default.createRange(0, 1, 0, 2))).to.be.false;
        });
        it('does not match when ranges touch at left edge', () => {
            // BBAA
            (0, chai_1.expect)(util_1.default.rangesIntersect(util_1.default.createRange(0, 1, 0, 2), util_1.default.createRange(0, 0, 0, 1))).to.be.false;
        });
        it('matches when range overlaps by single character on the right', () => {
            // A BA B
            (0, chai_1.expect)(util_1.default.rangesIntersect(util_1.default.createRange(0, 1, 0, 3), util_1.default.createRange(0, 2, 0, 4))).to.be.true;
        });
        it('matches when range overlaps by single character on the left', () => {
            // B AB A
            (0, chai_1.expect)(util_1.default.rangesIntersect(util_1.default.createRange(0, 2, 0, 4), util_1.default.createRange(0, 1, 0, 3))).to.be.true;
        });
        it('matches when A is contained by B at the edges', () => {
            // B AA B
            (0, chai_1.expect)(util_1.default.rangesIntersect(util_1.default.createRange(0, 2, 0, 3), util_1.default.createRange(0, 1, 0, 4))).to.be.true;
        });
        it('matches when B is contained by A at the edges', () => {
            // A BB A
            (0, chai_1.expect)(util_1.default.rangesIntersect(util_1.default.createRange(0, 1, 0, 4), util_1.default.createRange(0, 2, 0, 3))).to.be.true;
        });
        it('matches when A and B are identical', () => {
            // ABBA
            (0, chai_1.expect)(util_1.default.rangesIntersect(util_1.default.createRange(0, 1, 0, 2), util_1.default.createRange(0, 1, 0, 2))).to.be.true;
        });
        it('matches when A spans multiple lines', () => {
            // ABBA
            (0, chai_1.expect)(util_1.default.rangesIntersect(util_1.default.createRange(0, 1, 2, 0), util_1.default.createRange(0, 1, 0, 3))).to.be.true;
        });
        it('matches when B spans multiple lines', () => {
            // ABBA
            (0, chai_1.expect)(util_1.default.rangesIntersect(util_1.default.createRange(0, 1, 0, 3), util_1.default.createRange(0, 1, 2, 0))).to.be.true;
        });
    });
    it('sortByRange', () => {
        const front = {
            range: util_1.default.createRange(1, 1, 1, 2)
        };
        const middle = {
            range: util_1.default.createRange(1, 3, 1, 4)
        };
        const back = {
            range: util_1.default.createRange(1, 5, 1, 6)
        };
        (0, chai_1.expect)(util_1.default.sortByRange([middle, front, back])).to.eql([
            front, middle, back
        ]);
    });
    describe('splitWithLocation', () => {
        it('works with no split items', () => {
            (0, chai_1.expect)(util_1.default.splitGetRange('.', 'hello', util_1.default.createRange(2, 10, 2, 15))).to.eql([{
                    text: 'hello',
                    range: util_1.default.createRange(2, 10, 2, 15)
                }]);
        });
        it('handles empty chunks', () => {
            (0, chai_1.expect)(util_1.default.splitGetRange('l', 'hello', util_1.default.createRange(2, 10, 2, 15))).to.eql([{
                    text: 'he',
                    range: util_1.default.createRange(2, 10, 2, 12)
                }, {
                    text: 'o',
                    range: util_1.default.createRange(2, 14, 2, 15)
                }]);
        });
        it('handles multiple non-empty chunks', () => {
            (0, chai_1.expect)(util_1.default.splitGetRange('.', 'abc.d.efgh.i', util_1.default.createRange(2, 10, 2, 2))).to.eql([{
                    text: 'abc',
                    range: util_1.default.createRange(2, 10, 2, 13)
                }, {
                    text: 'd',
                    range: util_1.default.createRange(2, 14, 2, 15)
                }, {
                    text: 'efgh',
                    range: util_1.default.createRange(2, 16, 2, 20)
                }, {
                    text: 'i',
                    range: util_1.default.createRange(2, 21, 2, 22)
                }]);
        });
    });
});
//# sourceMappingURL=util.spec.js.map
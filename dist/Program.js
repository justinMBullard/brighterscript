"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Program = void 0;
const assert = require("assert");
const fsExtra = require("fs-extra");
const path = require("path");
const vscode_languageserver_1 = require("vscode-languageserver");
const Scope_1 = require("./Scope");
const DiagnosticMessages_1 = require("./DiagnosticMessages");
const BrsFile_1 = require("./files/BrsFile");
const XmlFile_1 = require("./files/XmlFile");
const util_1 = require("./util");
const XmlScope_1 = require("./XmlScope");
const DiagnosticFilterer_1 = require("./DiagnosticFilterer");
const DependencyGraph_1 = require("./DependencyGraph");
const Logger_1 = require("./Logger");
const chalk_1 = require("chalk");
const globalCallables_1 = require("./globalCallables");
const Manifest_1 = require("./preprocessor/Manifest");
const vscode_uri_1 = require("vscode-uri");
const PluginInterface_1 = require("./PluginInterface");
const reflection_1 = require("./astUtils/reflection");
const Parser_1 = require("./parser/Parser");
const TokenKind_1 = require("./lexer/TokenKind");
const BscPlugin_1 = require("./bscPlugin/BscPlugin");
const AstEditor_1 = require("./astUtils/AstEditor");
const startOfSourcePkgPath = `source${path.sep}`;
const bslibNonAliasedRokuModulesPkgPath = (0, util_1.standardizePath) `source/roku_modules/rokucommunity_bslib/bslib.brs`;
const bslibAliasedRokuModulesPkgPath = (0, util_1.standardizePath) `source/roku_modules/bslib/bslib.brs`;
class Program {
    constructor(
    /**
     * The root directory for this program
     */
    options, logger, plugins) {
        this.options = options;
        /**
         * A graph of all files and their dependencies.
         * For example:
         *      File.xml -> [lib1.brs, lib2.brs]
         *      lib2.brs -> [lib3.brs] //via an import statement
         */
        this.dependencyGraph = new DependencyGraph_1.DependencyGraph();
        this.diagnosticFilterer = new DiagnosticFilterer_1.DiagnosticFilterer();
        /**
         * A set of diagnostics. This does not include any of the scope diagnostics.
         * Should only be set from `this.validate()`
         */
        this.diagnostics = [];
        /**
         * A map of every file loaded into this program, indexed by its original file location
         */
        this.files = {};
        this.pkgMap = {};
        this.scopes = {};
        /**
         * A map of every component currently loaded into the program, indexed by the component name.
         * It is a compile-time error to have multiple components with the same name. However, we store an array of components
         * by name so we can provide a better developer expreience. You shouldn't be directly accessing this array,
         * but if you do, only ever use the component at index 0.
         */
        this.components = {};
        this.options = util_1.util.normalizeConfig(options);
        this.logger = logger || new Logger_1.Logger(options.logLevel);
        this.plugins = plugins || new PluginInterface_1.default([], this.logger);
        //inject the bsc plugin as the first plugin in the stack.
        this.plugins.addFirst(new BscPlugin_1.BscPlugin());
        //normalize the root dir path
        this.options.rootDir = util_1.util.getRootDir(this.options);
        this.createGlobalScope();
    }
    createGlobalScope() {
        //create the 'global' scope
        this.globalScope = new Scope_1.Scope('global', this, 'scope:global');
        this.globalScope.attachDependencyGraph(this.dependencyGraph);
        this.scopes.global = this.globalScope;
        //hardcode the files list for global scope to only contain the global file
        this.globalScope.getAllFiles = () => [globalCallables_1.globalFile];
        this.globalScope.validate();
        //for now, disable validation of global scope because the global files have some duplicate method declarations
        this.globalScope.getDiagnostics = () => [];
        //TODO we might need to fix this because the isValidated clears stuff now
        this.globalScope.isValidated = true;
    }
    /**
     * The path to bslib.brs (the BrightScript runtime for certain BrighterScript features)
     */
    get bslibPkgPath() {
        //if there's an aliased (preferred) version of bslib from roku_modules loaded into the program, use that
        if (this.getFile(bslibAliasedRokuModulesPkgPath)) {
            return bslibAliasedRokuModulesPkgPath;
            //if there's a non-aliased version of bslib from roku_modules, use that
        }
        else if (this.getFile(bslibNonAliasedRokuModulesPkgPath)) {
            return bslibNonAliasedRokuModulesPkgPath;
            //default to the embedded version
        }
        else {
            return `source${path.sep}bslib.brs`;
        }
    }
    get bslibPrefix() {
        if (this.bslibPkgPath === bslibNonAliasedRokuModulesPkgPath) {
            return 'rokucommunity_bslib';
        }
        else {
            return 'bslib';
        }
    }
    addScope(scope) {
        this.scopes[scope.name] = scope;
        this.plugins.emit('afterScopeCreate', scope);
    }
    /**
     * Get the component with the specified name
     */
    getComponent(componentName) {
        var _a;
        if (componentName) {
            //return the first compoment in the list with this name
            //(components are ordered in this list by pkgPath to ensure consistency)
            return (_a = this.components[componentName.toLowerCase()]) === null || _a === void 0 ? void 0 : _a[0];
        }
        else {
            return undefined;
        }
    }
    /**
     * Register (or replace) the reference to a component in the component map
     */
    registerComponent(xmlFile, scope) {
        var _a, _b;
        const key = ((_b = (_a = xmlFile.componentName) === null || _a === void 0 ? void 0 : _a.text) !== null && _b !== void 0 ? _b : xmlFile.pkgPath).toLowerCase();
        if (!this.components[key]) {
            this.components[key] = [];
        }
        this.components[key].push({
            file: xmlFile,
            scope: scope
        });
        this.components[key].sort((x, y) => x.file.pkgPath.toLowerCase().localeCompare(y.file.pkgPath.toLowerCase()));
        this.syncComponentDependencyGraph(this.components[key]);
    }
    /**
     * Remove the specified component from the components map
     */
    unregisterComponent(xmlFile) {
        var _a, _b;
        const key = ((_b = (_a = xmlFile.componentName) === null || _a === void 0 ? void 0 : _a.text) !== null && _b !== void 0 ? _b : xmlFile.pkgPath).toLowerCase();
        const arr = this.components[key] || [];
        for (let i = 0; i < arr.length; i++) {
            if (arr[i].file === xmlFile) {
                arr.splice(i, 1);
                break;
            }
        }
        this.syncComponentDependencyGraph(arr);
    }
    /**
     * re-attach the dependency graph with a new key for any component who changed
     * their position in their own named array (only matters when there are multiple
     * components with the same name)
     */
    syncComponentDependencyGraph(components) {
        //reattach every dependency graph
        for (let i = 0; i < components.length; i++) {
            const { file, scope } = components[i];
            //attach (or re-attach) the dependencyGraph for every component whose position changed
            if (file.dependencyGraphIndex !== i) {
                file.dependencyGraphIndex = i;
                file.attachDependencyGraph(this.dependencyGraph);
                scope.attachDependencyGraph(this.dependencyGraph);
            }
        }
    }
    /**
     * Get a list of all files that are included in the project but are not referenced
     * by any scope in the program.
     */
    getUnreferencedFiles() {
        let result = [];
        for (let filePath in this.files) {
            let file = this.files[filePath];
            if (!this.fileIsIncludedInAnyScope(file)) {
                //no scopes reference this file. add it to the list
                result.push(file);
            }
        }
        return result;
    }
    /**
     * Get the list of errors for the entire program. It's calculated on the fly
     * by walking through every file, so call this sparingly.
     */
    getDiagnostics() {
        return this.logger.time(Logger_1.LogLevel.info, ['Program.getDiagnostics()'], () => {
            let diagnostics = [...this.diagnostics];
            //get the diagnostics from all scopes
            for (let scopeName in this.scopes) {
                let scope = this.scopes[scopeName];
                diagnostics.push(...scope.getDiagnostics());
            }
            //get the diagnostics from all unreferenced files
            let unreferencedFiles = this.getUnreferencedFiles();
            for (let file of unreferencedFiles) {
                diagnostics.push(...file.getDiagnostics());
            }
            const filteredDiagnostics = this.logger.time(Logger_1.LogLevel.debug, ['filter diagnostics'], () => {
                //filter out diagnostics based on our diagnostic filters
                let finalDiagnostics = this.diagnosticFilterer.filter(Object.assign(Object.assign({}, this.options), { rootDir: this.options.rootDir }), diagnostics);
                return finalDiagnostics;
            });
            this.logger.info(`diagnostic counts: total=${chalk_1.default.yellow(diagnostics.length.toString())}, after filter=${chalk_1.default.yellow(filteredDiagnostics.length.toString())}`);
            return filteredDiagnostics;
        });
    }
    addDiagnostics(diagnostics) {
        this.diagnostics.push(...diagnostics);
    }
    /**
     * Determine if the specified file is loaded in this program right now.
     * @param filePath
     * @param normalizePath should the provided path be normalized before use
     */
    hasFile(filePath, normalizePath = true) {
        return !!this.getFile(filePath, normalizePath);
    }
    getPkgPath(...args) {
        throw new Error('Not implemented');
    }
    /**
     * roku filesystem is case INsensitive, so find the scope by key case insensitive
     * @param scopeName
     */
    getScopeByName(scopeName) {
        if (!scopeName) {
            return undefined;
        }
        //most scopes are xml file pkg paths. however, the ones that are not are single names like "global" and "scope",
        //so it's safe to run the standardizePkgPath method
        scopeName = (0, util_1.standardizePath) `${scopeName}`;
        let key = Object.keys(this.scopes).find(x => x.toLowerCase() === scopeName.toLowerCase());
        return this.scopes[key];
    }
    /**
     * Return all scopes
     */
    getScopes() {
        return Object.values(this.scopes);
    }
    /**
     * Find the scope for the specified component
     */
    getComponentScope(componentName) {
        var _a;
        return (_a = this.getComponent(componentName)) === null || _a === void 0 ? void 0 : _a.scope;
    }
    /**
     * Update internal maps with this file reference
     */
    assignFile(file) {
        this.files[file.pathAbsolute.toLowerCase()] = file;
        this.pkgMap[file.pkgPath.toLowerCase()] = file;
        return file;
    }
    /**
     * Remove this file from internal maps
     */
    unassignFile(file) {
        delete this.files[file.pathAbsolute.toLowerCase()];
        delete this.pkgMap[file.pkgPath.toLowerCase()];
        return file;
    }
    addOrReplaceFile(fileParam, fileContents) {
        return this.setFile(fileParam, fileContents);
    }
    setFile(fileParam, fileContents) {
        assert.ok(fileParam, 'fileParam is required');
        let srcPath;
        let pkgPath;
        if (typeof fileParam === 'string') {
            srcPath = (0, util_1.standardizePath) `${this.options.rootDir}/${fileParam}`;
            pkgPath = (0, util_1.standardizePath) `${fileParam}`;
        }
        else {
            srcPath = (0, util_1.standardizePath) `${fileParam.src}`;
            pkgPath = (0, util_1.standardizePath) `${fileParam.dest}`;
        }
        let file = this.logger.time(Logger_1.LogLevel.debug, ['Program.setFile()', chalk_1.default.green(srcPath)], () => {
            assert.ok(srcPath, 'fileEntry.src is required');
            assert.ok(pkgPath, 'fileEntry.dest is required');
            //if the file is already loaded, remove it
            if (this.hasFile(srcPath)) {
                this.removeFile(srcPath);
            }
            let fileExtension = path.extname(srcPath).toLowerCase();
            let file;
            if (fileExtension === '.brs' || fileExtension === '.bs') {
                //add the file to the program
                const brsFile = this.assignFile(new BrsFile_1.BrsFile(srcPath, pkgPath, this));
                //add file to the `source` dependency list
                if (brsFile.pkgPath.startsWith(startOfSourcePkgPath)) {
                    this.createSourceScope();
                    this.dependencyGraph.addDependency('scope:source', brsFile.dependencyGraphKey);
                }
                let sourceObj = {
                    pathAbsolute: srcPath,
                    source: fileContents
                };
                this.plugins.emit('beforeFileParse', sourceObj);
                this.logger.time(Logger_1.LogLevel.debug, ['parse', chalk_1.default.green(srcPath)], () => {
                    brsFile.parse(sourceObj.source);
                });
                //notify plugins that this file has finished parsing
                this.plugins.emit('afterFileParse', brsFile);
                file = brsFile;
                brsFile.attachDependencyGraph(this.dependencyGraph);
            }
            else if (
            //is xml file
            fileExtension === '.xml' &&
                //resides in the components folder (Roku will only parse xml files in the components folder)
                pkgPath.toLowerCase().startsWith(util_1.util.pathSepNormalize(`components/`))) {
                //add the file to the program
                const xmlFile = this.assignFile(new XmlFile_1.XmlFile(srcPath, pkgPath, this));
                let sourceObj = {
                    pathAbsolute: srcPath,
                    source: fileContents
                };
                this.plugins.emit('beforeFileParse', sourceObj);
                this.logger.time(Logger_1.LogLevel.debug, ['parse', chalk_1.default.green(srcPath)], () => {
                    xmlFile.parse(sourceObj.source);
                });
                //notify plugins that this file has finished parsing
                this.plugins.emit('afterFileParse', xmlFile);
                file = xmlFile;
                //create a new scope for this xml file
                let scope = new XmlScope_1.XmlScope(xmlFile, this);
                this.addScope(scope);
                //register this compoent now that we have parsed it and know its component name
                this.registerComponent(xmlFile, scope);
            }
            else {
                //TODO do we actually need to implement this? Figure out how to handle img paths
                // let genericFile = this.files[pathAbsolute] = <any>{
                //     pathAbsolute: pathAbsolute,
                //     pkgPath: pkgPath,
                //     wasProcessed: true
                // } as File;
                // file = <any>genericFile;
            }
            return file;
        });
        return file;
    }
    /**
     * Ensure source scope is created.
     * Note: automatically called internally, and no-op if it exists already.
     */
    createSourceScope() {
        if (!this.scopes.source) {
            const sourceScope = new Scope_1.Scope('source', this, 'scope:source');
            sourceScope.attachDependencyGraph(this.dependencyGraph);
            this.addScope(sourceScope);
        }
    }
    /**
     * Find the file by its absolute path. This is case INSENSITIVE, since
     * Roku is a case insensitive file system. It is an error to have multiple files
     * with the same path with only case being different.
     * @param pathAbsolute
     * @deprecated use `getFile` instead, which auto-detects the path type
     */
    getFileByPathAbsolute(pathAbsolute) {
        pathAbsolute = (0, util_1.standardizePath) `${pathAbsolute}`;
        for (let filePath in this.files) {
            if (filePath.toLowerCase() === pathAbsolute.toLowerCase()) {
                return this.files[filePath];
            }
        }
    }
    /**
     * Get a list of files for the given (platform-normalized) pkgPath array.
     * Missing files are just ignored.
     * @deprecated use `getFiles` instead, which auto-detects the path types
     */
    getFilesByPkgPaths(pkgPaths) {
        return pkgPaths
            .map(pkgPath => this.getFileByPkgPath(pkgPath))
            .filter(file => file !== undefined);
    }
    /**
     * Get a file with the specified (platform-normalized) pkg path.
     * If not found, return undefined
     * @deprecated use `getFile` instead, which auto-detects the path type
     */
    getFileByPkgPath(pkgPath) {
        return this.pkgMap[pkgPath.toLowerCase()];
    }
    /**
     * Remove a set of files from the program
     * @param filePaths can be an array of srcPath or destPath strings
     * @param normalizePath should this function repair and standardize the filePaths? Passing false should have a performance boost if you can guarantee your paths are already sanitized
     */
    removeFiles(srcPaths, normalizePath = true) {
        for (let srcPath of srcPaths) {
            this.removeFile(srcPath, normalizePath);
        }
    }
    /**
     * Remove a file from the program
     * @param filePath can be a srcPath, a pkgPath, or a destPath (same as pkgPath but without `pkg:/`)
     * @param normalizePath should this function repair and standardize the path? Passing false should have a performance boost if you can guarantee your path is already sanitized
     */
    removeFile(filePath, normalizePath = true) {
        this.logger.debug('Program.removeFile()', filePath);
        let file = this.getFile(filePath, normalizePath);
        if (file) {
            this.plugins.emit('beforeFileDispose', file);
            //if there is a scope named the same as this file's path, remove it (i.e. xml scopes)
            let scope = this.scopes[file.pkgPath];
            if (scope) {
                this.plugins.emit('beforeScopeDispose', scope);
                scope.dispose();
                //notify dependencies of this scope that it has been removed
                this.dependencyGraph.remove(scope.dependencyGraphKey);
                delete this.scopes[file.pkgPath];
                this.plugins.emit('afterScopeDispose', scope);
            }
            //remove the file from the program
            this.unassignFile(file);
            this.dependencyGraph.remove(file.dependencyGraphKey);
            //if this is a pkg:/source file, notify the `source` scope that it has changed
            if (file.pkgPath.startsWith(startOfSourcePkgPath)) {
                this.dependencyGraph.removeDependency('scope:source', file.dependencyGraphKey);
            }
            //if this is a component, remove it from our components map
            if ((0, reflection_1.isXmlFile)(file)) {
                this.unregisterComponent(file);
            }
            //dispose file
            file === null || file === void 0 ? void 0 : file.dispose();
            this.plugins.emit('afterFileDispose', file);
        }
    }
    /**
     * Traverse the entire project, and validate all scopes
     * @param force - if true, then all scopes are force to validate, even if they aren't marked as dirty
     */
    validate() {
        this.logger.time(Logger_1.LogLevel.log, ['Validating project'], () => {
            var _a;
            this.diagnostics = [];
            this.plugins.emit('beforeProgramValidate', this);
            //validate every file
            for (const file of Object.values(this.files)) {
                //find any files NOT loaded into a scope
                if (!this.fileIsIncludedInAnyScope(file)) {
                    this.logger.debug('Program.validate(): fileNotReferenced by any scope', () => chalk_1.default.green(file === null || file === void 0 ? void 0 : file.pkgPath));
                    //the file is not loaded in any scope
                    this.diagnostics.push(Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.fileNotReferencedByAnyOtherFile()), { file: file, range: util_1.util.createRange(0, 0, 0, Number.MAX_VALUE) }));
                }
                //for every unvalidated file, validate it
                if (!file.isValidated) {
                    this.plugins.emit('beforeFileValidate', {
                        program: this,
                        file: file
                    });
                    //emit an event to allow plugins to contribute to the file validation process
                    this.plugins.emit('onFileValidate', {
                        program: this,
                        file: file
                    });
                    //call file.validate() IF the file has that function defined
                    (_a = file.validate) === null || _a === void 0 ? void 0 : _a.call(file);
                    file.isValidated = true;
                    this.plugins.emit('afterFileValidate', file);
                }
            }
            this.logger.time(Logger_1.LogLevel.info, ['Validate all scopes'], () => {
                for (let scopeName in this.scopes) {
                    let scope = this.scopes[scopeName];
                    scope.validate();
                }
            });
            this.detectDuplicateComponentNames();
            this.plugins.emit('afterProgramValidate', this);
        });
    }
    /**
     * Flag all duplicate component names
     */
    detectDuplicateComponentNames() {
        const componentsByName = Object.keys(this.files).reduce((map, filePath) => {
            var _a;
            const file = this.files[filePath];
            //if this is an XmlFile, and it has a valid `componentName` property
            if ((0, reflection_1.isXmlFile)(file) && ((_a = file.componentName) === null || _a === void 0 ? void 0 : _a.text)) {
                let lowerName = file.componentName.text.toLowerCase();
                if (!map[lowerName]) {
                    map[lowerName] = [];
                }
                map[lowerName].push(file);
            }
            return map;
        }, {});
        for (let name in componentsByName) {
            const xmlFiles = componentsByName[name];
            //add diagnostics for every duplicate component with this name
            if (xmlFiles.length > 1) {
                for (let xmlFile of xmlFiles) {
                    const { componentName } = xmlFile;
                    this.diagnostics.push(Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.duplicateComponentName(componentName.text)), { range: xmlFile.componentName.range, file: xmlFile, relatedInformation: xmlFiles.filter(x => x !== xmlFile).map(x => {
                            return {
                                location: vscode_languageserver_1.Location.create(vscode_uri_1.URI.file(xmlFile.pathAbsolute).toString(), x.componentName.range),
                                message: 'Also defined here'
                            };
                        }) }));
                }
            }
        }
    }
    /**
     * Determine if the given file is included in at least one scope in this program
     */
    fileIsIncludedInAnyScope(file) {
        for (let scopeName in this.scopes) {
            if (this.scopes[scopeName].hasFile(file)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Get the files for a list of filePaths
     * @param filePaths can be an array of srcPath or a destPath strings
     * @param normalizePath should this function repair and standardize the paths? Passing false should have a performance boost if you can guarantee your paths are already sanitized
     */
    getFiles(filePaths, normalizePath = true) {
        return filePaths
            .map(filePath => this.getFile(filePath, normalizePath))
            .filter(file => file !== undefined);
    }
    /**
     * Get the file at the given path
     * @param filePath can be a srcPath or a destPath
     * @param normalizePath should this function repair and standardize the path? Passing false should have a performance boost if you can guarantee your path is already sanitized
     */
    getFile(filePath, normalizePath = true) {
        if (typeof filePath !== 'string') {
            return undefined;
        }
        else if (path.isAbsolute(filePath)) {
            return this.files[(normalizePath ? util_1.util.standardizePath(filePath) : filePath).toLowerCase()];
        }
        else {
            return this.pkgMap[(normalizePath ? util_1.util.standardizePath(filePath) : filePath).toLowerCase()];
        }
    }
    /**
     * Get a list of all scopes the file is loaded into
     * @param file
     */
    getScopesForFile(file) {
        let result = [];
        for (let key in this.scopes) {
            let scope = this.scopes[key];
            if (scope.hasFile(file)) {
                result.push(scope);
            }
        }
        return result;
    }
    /**
     * Get the first found scope for a file.
     */
    getFirstScopeForFile(file) {
        for (let key in this.scopes) {
            let scope = this.scopes[key];
            if (scope.hasFile(file)) {
                return scope;
            }
        }
    }
    getStatementsByName(name, originFile, namespaceName) {
        var _a, _b;
        let results = new Map();
        const filesSearched = new Set();
        let lowerNamespaceName = namespaceName === null || namespaceName === void 0 ? void 0 : namespaceName.toLowerCase();
        let lowerName = name === null || name === void 0 ? void 0 : name.toLowerCase();
        //look through all files in scope for matches
        for (const scope of this.getScopesForFile(originFile)) {
            for (const file of scope.getAllFiles()) {
                if ((0, reflection_1.isXmlFile)(file) || filesSearched.has(file)) {
                    continue;
                }
                filesSearched.add(file);
                for (const statement of [...file.parser.references.functionStatements, ...file.parser.references.classStatements.flatMap((cs) => cs.methods)]) {
                    let parentNamespaceName = (_b = (_a = statement.namespaceName) === null || _a === void 0 ? void 0 : _a.getName(originFile.parseMode)) === null || _b === void 0 ? void 0 : _b.toLowerCase();
                    if (statement.name.text.toLowerCase() === lowerName && (!parentNamespaceName || parentNamespaceName === lowerNamespaceName)) {
                        if (!results.has(statement)) {
                            results.set(statement, { item: statement, file: file });
                        }
                    }
                }
            }
        }
        return [...results.values()];
    }
    getStatementsForXmlFile(scope, filterName) {
        var _a, _b;
        let results = new Map();
        const filesSearched = new Set();
        //get all function names for the xml file and parents
        let funcNames = new Set();
        let currentScope = scope;
        while ((0, reflection_1.isXmlScope)(currentScope)) {
            for (let name of (_b = (_a = currentScope.xmlFile.ast.component.api) === null || _a === void 0 ? void 0 : _a.functions.map((f) => f.name)) !== null && _b !== void 0 ? _b : []) {
                if (!filterName || name === filterName) {
                    funcNames.add(name);
                }
            }
            currentScope = currentScope.getParentScope();
        }
        //look through all files in scope for matches
        for (const file of scope.getOwnFiles()) {
            if ((0, reflection_1.isXmlFile)(file) || filesSearched.has(file)) {
                continue;
            }
            filesSearched.add(file);
            for (const statement of file.parser.references.functionStatements) {
                if (funcNames.has(statement.name.text)) {
                    if (!results.has(statement)) {
                        results.set(statement, { item: statement, file: file });
                    }
                }
            }
        }
        return [...results.values()];
    }
    /**
     * Find all available completion items at the given position
     * @param filePath can be a srcPath or a destPath
     * @param position the position (line & column) where completions should be found
     */
    getCompletions(filePath, position) {
        let file = this.getFile(filePath);
        if (!file) {
            return [];
        }
        let result = [];
        if ((0, reflection_1.isBrsFile)(file) && file.isPositionNextToTokenKind(position, TokenKind_1.TokenKind.Callfunc)) {
            // is next to a @. callfunc invocation - must be an interface method
            for (const scope of this.getScopes().filter((s) => (0, reflection_1.isXmlScope)(s))) {
                let fileLinks = this.getStatementsForXmlFile(scope);
                for (let fileLink of fileLinks) {
                    result.push(scope.createCompletionFromFunctionStatement(fileLink.item));
                }
            }
            //no other result is possible in this case
            return result;
        }
        //find the scopes for this file
        let scopes = this.getScopesForFile(file);
        //if there are no scopes, include the global scope so we at least get the built-in functions
        scopes = scopes.length > 0 ? scopes : [this.globalScope];
        //get the completions from all scopes for this file
        let allCompletions = util_1.util.flatMap(scopes.map(ctx => file.getCompletions(position, ctx)), c => c);
        //only keep completions common to every scope for this file
        let keyCounts = {};
        for (let completion of allCompletions) {
            let key = `${completion.label}-${completion.kind}`;
            keyCounts[key] = keyCounts[key] ? keyCounts[key] + 1 : 1;
            if (keyCounts[key] === scopes.length) {
                result.push(completion);
            }
        }
        return result;
    }
    /**
     * Goes through each file and builds a list of workspace symbols for the program. Used by LanguageServer's onWorkspaceSymbol functionality
     */
    getWorkspaceSymbols() {
        const results = Object.keys(this.files).map(key => {
            const file = this.files[key];
            if ((0, reflection_1.isBrsFile)(file)) {
                return file.getWorkspaceSymbols();
            }
            return [];
        });
        return util_1.util.flatMap(results, c => c);
    }
    /**
     * Given a position in a file, if the position is sitting on some type of identifier,
     * go to the definition of that identifier (where this thing was first defined)
     */
    getDefinition(pathAbsolute, position) {
        let file = this.getFile(pathAbsolute);
        if (!file) {
            return [];
        }
        if ((0, reflection_1.isBrsFile)(file)) {
            return file.getDefinition(position);
        }
        else {
            let results = [];
            const scopes = this.getScopesForFile(file);
            for (const scope of scopes) {
                results = results.concat(...scope.getDefinition(file, position));
            }
            return results;
        }
    }
    getHover(pathAbsolute, position) {
        //find the file
        let file = this.getFile(pathAbsolute);
        if (!file) {
            return null;
        }
        const hover = file.getHover(position);
        return Promise.resolve(hover);
    }
    /**
     * Compute code actions for the given file and range
     */
    getCodeActions(pathAbsolute, range) {
        const codeActions = [];
        const file = this.getFile(pathAbsolute);
        if (file) {
            const diagnostics = this
                //get all current diagnostics (filtered by diagnostic filters)
                .getDiagnostics()
                //only keep diagnostics related to this file
                .filter(x => x.file === file)
                //only keep diagnostics that touch this range
                .filter(x => util_1.util.rangesIntersect(x.range, range));
            const scopes = this.getScopesForFile(file);
            this.plugins.emit('onGetCodeActions', {
                program: this,
                file: file,
                range: range,
                diagnostics: diagnostics,
                scopes: scopes,
                codeActions: codeActions
            });
        }
        return codeActions;
    }
    /**
     * Get semantic tokens for the specified file
     */
    getSemanticTokens(srcPath) {
        const file = this.getFile(srcPath);
        if (file) {
            const result = [];
            this.plugins.emit('onGetSemanticTokens', {
                program: this,
                file: file,
                scopes: this.getScopesForFile(file),
                semanticTokens: result
            });
            return result;
        }
    }
    getSignatureHelp(filepath, position) {
        var _a;
        let file = this.getFile(filepath);
        if (!file || !(0, reflection_1.isBrsFile)(file)) {
            return [];
        }
        const results = new Map();
        let functionScope = file.getFunctionScopeAtPosition(position);
        let identifierInfo = this.getPartialStatementInfo(file, position);
        if (identifierInfo.statementType === '') {
            // just general function calls
            let statements = file.program.getStatementsByName(identifierInfo.name, file);
            for (let statement of statements) {
                //TODO better handling of collisions - if it's a namespace, then don't show any other overrides
                //if we're on m - then limit scope to the current class, if present
                let sigHelp = statement.file.getSignatureHelpForStatement(statement.item);
                if (sigHelp && !results.has[sigHelp.key]) {
                    sigHelp.index = identifierInfo.commaCount;
                    results.set(sigHelp.key, sigHelp);
                }
            }
        }
        else if (identifierInfo.statementType === '.') {
            //if m class reference.. then
            //only get statements from the class I am in..
            if (functionScope) {
                let myClass = file.getClassFromMReference(position, file.getTokenAt(position), functionScope);
                if (myClass) {
                    for (let scope of this.getScopesForFile(myClass.file)) {
                        let classes = scope.getClassHierarchy(myClass.item.getName(Parser_1.ParseMode.BrighterScript).toLowerCase());
                        //and anything from any class in scope to a non m class
                        for (let statement of [...classes].filter((i) => (0, reflection_1.isClassMethodStatement)(i.item))) {
                            let sigHelp = statement.file.getSignatureHelpForStatement(statement.item);
                            if (sigHelp && !results.has[sigHelp.key]) {
                                results.set(sigHelp.key, sigHelp);
                                return;
                            }
                        }
                    }
                }
            }
            if (identifierInfo.dotPart) {
                //potential namespaces
                let statements = file.program.getStatementsByName(identifierInfo.name, file, identifierInfo.dotPart);
                if (statements.length === 0) {
                    //was not a namespaced function, it could be any method on any class now
                    statements = file.program.getStatementsByName(identifierInfo.name, file);
                }
                for (let statement of statements) {
                    //TODO better handling of collisions - if it's a namespace, then don't show any other overrides
                    //if we're on m - then limit scope to the current class, if present
                    let sigHelp = statement.file.getSignatureHelpForStatement(statement.item);
                    if (sigHelp && !results.has[sigHelp.key]) {
                        sigHelp.index = identifierInfo.commaCount;
                        results.set(sigHelp.key, sigHelp);
                    }
                }
            }
        }
        else if (identifierInfo.statementType === '@.') {
            for (const scope of this.getScopes().filter((s) => (0, reflection_1.isXmlScope)(s))) {
                let fileLinks = this.getStatementsForXmlFile(scope, identifierInfo.name);
                for (let fileLink of fileLinks) {
                    let sigHelp = fileLink.file.getSignatureHelpForStatement(fileLink.item);
                    if (sigHelp && !results.has[sigHelp.key]) {
                        sigHelp.index = identifierInfo.commaCount;
                        results.set(sigHelp.key, sigHelp);
                    }
                }
            }
        }
        else if (identifierInfo.statementType === 'new') {
            let classItem = file.getClassFileLink(identifierInfo.dotPart ? `${identifierInfo.dotPart}.${identifierInfo.name}` : identifierInfo.name);
            let sigHelp = (_a = classItem === null || classItem === void 0 ? void 0 : classItem.file) === null || _a === void 0 ? void 0 : _a.getClassSignatureHelp(classItem === null || classItem === void 0 ? void 0 : classItem.item);
            if (sigHelp && !results.has(sigHelp.key)) {
                sigHelp.index = identifierInfo.commaCount;
                results.set(sigHelp.key, sigHelp);
            }
        }
        return [...results.values()];
    }
    getPartialStatementInfo(file, position) {
        let lines = util_1.util.splitIntoLines(file.fileContents);
        let line = lines[position.line];
        let index = position.character;
        let itemCounts = this.getPartialItemCounts(line, index);
        if (!itemCounts.isArgStartFound && line.charAt(index) === ')') {
            //try previous char, in case we were on a close bracket..
            index--;
            itemCounts = this.getPartialItemCounts(line, index);
        }
        let argStartIndex = itemCounts.argStartIndex;
        index = itemCounts.argStartIndex - 1;
        let statementType = '';
        let name;
        let dotPart;
        if (!itemCounts.isArgStartFound) {
            //try to get sig help based on the name
            index = position.character;
            let currentToken = file.getTokenAt(position);
            if (currentToken && currentToken.kind !== TokenKind_1.TokenKind.Comment) {
                name = file.getPartialVariableName(currentToken, [TokenKind_1.TokenKind.New]);
                if (!name) {
                    //try the previous token, incase we're on a bracket
                    currentToken = file.getPreviousToken(currentToken);
                    name = file.getPartialVariableName(currentToken, [TokenKind_1.TokenKind.New]);
                }
                if (name === null || name === void 0 ? void 0 : name.indexOf('.')) {
                    let parts = name.split('.');
                    name = parts[parts.length - 1];
                }
                index = currentToken.range.start.character;
                argStartIndex = index;
            }
            else {
                // invalid location
                index = 0;
                itemCounts.comma = 0;
            }
        }
        //this loop is quirky. walk to -1 (which will result in the last char being '' thus satisfying the situation where there is no leading whitespace).
        while (index >= -1) {
            if (!(/[a-z0-9_\.\@]/i).test(line.charAt(index))) {
                if (!name) {
                    name = line.substring(index + 1, argStartIndex);
                }
                else {
                    dotPart = line.substring(index + 1, argStartIndex);
                    if (dotPart.endsWith('.')) {
                        dotPart = dotPart.substr(0, dotPart.length - 1);
                    }
                }
                break;
            }
            if (line.substr(index - 2, 2) === '@.') {
                statementType = '@.';
                name = name || line.substring(index, argStartIndex);
                break;
            }
            else if (line.charAt(index - 1) === '.' && statementType === '') {
                statementType = '.';
                name = name || line.substring(index, argStartIndex);
                argStartIndex = index;
            }
            index--;
        }
        if (line.substring(0, index).trim().endsWith('new')) {
            statementType = 'new';
        }
        return {
            commaCount: itemCounts.comma,
            statementType: statementType,
            name: name,
            dotPart: dotPart
        };
    }
    getPartialItemCounts(line, index) {
        let isArgStartFound = false;
        let itemCounts = {
            normal: 0,
            square: 0,
            curly: 0,
            comma: 0,
            endIndex: 0,
            argStartIndex: index,
            isArgStartFound: false
        };
        while (index >= 0) {
            const currentChar = line.charAt(index);
            if (currentChar === '\'') { //found comment, invalid index
                itemCounts.isArgStartFound = false;
                break;
            }
            if (isArgStartFound) {
                if (currentChar !== ' ') {
                    break;
                }
            }
            else {
                if (currentChar === ')') {
                    itemCounts.normal++;
                }
                if (currentChar === ']') {
                    itemCounts.square++;
                }
                if (currentChar === '}') {
                    itemCounts.curly++;
                }
                if (currentChar === ',' && itemCounts.normal <= 0 && itemCounts.curly <= 0 && itemCounts.square <= 0) {
                    itemCounts.comma++;
                }
                if (currentChar === '(') {
                    if (itemCounts.normal === 0) {
                        itemCounts.isArgStartFound = true;
                        itemCounts.argStartIndex = index;
                    }
                    else {
                        itemCounts.normal--;
                    }
                }
                if (currentChar === '[') {
                    itemCounts.square--;
                }
                if (currentChar === '{') {
                    itemCounts.curly--;
                }
            }
            index--;
        }
        return itemCounts;
    }
    getReferences(pathAbsolute, position) {
        //find the file
        let file = this.getFile(pathAbsolute);
        if (!file) {
            return null;
        }
        return file.getReferences(position);
    }
    /**
     * Get a list of all script imports, relative to the specified pkgPath
     * @param sourcePkgPath - the pkgPath of the source that wants to resolve script imports.
     */
    getScriptImportCompletions(sourcePkgPath, scriptImport) {
        let lowerSourcePkgPath = sourcePkgPath.toLowerCase();
        let result = [];
        /**
         * hashtable to prevent duplicate results
         */
        let resultPkgPaths = {};
        //restrict to only .brs files
        for (let key in this.files) {
            let file = this.files[key];
            if (
            //is a BrightScript or BrighterScript file
            (file.extension === '.bs' || file.extension === '.brs') &&
                //this file is not the current file
                lowerSourcePkgPath !== file.pkgPath.toLowerCase()) {
                //add the relative path
                let relativePath = util_1.util.getRelativePath(sourcePkgPath, file.pkgPath).replace(/\\/g, '/');
                let pkgPathStandardized = file.pkgPath.replace(/\\/g, '/');
                let filePkgPath = `pkg:/${pkgPathStandardized}`;
                let lowerFilePkgPath = filePkgPath.toLowerCase();
                if (!resultPkgPaths[lowerFilePkgPath]) {
                    resultPkgPaths[lowerFilePkgPath] = true;
                    result.push({
                        label: relativePath,
                        detail: file.pathAbsolute,
                        kind: vscode_languageserver_1.CompletionItemKind.File,
                        textEdit: {
                            newText: relativePath,
                            range: scriptImport.filePathRange
                        }
                    });
                    //add the absolute path
                    result.push({
                        label: filePkgPath,
                        detail: file.pathAbsolute,
                        kind: vscode_languageserver_1.CompletionItemKind.File,
                        textEdit: {
                            newText: filePkgPath,
                            range: scriptImport.filePathRange
                        }
                    });
                }
            }
        }
        return result;
    }
    /**
     * Transpile a single file and get the result as a string.
     * This does not write anything to the file system.
     * @param filePath can be a srcPath or a destPath
     */
    getTranspiledFileContents(filePath) {
        return this._getTranspiledFileContents(this.getFile(filePath));
    }
    /**
     * Internal function used to transpile files.
     * This does not write anything to the file system
     */
    _getTranspiledFileContents(file, outputPath) {
        const editor = new AstEditor_1.AstEditor();
        this.plugins.emit('beforeFileTranspile', {
            file: file,
            outputPath: outputPath,
            editor: editor
        });
        //if we have any edits, assume the file needs to be transpiled
        if (editor.hasChanges) {
            //use the `editor` because it'll track the previous value for us and revert later on
            editor.setProperty(file, 'needsTranspiled', true);
        }
        //transpile the file
        const result = file.transpile();
        //generate the typedef if enabled
        let typedef;
        if ((0, reflection_1.isBrsFile)(file) && this.options.emitDefinitions) {
            typedef = file.getTypedef();
        }
        const event = {
            file: file,
            outputPath: outputPath,
            editor: editor,
            code: result.code,
            map: result.map,
            typedef: typedef
        };
        this.plugins.emit('afterFileTranspile', event);
        //undo all `editor` edits that may have been applied to this file.
        editor.undoAll();
        return {
            pathAbsolute: file.pathAbsolute,
            pkgPath: file.pkgPath,
            code: event.code,
            map: event.map,
            typedef: event.typedef
        };
    }
    async transpile(fileEntries, stagingFolderPath) {
        // map fileEntries using their path as key, to avoid excessive "find()" operations
        const mappedFileEntries = fileEntries.reduce((collection, entry) => {
            collection[(0, util_1.standardizePath) `${entry.src}`] = entry;
            return collection;
        }, {});
        const entries = Object.values(this.files).map(file => {
            let filePathObj = mappedFileEntries[(0, util_1.standardizePath) `${file.pathAbsolute}`];
            if (!filePathObj) {
                //this file has been added in-memory, from a plugin, for example
                filePathObj = {
                    //add an interpolated src path (since it doesn't actually exist in memory)
                    src: `bsc:/${file.pkgPath}`,
                    dest: file.pkgPath
                };
            }
            //replace the file extension
            let outputPath = filePathObj.dest.replace(/\.bs$/gi, '.brs');
            //prepend the staging folder path
            outputPath = (0, util_1.standardizePath) `${stagingFolderPath}/${outputPath}`;
            return {
                file: file,
                outputPath: outputPath
            };
        });
        const astEditor = new AstEditor_1.AstEditor();
        this.plugins.emit('beforeProgramTranspile', this, entries, astEditor);
        const promises = entries.map(async (entry) => {
            //skip transpiling typedef files
            if ((0, reflection_1.isBrsFile)(entry.file) && entry.file.isTypedef) {
                return;
            }
            const { file, outputPath } = entry;
            const fileTranspileResult = this._getTranspiledFileContents(file, outputPath);
            //make sure the full dir path exists
            await fsExtra.ensureDir(path.dirname(outputPath));
            if (await fsExtra.pathExists(outputPath)) {
                throw new Error(`Error while transpiling "${file.pathAbsolute}". A file already exists at "${outputPath}" and will not be overwritten.`);
            }
            const writeMapPromise = fileTranspileResult.map ? fsExtra.writeFile(`${outputPath}.map`, fileTranspileResult.map.toString()) : null;
            await Promise.all([
                fsExtra.writeFile(outputPath, fileTranspileResult.code),
                writeMapPromise
            ]);
            if (fileTranspileResult.typedef) {
                const typedefPath = outputPath.replace(/\.brs$/i, '.d.bs');
                await fsExtra.writeFile(typedefPath, fileTranspileResult.typedef);
            }
        });
        //if there's no bslib file already loaded into the program, copy it to the staging directory
        if (!this.getFileByPkgPath(bslibAliasedRokuModulesPkgPath) && !this.getFileByPkgPath((0, util_1.standardizePath) `source/bslib.brs`)) {
            promises.push(util_1.util.copyBslibToStaging(stagingFolderPath));
        }
        await Promise.all(promises);
        this.plugins.emit('afterProgramTranspile', this, entries, astEditor);
        astEditor.undoAll();
    }
    /**
     * Find a list of files in the program that have a function with the given name (case INsensitive)
     */
    findFilesForFunction(functionName) {
        const files = [];
        const lowerFunctionName = functionName.toLowerCase();
        //find every file with this function defined
        for (const file of Object.values(this.files)) {
            if ((0, reflection_1.isBrsFile)(file)) {
                //TODO handle namespace-relative function calls
                //if the file has a function with this name
                if (file.parser.references.functionStatementLookup.get(lowerFunctionName) !== undefined) {
                    files.push(file);
                }
            }
        }
        return files;
    }
    /**
     * Find a list of files in the program that have a class with the given name (case INsensitive)
     */
    findFilesForClass(className) {
        const files = [];
        const lowerClassName = className.toLowerCase();
        //find every file with this class defined
        for (const file of Object.values(this.files)) {
            if ((0, reflection_1.isBrsFile)(file)) {
                //TODO handle namespace-relative classes
                //if the file has a function with this name
                if (file.parser.references.classStatementLookup.get(lowerClassName) !== undefined) {
                    files.push(file);
                }
            }
        }
        return files;
    }
    /**
     * Get a map of the manifest information
     */
    getManifest() {
        if (!this._manifest) {
            //load the manifest file.
            //TODO update this to get the manifest from the files array or require it in the options...we shouldn't assume the location of the manifest
            let manifestPath = path.join(this.options.rootDir, 'manifest');
            let contents;
            try {
                //we only load this manifest once, so do it sync to improve speed downstream
                contents = fsExtra.readFileSync(manifestPath, 'utf-8');
                this._manifest = (0, Manifest_1.parseManifest)(contents);
            }
            catch (err) {
                this._manifest = new Map();
            }
        }
        return this._manifest;
    }
    dispose() {
        for (let filePath in this.files) {
            this.files[filePath].dispose();
        }
        for (let name in this.scopes) {
            this.scopes[name].dispose();
        }
        this.globalScope.dispose();
        this.dependencyGraph.dispose();
    }
}
exports.Program = Program;
//# sourceMappingURL=Program.js.map
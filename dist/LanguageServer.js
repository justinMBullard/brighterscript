"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomCommands = exports.LanguageServer = void 0;
require("array-flat-polyfill");
const glob = require("glob");
const path = require("path");
const rokuDeploy = require("roku-deploy");
const node_1 = require("vscode-languageserver/node");
const vscode_uri_1 = require("vscode-uri");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const deferred_1 = require("./deferred");
const DiagnosticMessages_1 = require("./DiagnosticMessages");
const ProgramBuilder_1 = require("./ProgramBuilder");
const util_1 = require("./util");
const Logger_1 = require("./Logger");
const Throttler_1 = require("./Throttler");
const KeyedThrottler_1 = require("./KeyedThrottler");
const DiagnosticCollection_1 = require("./DiagnosticCollection");
const reflection_1 = require("./astUtils/reflection");
const SemanticTokenUtils_1 = require("./SemanticTokenUtils");
class LanguageServer {
    constructor() {
        this.connection = undefined;
        this.workspaces = [];
        /**
         * The number of milliseconds that should be used for language server typing debouncing
         */
        this.debounceTimeout = 150;
        /**
         * These workspaces are created on the fly whenever a file is opened that is not included
         * in any of the workspace projects.
         * Basically these are single-file workspaces to at least get parsing for standalone files.
         * Also, they should only be created when the file is opened, and destroyed when the file is closed.
         */
        this.standaloneFileWorkspaces = {};
        this.hasConfigurationCapability = false;
        /**
         * Indicates whether the client supports workspace folders
         */
        this.clientHasWorkspaceFolderCapability = false;
        /**
         * Create a simple text document manager.
         * The text document manager supports full document sync only
         */
        this.documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
        this.keyedThrottler = new KeyedThrottler_1.KeyedThrottler(this.debounceTimeout);
        this.validateThrottler = new Throttler_1.Throttler(0);
        this.boundValidateAll = this.validateAll.bind(this);
        this.diagnosticCollection = new DiagnosticCollection_1.DiagnosticCollection();
    }
    createConnection() {
        return (0, node_1.createConnection)(node_1.ProposedFeatures.all);
    }
    validateAllThrottled() {
        return this.validateThrottler.run(this.boundValidateAll);
    }
    //run the server
    run() {
        // Create a connection for the server. The connection uses Node's IPC as a transport.
        // Also include all preview / proposed LSP features.
        this.connection = this.createConnection();
        //listen to all of the output log events and pipe them into the debug channel in the extension
        this.loggerSubscription = Logger_1.Logger.subscribe((text) => {
            this.connection.tracer.log(text);
        });
        this.connection.onInitialize(this.onInitialize.bind(this));
        this.connection.onInitialized(this.onInitialized.bind(this)); //eslint-disable-line
        this.connection.onDidChangeConfiguration(this.onDidChangeConfiguration.bind(this)); //eslint-disable-line
        this.connection.onDidChangeWatchedFiles(this.onDidChangeWatchedFiles.bind(this)); //eslint-disable-line
        // The content of a text document has changed. This event is emitted
        // when the text document is first opened, when its content has changed,
        // or when document is closed without saving (original contents are sent as a change)
        //
        this.documents.onDidChangeContent(async (change) => {
            await this.validateTextDocument(change.document);
        });
        //whenever a document gets closed
        this.documents.onDidClose(async (change) => {
            await this.onDocumentClose(change.document);
        });
        // This handler provides the initial list of the completion items.
        this.connection.onCompletion(async (params) => {
            return this.onCompletion(params.textDocument.uri, params.position);
        });
        // This handler resolves additional information for the item selected in
        // the completion list.
        this.connection.onCompletionResolve(this.onCompletionResolve.bind(this));
        this.connection.onHover(this.onHover.bind(this));
        this.connection.onExecuteCommand(this.onExecuteCommand.bind(this));
        this.connection.onDefinition(this.onDefinition.bind(this));
        this.connection.onDocumentSymbol(this.onDocumentSymbol.bind(this));
        this.connection.onWorkspaceSymbol(this.onWorkspaceSymbol.bind(this));
        this.connection.onSignatureHelp(this.onSignatureHelp.bind(this));
        this.connection.onReferences(this.onReferences.bind(this));
        this.connection.onCodeAction(this.onCodeAction.bind(this));
        //TODO switch to a more specific connection function call once they actually add it
        this.connection.onRequest(node_1.SemanticTokensRequest.method, this.onFullSemanticTokens.bind(this));
        /*
        this.connection.onDidOpenTextDocument((params) => {
             // A text document got opened in VSCode.
             // params.uri uniquely identifies the document. For documents stored on disk this is a file URI.
             // params.text the initial full content of the document.
            this.connection.console.log(`${params.textDocument.uri} opened.`);
        });
        this.connection.onDidChangeTextDocument((params) => {
             // The content of a text document did change in VSCode.
             // params.uri uniquely identifies the document.
             // params.contentChanges describe the content changes to the document.
            this.connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
        });
        this.connection.onDidCloseTextDocument((params) => {
             // A text document got closed in VSCode.
             // params.uri uniquely identifies the document.
            this.connection.console.log(`${params.textDocument.uri} closed.`);
        });
        */
        // listen for open, change and close text document events
        this.documents.listen(this.connection);
        // Listen on the connection
        this.connection.listen();
    }
    /**
     * Called when the client starts initialization
     * @param params
     */
    onInitialize(params) {
        let clientCapabilities = params.capabilities;
        // Does the client support the `workspace/configuration` request?
        // If not, we will fall back using global settings
        this.hasConfigurationCapability = !!(clientCapabilities.workspace && !!clientCapabilities.workspace.configuration);
        this.clientHasWorkspaceFolderCapability = !!(clientCapabilities.workspace && !!clientCapabilities.workspace.workspaceFolders);
        //return the capabilities of the server
        return {
            capabilities: {
                textDocumentSync: node_1.TextDocumentSyncKind.Full,
                // Tell the client that the server supports code completion
                completionProvider: {
                    resolveProvider: true,
                    //anytime the user types a period, auto-show the completion results
                    triggerCharacters: ['.'],
                    allCommitCharacters: ['.', '@']
                },
                documentSymbolProvider: true,
                workspaceSymbolProvider: true,
                semanticTokensProvider: {
                    legend: SemanticTokenUtils_1.semanticTokensLegend,
                    full: true
                },
                referencesProvider: true,
                codeActionProvider: {
                    codeActionKinds: [node_1.CodeActionKind.Refactor]
                },
                signatureHelpProvider: {
                    triggerCharacters: ['(', ',']
                },
                definitionProvider: true,
                hoverProvider: true,
                executeCommandProvider: {
                    commands: [
                        CustomCommands.TranspileFile
                    ]
                }
            }
        };
    }
    /**
     * Called when the client has finished initializing
     * @param params
     */
    async onInitialized() {
        var _a;
        let workspaceCreatedDeferred = new deferred_1.Deferred();
        this.initialWorkspacesCreated = workspaceCreatedDeferred.promise;
        try {
            if (this.hasConfigurationCapability) {
                // Register for all configuration changes.
                await this.connection.client.register(node_1.DidChangeConfigurationNotification.type, undefined);
            }
            //ask the client for all workspace folders
            let workspaceFolders = (_a = await this.connection.workspace.getWorkspaceFolders()) !== null && _a !== void 0 ? _a : [];
            let workspacePaths = workspaceFolders.map((x) => {
                return util_1.util.uriToPath(x.uri);
            });
            await this.createWorkspaces(workspacePaths);
            if (this.clientHasWorkspaceFolderCapability) {
                this.connection.workspace.onDidChangeWorkspaceFolders(async (evt) => {
                    //remove programs for removed workspace folders
                    for (let removed of evt.removed) {
                        let workspacePath = util_1.util.uriToPath(removed.uri);
                        let workspace = this.workspaces.find((x) => x.workspacePath === workspacePath);
                        if (workspace) {
                            workspace.builder.dispose();
                            this.workspaces.splice(this.workspaces.indexOf(workspace), 1);
                        }
                    }
                    //create programs for new workspace folders
                    await this.createWorkspaces(evt.added.map((x) => util_1.util.uriToPath(x.uri)));
                });
            }
            await this.waitAllProgramFirstRuns(false);
            workspaceCreatedDeferred.resolve();
            await this.sendDiagnostics();
        }
        catch (e) {
            this.sendCriticalFailure(`Critical failure during BrighterScript language server startup.
                Please file a github issue and include the contents of the 'BrighterScript Language Server' output channel.

                Error message: ${e.message}`);
            throw e;
        }
    }
    /**
     * Send a critical failure notification to the client, which should show a notification of some kind
     */
    sendCriticalFailure(message) {
        this.connection.sendNotification('critical-failure', message);
    }
    /**
     * Wait for all programs' first run to complete
     */
    async waitAllProgramFirstRuns(waitForFirstWorkSpace = true) {
        if (waitForFirstWorkSpace) {
            await this.initialWorkspacesCreated;
        }
        let status;
        let workspaces = this.getWorkspaces();
        for (let workspace of workspaces) {
            try {
                await workspace.firstRunPromise;
            }
            catch (e) {
                status = 'critical-error';
                //the first run failed...that won't change unless we reload the workspace, so replace with resolved promise
                //so we don't show this error again
                workspace.firstRunPromise = Promise.resolve();
                this.sendCriticalFailure(`BrighterScript language server failed to start: \n${e.message}`);
            }
        }
        this.connection.sendNotification('build-status', status ? status : 'success');
    }
    /**
     * Create project for each new workspace. If the workspace is already known,
     * it is skipped.
     * @param workspaceFolders
     */
    async createWorkspaces(workspacePaths) {
        return Promise.all(workspacePaths.map(async (workspacePath) => this.createWorkspace(workspacePath)));
    }
    /**
     * Event handler for when the program wants to load file contents.
     * anytime the program wants to load a file, check with our in-memory document cache first
     */
    documentFileResolver(srcPath) {
        let pathUri = vscode_uri_1.URI.file(srcPath).toString();
        let document = this.documents.get(pathUri);
        if (document) {
            return document.getText();
        }
    }
    async getConfigFilePath(workspacePath) {
        let scopeUri;
        if (workspacePath.startsWith('file:')) {
            scopeUri = vscode_uri_1.URI.parse(workspacePath).toString();
        }
        else {
            scopeUri = vscode_uri_1.URI.file(workspacePath).toString();
        }
        //look for config group called "brightscript"
        let config = await this.connection.workspace.getConfiguration({
            scopeUri: scopeUri,
            section: 'brightscript'
        });
        let configFilePath;
        //if there's a setting, we need to find the file or show error if it can't be found
        if (config === null || config === void 0 ? void 0 : config.configFile) {
            configFilePath = path.resolve(workspacePath, config.configFile);
            if (await util_1.util.pathExists(configFilePath)) {
                return configFilePath;
            }
            else {
                this.sendCriticalFailure(`Cannot find config file specified in user/workspace settings at '${configFilePath}'`);
            }
        }
        //default to config file path found in the root of the workspace
        configFilePath = path.resolve(workspacePath, 'bsconfig.json');
        if (await util_1.util.pathExists(configFilePath)) {
            return configFilePath;
        }
        //look for the deprecated `brsconfig.json` file
        configFilePath = path.resolve(workspacePath, 'brsconfig.json');
        if (await util_1.util.pathExists(configFilePath)) {
            return configFilePath;
        }
        //no config file could be found
        return undefined;
    }
    async createWorkspace(workspacePath) {
        let workspace = this.workspaces.find((x) => x.workspacePath === workspacePath);
        //skip this workspace if we already have it
        if (workspace) {
            return;
        }
        let builder = new ProgramBuilder_1.ProgramBuilder();
        //prevent clearing the console on run...this isn't the CLI so we want to keep a full log of everything
        builder.allowConsoleClearing = false;
        //look for files in our in-memory cache before going to the file system
        builder.addFileResolver(this.documentFileResolver.bind(this));
        let configFilePath = await this.getConfigFilePath(workspacePath);
        let cwd = workspacePath;
        //if the config file exists, use it and its folder as cwd
        if (configFilePath && await util_1.util.pathExists(configFilePath)) {
            cwd = path.dirname(configFilePath);
        }
        else {
            //config file doesn't exist...let `brighterscript` resolve the default way
            configFilePath = undefined;
        }
        let firstRunPromise = builder.run({
            cwd: cwd,
            project: configFilePath,
            watch: false,
            createPackage: false,
            deploy: false,
            copyToStaging: false,
            showDiagnosticsInConsole: false
        });
        firstRunPromise.catch((err) => {
            console.error(err);
        });
        let newWorkspace = {
            builder: builder,
            firstRunPromise: firstRunPromise,
            workspacePath: workspacePath,
            isFirstRunComplete: false,
            isFirstRunSuccessful: false,
            configFilePath: configFilePath,
            isStandaloneFileWorkspace: false
        };
        this.workspaces.push(newWorkspace);
        await firstRunPromise.then(() => {
            newWorkspace.isFirstRunComplete = true;
            newWorkspace.isFirstRunSuccessful = true;
        }).catch(() => {
            newWorkspace.isFirstRunComplete = true;
            newWorkspace.isFirstRunSuccessful = false;
        }).then(() => {
            //if we found a deprecated brsconfig.json, add a diagnostic warning the user
            if (configFilePath && path.basename(configFilePath) === 'brsconfig.json') {
                builder.addDiagnostic(configFilePath, Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.brsConfigJsonIsDeprecated()), { range: util_1.util.createRange(0, 0, 0, 0) }));
                return this.sendDiagnostics();
            }
        });
    }
    async createStandaloneFileWorkspace(filePathAbsolute) {
        //skip this workspace if we already have it
        if (this.standaloneFileWorkspaces[filePathAbsolute]) {
            return this.standaloneFileWorkspaces[filePathAbsolute];
        }
        let builder = new ProgramBuilder_1.ProgramBuilder();
        //prevent clearing the console on run...this isn't the CLI so we want to keep a full log of everything
        builder.allowConsoleClearing = false;
        //look for files in our in-memory cache before going to the file system
        builder.addFileResolver(this.documentFileResolver.bind(this));
        //get the path to the directory where this file resides
        let cwd = path.dirname(filePathAbsolute);
        //get the closest config file and use most of the settings from that
        let configFilePath = await util_1.util.findClosestConfigFile(filePathAbsolute);
        let project = {};
        if (configFilePath) {
            project = util_1.util.normalizeAndResolveConfig({ project: configFilePath });
        }
        //override the rootDir and files array
        project.rootDir = cwd;
        project.files = [{
                src: filePathAbsolute,
                dest: path.basename(filePathAbsolute)
            }];
        let firstRunPromise = builder.run(Object.assign(Object.assign({}, project), { cwd: cwd, project: configFilePath, watch: false, createPackage: false, deploy: false, copyToStaging: false, diagnosticFilters: [
                //hide the "file not referenced by any other file" error..that's expected in a standalone file.
                1013
            ] })).catch((err) => {
            console.error(err);
        });
        let newWorkspace = {
            builder: builder,
            firstRunPromise: firstRunPromise,
            workspacePath: filePathAbsolute,
            isFirstRunComplete: false,
            isFirstRunSuccessful: false,
            configFilePath: configFilePath,
            isStandaloneFileWorkspace: true
        };
        this.standaloneFileWorkspaces[filePathAbsolute] = newWorkspace;
        await firstRunPromise.then(() => {
            newWorkspace.isFirstRunComplete = true;
            newWorkspace.isFirstRunSuccessful = true;
        }).catch(() => {
            newWorkspace.isFirstRunComplete = true;
            newWorkspace.isFirstRunSuccessful = false;
        });
        return newWorkspace;
    }
    getWorkspaces() {
        let workspaces = this.workspaces.slice();
        for (let key in this.standaloneFileWorkspaces) {
            workspaces.push(this.standaloneFileWorkspaces[key]);
        }
        return workspaces;
    }
    /**
     * Provide a list of completion items based on the current cursor position
     * @param textDocumentPosition
     */
    async onCompletion(uri, position) {
        //ensure programs are initialized
        await this.waitAllProgramFirstRuns();
        let filePath = util_1.util.uriToPath(uri);
        //wait until the file has settled
        await this.keyedThrottler.onIdleOnce(filePath, true);
        let completions = this
            .getWorkspaces()
            .flatMap(workspace => workspace.builder.program.getCompletions(filePath, position));
        for (let completion of completions) {
            completion.commitCharacters = ['.'];
        }
        return completions;
    }
    /**
     * Provide a full completion item from the selection
     * @param item
     */
    onCompletionResolve(item) {
        if (item.data === 1) {
            item.detail = 'TypeScript details';
            item.documentation = 'TypeScript documentation';
        }
        else if (item.data === 2) {
            item.detail = 'JavaScript details';
            item.documentation = 'JavaScript documentation';
        }
        return item;
    }
    async onCodeAction(params) {
        //ensure programs are initialized
        await this.waitAllProgramFirstRuns();
        let srcPath = util_1.util.uriToPath(params.textDocument.uri);
        //wait until the file has settled
        await this.keyedThrottler.onIdleOnce(srcPath, true);
        const codeActions = this
            .getWorkspaces()
            //skip programs that don't have this file
            .filter(x => { var _a, _b; return (_b = (_a = x.builder) === null || _a === void 0 ? void 0 : _a.program) === null || _b === void 0 ? void 0 : _b.hasFile(srcPath); })
            .flatMap(workspace => workspace.builder.program.getCodeActions(srcPath, params.range));
        //clone the diagnostics for each code action, since certain diagnostics can have circular reference properties that kill the language server if serialized
        for (const codeAction of codeActions) {
            if (codeAction.diagnostics) {
                codeAction.diagnostics = codeAction.diagnostics.map(x => util_1.util.toDiagnostic(x));
            }
        }
        return codeActions;
    }
    /**
     * Reload all specified workspaces, or all workspaces if no workspaces are specified
     */
    async reloadWorkspaces(workspaces) {
        workspaces = workspaces ? workspaces : this.getWorkspaces();
        await Promise.all(workspaces.map(async (workspace) => {
            //ensure the workspace has finished starting up
            try {
                await workspace.firstRunPromise;
            }
            catch (e) { }
            //handle standard workspace
            if (workspace.isStandaloneFileWorkspace === false) {
                let idx = this.workspaces.indexOf(workspace);
                if (idx > -1) {
                    //remove this workspace
                    this.workspaces.splice(idx, 1);
                    //dispose this workspace's resources
                    workspace.builder.dispose();
                }
                //create a new workspace/brs program
                await this.createWorkspace(workspace.workspacePath);
                //handle temp workspace
            }
            else {
                workspace.builder.dispose();
                delete this.standaloneFileWorkspaces[workspace.workspacePath];
                await this.createStandaloneFileWorkspace(workspace.workspacePath);
            }
        }));
        if (workspaces.length > 0) {
            //wait for all of the programs to finish starting up
            await this.waitAllProgramFirstRuns();
            // valdiate all workspaces
            this.validateAllThrottled(); //eslint-disable-line
        }
    }
    getRootDir(workspace) {
        var _a, _b, _c;
        let options = (_b = (_a = workspace === null || workspace === void 0 ? void 0 : workspace.builder) === null || _a === void 0 ? void 0 : _a.program) === null || _b === void 0 ? void 0 : _b.options;
        return (_c = options === null || options === void 0 ? void 0 : options.rootDir) !== null && _c !== void 0 ? _c : options === null || options === void 0 ? void 0 : options.cwd;
    }
    /**
     * Sometimes users will alter their bsconfig files array, and will include standalone files.
     * If this is the case, those standalone workspaces should be removed because the file was
     * included in an actual program now.
     *
     * Sometimes files that used to be included are now excluded, so those open files need to be re-processed as standalone
     */
    async synchronizeStandaloneWorkspaces() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        //remove standalone workspaces that are now included in projects
        for (let standaloneFilePath in this.standaloneFileWorkspaces) {
            let standaloneWorkspace = this.standaloneFileWorkspaces[standaloneFilePath];
            for (let workspace of this.workspaces) {
                await standaloneWorkspace.firstRunPromise;
                let dest = rokuDeploy.getDestPath(standaloneFilePath, (_d = (_c = (_b = (_a = workspace === null || workspace === void 0 ? void 0 : workspace.builder) === null || _a === void 0 ? void 0 : _a.program) === null || _b === void 0 ? void 0 : _b.options) === null || _c === void 0 ? void 0 : _c.files) !== null && _d !== void 0 ? _d : [], this.getRootDir(workspace));
                //destroy this standalone workspace because the file has now been included in an actual workspace,
                //or if the workspace wants the file
                if (((_f = (_e = workspace === null || workspace === void 0 ? void 0 : workspace.builder) === null || _e === void 0 ? void 0 : _e.program) === null || _f === void 0 ? void 0 : _f.hasFile(standaloneFilePath)) || dest) {
                    standaloneWorkspace.builder.dispose();
                    delete this.standaloneFileWorkspaces[standaloneFilePath];
                }
            }
        }
        //create standalone workspaces for open files that no longer have a project
        let textDocuments = this.documents.all();
        outer: for (let textDocument of textDocuments) {
            let filePath = vscode_uri_1.URI.parse(textDocument.uri).fsPath;
            let workspaces = this.getWorkspaces();
            for (let workspace of workspaces) {
                let dest = rokuDeploy.getDestPath(filePath, (_k = (_j = (_h = (_g = workspace === null || workspace === void 0 ? void 0 : workspace.builder) === null || _g === void 0 ? void 0 : _g.program) === null || _h === void 0 ? void 0 : _h.options) === null || _j === void 0 ? void 0 : _j.files) !== null && _k !== void 0 ? _k : [], this.getRootDir(workspace));
                //if this workspace has the file, or it wants the file, do NOT make a standalone workspace for this file
                if (((_m = (_l = workspace === null || workspace === void 0 ? void 0 : workspace.builder) === null || _l === void 0 ? void 0 : _l.program) === null || _m === void 0 ? void 0 : _m.hasFile(filePath)) || dest) {
                    continue outer;
                }
            }
            //if we got here, no workspace has this file, so make a standalone file workspace
            let workspace = await this.createStandaloneFileWorkspace(filePath);
            await workspace.firstRunPromise;
        }
    }
    async onDidChangeConfiguration() {
        if (this.hasConfigurationCapability) {
            await this.reloadWorkspaces();
            // Reset all cached document settings
        }
        else {
            // this.globalSettings = <ExampleSettings>(
            //     (change.settings.languageServerExample || this.defaultSettings)
            // );
        }
    }
    /**
     * Called when watched files changed (add/change/delete).
     * The CLIENT is in charge of what files to watch, so all client
     * implementations should ensure that all valid project
     * file types are watched (.brs,.bs,.xml,manifest, and any json/text/image files)
     * @param params
     */
    async onDidChangeWatchedFiles(params) {
        //ensure programs are initialized
        await this.waitAllProgramFirstRuns();
        this.connection.sendNotification('build-status', 'building');
        let workspaces = this.getWorkspaces();
        //convert all file paths to absolute paths
        let changes = params.changes.map(x => {
            return {
                type: x.type,
                pathAbsolute: (0, util_1.standardizePath) `${vscode_uri_1.URI.parse(x.uri).fsPath}`
            };
        });
        let keys = changes.map(x => x.pathAbsolute);
        //filter the list of changes to only the ones that made it through the debounce unscathed
        changes = changes.filter(x => keys.includes(x.pathAbsolute));
        //if we have changes to work with
        if (changes.length > 0) {
            //reload any workspace whose bsconfig.json file has changed
            {
                let workspacesToReload = [];
                //get the file paths as a string array
                let filePaths = changes.map((x) => x.pathAbsolute);
                for (let workspace of workspaces) {
                    if (workspace.configFilePath && filePaths.includes(workspace.configFilePath)) {
                        workspacesToReload.push(workspace);
                    }
                }
                if (workspacesToReload.length > 0) {
                    //vsc can generate a ton of these changes, for vsc system files, so we need to bail if there's no work to do on any of our actual workspace files
                    //reload any workspaces that need to be reloaded
                    await this.reloadWorkspaces(workspacesToReload);
                }
                //set the list of workspaces to non-reloaded workspaces
                workspaces = workspaces.filter(x => !workspacesToReload.includes(x));
            }
            //convert created folders into a list of files of their contents
            const directoryChanges = changes
                //get only creation items
                .filter(change => change.type === node_1.FileChangeType.Created)
                //keep only the directories
                .filter(change => util_1.util.isDirectorySync(change.pathAbsolute));
            //remove the created directories from the changes array (we will add back each of their files next)
            changes = changes.filter(x => !directoryChanges.includes(x));
            //look up every file in each of the newly added directories
            const newFileChanges = directoryChanges
                //take just the path
                .map(x => x.pathAbsolute)
                //exclude the roku deploy staging folder
                .filter(dirPath => !dirPath.includes('.roku-deploy-staging'))
                //get the files for each folder recursively
                .flatMap(dirPath => {
                //create a glob pattern to match all files
                let pattern = rokuDeploy.util.toForwardSlashes(`${dirPath}/**/*`);
                let files = glob.sync(pattern, {
                    absolute: true
                });
                return files.map(x => {
                    return {
                        type: node_1.FileChangeType.Created,
                        pathAbsolute: (0, util_1.standardizePath) `${x}`
                    };
                });
            });
            //add the new file changes to the changes array.
            changes.push(...newFileChanges);
            //give every workspace the chance to handle file changes
            await Promise.all(workspaces.map((workspace) => this.handleFileChanges(workspace, changes)));
        }
        this.connection.sendNotification('build-status', 'success');
    }
    /**
     * This only operates on files that match the specified files globs, so it is safe to throw
     * any file changes you receive with no unexpected side-effects
     * @param changes
     */
    async handleFileChanges(workspace, changes) {
        //this loop assumes paths are both file paths and folder paths, which eliminates the need to detect.
        //All functions below can handle being given a file path AND a folder path, and will only operate on the one they are looking for
        let consumeCount = 0;
        await Promise.all(changes.map(async (change) => {
            await this.keyedThrottler.run(change.pathAbsolute, async () => {
                consumeCount += await this.handleFileChange(workspace, change) ? 1 : 0;
            });
        }));
        if (consumeCount > 0) {
            await this.validateAllThrottled();
        }
    }
    /**
     * This only operates on files that match the specified files globs, so it is safe to throw
     * any file changes you receive with no unexpected side-effects
     * @param changes
     */
    async handleFileChange(workspace, change) {
        const program = workspace.builder.program;
        const options = workspace.builder.options;
        const rootDir = workspace.builder.rootDir;
        //deleted
        if (change.type === node_1.FileChangeType.Deleted) {
            //try to act on this path as a directory
            workspace.builder.removeFilesInFolder(change.pathAbsolute);
            //if this is a file loaded in the program, remove it
            if (program.hasFile(change.pathAbsolute)) {
                program.removeFile(change.pathAbsolute);
                return true;
            }
            else {
                return false;
            }
            //created
        }
        else if (change.type === node_1.FileChangeType.Created) {
            // thanks to `onDidChangeWatchedFiles`, we can safely assume that all "Created" changes are file paths, (not directories)
            //get the dest path for this file.
            let destPath = rokuDeploy.getDestPath(change.pathAbsolute, options.files, rootDir);
            //if we got a dest path, then the program wants this file
            if (destPath) {
                program.setFile({
                    src: change.pathAbsolute,
                    dest: rokuDeploy.getDestPath(change.pathAbsolute, options.files, rootDir)
                }, await workspace.builder.getFileContents(change.pathAbsolute));
                return true;
            }
            else {
                //no dest path means the program doesn't want this file
                return false;
            }
            //changed
        }
        else if (program.hasFile(change.pathAbsolute)) {
            //sometimes "changed" events are emitted on files that were actually deleted,
            //so determine file existance and act accordingly
            if (await util_1.util.pathExists(change.pathAbsolute)) {
                program.setFile({
                    src: change.pathAbsolute,
                    dest: rokuDeploy.getDestPath(change.pathAbsolute, options.files, rootDir)
                }, await workspace.builder.getFileContents(change.pathAbsolute));
            }
            else {
                program.removeFile(change.pathAbsolute);
            }
            return true;
        }
    }
    async onHover(params) {
        //ensure programs are initialized
        await this.waitAllProgramFirstRuns();
        let pathAbsolute = util_1.util.uriToPath(params.textDocument.uri);
        let workspaces = this.getWorkspaces();
        let hovers = await Promise.all(Array.prototype.concat.call([], workspaces.map(async (x) => x.builder.program.getHover(pathAbsolute, params.position))));
        //return the first non-falsey hover. TODO is there a way to handle multiple hover results?
        let hover = hovers.filter((x) => !!x)[0];
        return hover;
    }
    async onDocumentClose(textDocument) {
        let filePath = vscode_uri_1.URI.parse(textDocument.uri).fsPath;
        let standaloneFileWorkspace = this.standaloneFileWorkspaces[filePath];
        //if this was a temp file, close it
        if (standaloneFileWorkspace) {
            await standaloneFileWorkspace.firstRunPromise;
            standaloneFileWorkspace.builder.dispose();
            delete this.standaloneFileWorkspaces[filePath];
            await this.sendDiagnostics();
        }
    }
    async validateTextDocument(textDocument) {
        //ensure programs are initialized
        await this.waitAllProgramFirstRuns();
        let filePath = vscode_uri_1.URI.parse(textDocument.uri).fsPath;
        try {
            //throttle file processing. first call is run immediately, and then the last call is processed.
            await this.keyedThrottler.run(filePath, () => {
                var _a;
                this.connection.sendNotification('build-status', 'building');
                let documentText = textDocument.getText();
                for (const workspace of this.getWorkspaces()) {
                    //only add or replace existing files. All of the files in the project should
                    //have already been loaded by other means
                    if (workspace.builder.program.hasFile(filePath)) {
                        let rootDir = (_a = workspace.builder.program.options.rootDir) !== null && _a !== void 0 ? _a : workspace.builder.program.options.cwd;
                        let dest = rokuDeploy.getDestPath(filePath, workspace.builder.program.options.files, rootDir);
                        workspace.builder.program.setFile({
                            src: filePath,
                            dest: dest
                        }, documentText);
                    }
                }
            });
            // validate all workspaces
            await this.validateAllThrottled();
        }
        catch (e) {
            this.sendCriticalFailure(`Critical error parsing/ validating ${filePath}: ${e.message}`);
        }
    }
    async validateAll() {
        var _a;
        try {
            //synchronize parsing for open files that were included/excluded from projects
            await this.synchronizeStandaloneWorkspaces();
            let workspaces = this.getWorkspaces();
            //validate all programs
            await Promise.all(workspaces.map((x) => x.builder.program.validate()));
            await this.sendDiagnostics();
        }
        catch (e) {
            this.connection.console.error(e);
            this.sendCriticalFailure(`Critical error validating workspace: ${e.message}${(_a = e.stack) !== null && _a !== void 0 ? _a : ''}`);
        }
        this.connection.sendNotification('build-status', 'success');
    }
    async onWorkspaceSymbol(params) {
        await this.waitAllProgramFirstRuns();
        const results = util_1.util.flatMap(await Promise.all(this.getWorkspaces().map(workspace => {
            return workspace.builder.program.getWorkspaceSymbols();
        })), c => c);
        // Remove duplicates
        const allSymbols = Object.values(results.reduce((map, symbol) => {
            const key = symbol.location.uri + symbol.name;
            map[key] = symbol;
            return map;
        }, {}));
        return allSymbols;
    }
    async onDocumentSymbol(params) {
        await this.waitAllProgramFirstRuns();
        await this.keyedThrottler.onIdleOnce(util_1.util.uriToPath(params.textDocument.uri), true);
        const pathAbsolute = util_1.util.uriToPath(params.textDocument.uri);
        for (const workspace of this.getWorkspaces()) {
            const file = workspace.builder.program.getFileByPathAbsolute(pathAbsolute);
            if ((0, reflection_1.isBrsFile)(file)) {
                return file.getDocumentSymbols();
            }
        }
    }
    async onDefinition(params) {
        await this.waitAllProgramFirstRuns();
        const pathAbsolute = util_1.util.uriToPath(params.textDocument.uri);
        const results = util_1.util.flatMap(await Promise.all(this.getWorkspaces().map(workspace => {
            return workspace.builder.program.getDefinition(pathAbsolute, params.position);
        })), c => c);
        return results;
    }
    async onSignatureHelp(params) {
        var _a, _b, _c;
        await this.waitAllProgramFirstRuns();
        const filepath = util_1.util.uriToPath(params.textDocument.uri);
        await this.keyedThrottler.onIdleOnce(filepath, true);
        try {
            const signatures = util_1.util.flatMap(await Promise.all(this.getWorkspaces().map(workspace => workspace.builder.program.getSignatureHelp(filepath, params.position))), c => c);
            const activeSignature = signatures.length > 0 ? 0 : null;
            const activeParameter = activeSignature >= 0 ? (_a = signatures[activeSignature]) === null || _a === void 0 ? void 0 : _a.index : null;
            let results = {
                signatures: signatures.map((s) => s.signature),
                activeSignature: activeSignature,
                activeParameter: activeParameter
            };
            return results;
        }
        catch (e) {
            this.connection.console.error(`error in onSignatureHelp: ${(_c = (_b = e.stack) !== null && _b !== void 0 ? _b : e.message) !== null && _c !== void 0 ? _c : e}`);
            return {
                signatures: [],
                activeSignature: 0,
                activeParameter: 0
            };
        }
    }
    async onReferences(params) {
        await this.waitAllProgramFirstRuns();
        const position = params.position;
        const pathAbsolute = util_1.util.uriToPath(params.textDocument.uri);
        const results = util_1.util.flatMap(await Promise.all(this.getWorkspaces().map(workspace => {
            return workspace.builder.program.getReferences(pathAbsolute, position);
        })), c => c);
        return results.filter((r) => r);
    }
    async onFullSemanticTokens(params) {
        await this.waitAllProgramFirstRuns();
        await this.keyedThrottler.onIdleOnce(util_1.util.uriToPath(params.textDocument.uri), true);
        const srcPath = util_1.util.uriToPath(params.textDocument.uri);
        for (const workspace of this.workspaces) {
            //find the first program that has this file, since it would be incredibly inefficient to generate semantic tokens for the same file multiple times.
            if (workspace.builder.program.hasFile(srcPath)) {
                let semanticTokens = workspace.builder.program.getSemanticTokens(srcPath);
                return {
                    data: (0, SemanticTokenUtils_1.encodeSemanticTokens)(semanticTokens)
                };
            }
        }
    }
    async sendDiagnostics() {
        //Get only the changes to diagnostics since the last time we sent them to the client
        const patch = await this.diagnosticCollection.getPatch(this.workspaces);
        for (let filePath in patch) {
            const diagnostics = patch[filePath].map(d => util_1.util.toDiagnostic(d));
            this.connection.sendDiagnostics({
                uri: vscode_uri_1.URI.file(filePath).toString(),
                diagnostics: diagnostics
            });
        }
    }
    async onExecuteCommand(params) {
        await this.waitAllProgramFirstRuns();
        if (params.command === CustomCommands.TranspileFile) {
            return this.transpileFile(params.arguments[0]);
        }
    }
    async transpileFile(pathAbsolute) {
        //wait all program first runs
        await this.waitAllProgramFirstRuns();
        let workspaces = this.getWorkspaces();
        //find the first workspace that has this file
        for (let workspace of workspaces) {
            if (workspace.builder.program.hasFile(pathAbsolute)) {
                return workspace.builder.program.getTranspiledFileContents(pathAbsolute);
            }
        }
    }
    dispose() {
        var _a;
        (_a = this.loggerSubscription) === null || _a === void 0 ? void 0 : _a.call(this);
        this.validateThrottler.dispose();
    }
}
__decorate([
    AddStackToErrorMessage
], LanguageServer.prototype, "onInitialize", null);
__decorate([
    AddStackToErrorMessage
], LanguageServer.prototype, "onInitialized", null);
__decorate([
    AddStackToErrorMessage
], LanguageServer.prototype, "onCompletion", null);
__decorate([
    AddStackToErrorMessage
], LanguageServer.prototype, "onCompletionResolve", null);
__decorate([
    AddStackToErrorMessage
], LanguageServer.prototype, "onCodeAction", null);
__decorate([
    AddStackToErrorMessage
], LanguageServer.prototype, "onDidChangeConfiguration", null);
__decorate([
    AddStackToErrorMessage
], LanguageServer.prototype, "onDidChangeWatchedFiles", null);
__decorate([
    AddStackToErrorMessage
], LanguageServer.prototype, "onHover", null);
__decorate([
    AddStackToErrorMessage
], LanguageServer.prototype, "onDocumentClose", null);
__decorate([
    AddStackToErrorMessage
], LanguageServer.prototype, "validateTextDocument", null);
__decorate([
    AddStackToErrorMessage
], LanguageServer.prototype, "onWorkspaceSymbol", null);
__decorate([
    AddStackToErrorMessage
], LanguageServer.prototype, "onDocumentSymbol", null);
__decorate([
    AddStackToErrorMessage
], LanguageServer.prototype, "onDefinition", null);
__decorate([
    AddStackToErrorMessage
], LanguageServer.prototype, "onSignatureHelp", null);
__decorate([
    AddStackToErrorMessage
], LanguageServer.prototype, "onReferences", null);
__decorate([
    AddStackToErrorMessage
], LanguageServer.prototype, "onFullSemanticTokens", null);
__decorate([
    AddStackToErrorMessage
], LanguageServer.prototype, "onExecuteCommand", null);
exports.LanguageServer = LanguageServer;
var CustomCommands;
(function (CustomCommands) {
    CustomCommands["TranspileFile"] = "TranspileFile";
})(CustomCommands = exports.CustomCommands || (exports.CustomCommands = {}));
/**
 * Wraps a method. If there's an error (either sync or via a promise),
 * this appends the error's stack trace at the end of the error message so that the connection will
 */
function AddStackToErrorMessage(target, propertyKey, descriptor) {
    let originalMethod = descriptor.value;
    //wrapping the original method
    descriptor.value = function value(...args) {
        try {
            let result = originalMethod.apply(this, args);
            //if the result looks like a promise, log if there's a rejection
            if (result === null || result === void 0 ? void 0 : result.then) {
                return Promise.resolve(result).catch((e) => {
                    if (e === null || e === void 0 ? void 0 : e.stack) {
                        e.message = e.stack;
                    }
                    return Promise.reject(e);
                });
            }
            else {
                return result;
            }
        }
        catch (e) {
            if (e === null || e === void 0 ? void 0 : e.stack) {
                e.message = e.stack;
            }
            throw e;
        }
    };
}
//# sourceMappingURL=LanguageServer.js.map
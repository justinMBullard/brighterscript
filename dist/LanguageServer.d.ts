import 'array-flat-polyfill';
import type { InitializeParams, ServerCapabilities, ExecuteCommandParams, WorkspaceSymbolParams, SymbolInformation, DocumentSymbolParams } from 'vscode-languageserver/node';
import { FileChangeType } from 'vscode-languageserver/node';
import { ProgramBuilder } from './ProgramBuilder';
import { Throttler } from './Throttler';
export declare class LanguageServer {
    private connection;
    workspaces: Workspace[];
    /**
     * The number of milliseconds that should be used for language server typing debouncing
     */
    private debounceTimeout;
    /**
     * These workspaces are created on the fly whenever a file is opened that is not included
     * in any of the workspace projects.
     * Basically these are single-file workspaces to at least get parsing for standalone files.
     * Also, they should only be created when the file is opened, and destroyed when the file is closed.
     */
    standaloneFileWorkspaces: Record<string, Workspace>;
    private hasConfigurationCapability;
    /**
     * Indicates whether the client supports workspace folders
     */
    private clientHasWorkspaceFolderCapability;
    /**
     * Create a simple text document manager.
     * The text document manager supports full document sync only
     */
    private documents;
    private createConnection;
    private loggerSubscription;
    private keyedThrottler;
    validateThrottler: Throttler;
    private boundValidateAll;
    private validateAllThrottled;
    run(): void;
    /**
     * Called when the client starts initialization
     * @param params
     */
    onInitialize(params: InitializeParams): {
        capabilities: ServerCapabilities<any>;
    };
    private initialWorkspacesCreated;
    /**
     * Called when the client has finished initializing
     * @param params
     */
    private onInitialized;
    /**
     * Send a critical failure notification to the client, which should show a notification of some kind
     */
    private sendCriticalFailure;
    /**
     * Wait for all programs' first run to complete
     */
    private waitAllProgramFirstRuns;
    /**
     * Create project for each new workspace. If the workspace is already known,
     * it is skipped.
     * @param workspaceFolders
     */
    private createWorkspaces;
    /**
     * Event handler for when the program wants to load file contents.
     * anytime the program wants to load a file, check with our in-memory document cache first
     */
    private documentFileResolver;
    private getConfigFilePath;
    private createWorkspace;
    private createStandaloneFileWorkspace;
    private getWorkspaces;
    /**
     * Provide a list of completion items based on the current cursor position
     * @param textDocumentPosition
     */
    private onCompletion;
    /**
     * Provide a full completion item from the selection
     * @param item
     */
    private onCompletionResolve;
    private onCodeAction;
    /**
     * Reload all specified workspaces, or all workspaces if no workspaces are specified
     */
    private reloadWorkspaces;
    private getRootDir;
    /**
     * Sometimes users will alter their bsconfig files array, and will include standalone files.
     * If this is the case, those standalone workspaces should be removed because the file was
     * included in an actual program now.
     *
     * Sometimes files that used to be included are now excluded, so those open files need to be re-processed as standalone
     */
    private synchronizeStandaloneWorkspaces;
    private onDidChangeConfiguration;
    /**
     * Called when watched files changed (add/change/delete).
     * The CLIENT is in charge of what files to watch, so all client
     * implementations should ensure that all valid project
     * file types are watched (.brs,.bs,.xml,manifest, and any json/text/image files)
     * @param params
     */
    private onDidChangeWatchedFiles;
    /**
     * This only operates on files that match the specified files globs, so it is safe to throw
     * any file changes you receive with no unexpected side-effects
     * @param changes
     */
    handleFileChanges(workspace: Workspace, changes: {
        type: FileChangeType;
        pathAbsolute: string;
    }[]): Promise<void>;
    /**
     * This only operates on files that match the specified files globs, so it is safe to throw
     * any file changes you receive with no unexpected side-effects
     * @param changes
     */
    private handleFileChange;
    private onHover;
    private onDocumentClose;
    private validateTextDocument;
    private validateAll;
    onWorkspaceSymbol(params: WorkspaceSymbolParams): Promise<SymbolInformation[]>;
    onDocumentSymbol(params: DocumentSymbolParams): Promise<import("vscode-languageserver-types").DocumentSymbol[]>;
    private onDefinition;
    private onSignatureHelp;
    private onReferences;
    private onFullSemanticTokens;
    private diagnosticCollection;
    private sendDiagnostics;
    onExecuteCommand(params: ExecuteCommandParams): Promise<import("./Program").FileTranspileResult>;
    private transpileFile;
    dispose(): void;
}
export interface Workspace {
    firstRunPromise: Promise<any>;
    builder: ProgramBuilder;
    workspacePath: string;
    isFirstRunComplete: boolean;
    isFirstRunSuccessful: boolean;
    configFilePath?: string;
    isStandaloneFileWorkspace: boolean;
}
export declare enum CustomCommands {
    TranspileFile = "TranspileFile"
}

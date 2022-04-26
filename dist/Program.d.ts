import type { CodeAction, CompletionItem, Position, Range, SignatureInformation } from 'vscode-languageserver';
import { Location } from 'vscode-languageserver';
import type { BsConfig } from './BsConfig';
import { Scope } from './Scope';
import { BrsFile } from './files/BrsFile';
import { XmlFile } from './files/XmlFile';
import type { BsDiagnostic, File, FileReference, FileObj, BscFile, SemanticToken, FileLink } from './interfaces';
import { XmlScope } from './XmlScope';
import { Logger } from './Logger';
import PluginInterface from './PluginInterface';
import type { FunctionStatement, Statement } from './parser/Statement';
import type { SourceMapGenerator } from 'source-map';
export interface SourceObj {
    pathAbsolute: string;
    source: string;
    definitions?: string;
}
export interface TranspileObj {
    file: BscFile;
    outputPath: string;
}
export interface SignatureInfoObj {
    index: number;
    key: string;
    signature: SignatureInformation;
}
export declare class Program {
    /**
     * The root directory for this program
     */
    options: BsConfig;
    constructor(
    /**
     * The root directory for this program
     */
    options: BsConfig, logger?: Logger, plugins?: PluginInterface);
    logger: Logger;
    private createGlobalScope;
    /**
     * A graph of all files and their dependencies.
     * For example:
     *      File.xml -> [lib1.brs, lib2.brs]
     *      lib2.brs -> [lib3.brs] //via an import statement
     */
    private dependencyGraph;
    private diagnosticFilterer;
    /**
     * A scope that contains all built-in global functions.
     * All scopes should directly or indirectly inherit from this scope
     */
    globalScope: Scope;
    /**
     * Plugins which can provide extra diagnostics or transform AST
     */
    plugins: PluginInterface;
    /**
     * A set of diagnostics. This does not include any of the scope diagnostics.
     * Should only be set from `this.validate()`
     */
    private diagnostics;
    /**
     * The path to bslib.brs (the BrightScript runtime for certain BrighterScript features)
     */
    get bslibPkgPath(): string;
    get bslibPrefix(): "rokucommunity_bslib" | "bslib";
    /**
     * A map of every file loaded into this program, indexed by its original file location
     */
    files: Record<string, BscFile>;
    private pkgMap;
    private scopes;
    protected addScope(scope: Scope): void;
    /**
     * A map of every component currently loaded into the program, indexed by the component name.
     * It is a compile-time error to have multiple components with the same name. However, we store an array of components
     * by name so we can provide a better developer expreience. You shouldn't be directly accessing this array,
     * but if you do, only ever use the component at index 0.
     */
    private components;
    /**
     * Get the component with the specified name
     */
    getComponent(componentName: string): {
        file: XmlFile;
        scope: XmlScope;
    };
    /**
     * Register (or replace) the reference to a component in the component map
     */
    private registerComponent;
    /**
     * Remove the specified component from the components map
     */
    private unregisterComponent;
    /**
     * re-attach the dependency graph with a new key for any component who changed
     * their position in their own named array (only matters when there are multiple
     * components with the same name)
     */
    private syncComponentDependencyGraph;
    /**
     * Get a list of all files that are included in the project but are not referenced
     * by any scope in the program.
     */
    getUnreferencedFiles(): File[];
    /**
     * Get the list of errors for the entire program. It's calculated on the fly
     * by walking through every file, so call this sparingly.
     */
    getDiagnostics(): BsDiagnostic[];
    addDiagnostics(diagnostics: BsDiagnostic[]): void;
    /**
     * Determine if the specified file is loaded in this program right now.
     * @param filePath
     * @param normalizePath should the provided path be normalized before use
     */
    hasFile(filePath: string, normalizePath?: boolean): boolean;
    getPkgPath(...args: any[]): any;
    /**
     * roku filesystem is case INsensitive, so find the scope by key case insensitive
     * @param scopeName
     */
    getScopeByName(scopeName: string): Scope;
    /**
     * Return all scopes
     */
    getScopes(): Scope[];
    /**
     * Find the scope for the specified component
     */
    getComponentScope(componentName: string): XmlScope;
    /**
     * Update internal maps with this file reference
     */
    private assignFile;
    /**
     * Remove this file from internal maps
     */
    private unassignFile;
    /**
     * Load a file into the program. If that file already exists, it is replaced.
     * If file contents are provided, those are used, Otherwise, the file is loaded from the file system
     * @param srcPath the file path relative to the root dir
     * @param fileContents the file contents
     * @deprecated use `setFile` instead
     */
    addOrReplaceFile<T extends BscFile>(srcPath: string, fileContents: string): T;
    /**
     * Load a file into the program. If that file already exists, it is replaced.
     * @param fileEntry an object that specifies src and dest for the file.
     * @param fileContents the file contents. If not provided, the file will be loaded from disk
     * @deprecated use `setFile` instead
     */
    addOrReplaceFile<T extends BscFile>(fileEntry: FileObj, fileContents: string): T;
    /**
     * Load a file into the program. If that file already exists, it is replaced.
     * If file contents are provided, those are used, Otherwise, the file is loaded from the file system
     * @param srcDestOrPkgPath the absolute path, the pkg path (i.e. `pkg:/path/to/file.brs`), or the destPath (i.e. `path/to/file.brs` relative to `pkg:/`)
     * @param fileContents the file contents
     */
    setFile<T extends BscFile>(srcDestOrPkgPath: string, fileContents: string): T;
    /**
     * Load a file into the program. If that file already exists, it is replaced.
     * @param fileEntry an object that specifies src and dest for the file.
     * @param fileContents the file contents. If not provided, the file will be loaded from disk
     */
    setFile<T extends BscFile>(fileEntry: FileObj, fileContents: string): T;
    /**
     * Ensure source scope is created.
     * Note: automatically called internally, and no-op if it exists already.
     */
    createSourceScope(): void;
    /**
     * Find the file by its absolute path. This is case INSENSITIVE, since
     * Roku is a case insensitive file system. It is an error to have multiple files
     * with the same path with only case being different.
     * @param pathAbsolute
     * @deprecated use `getFile` instead, which auto-detects the path type
     */
    getFileByPathAbsolute<T extends BrsFile | XmlFile>(pathAbsolute: string): T;
    /**
     * Get a list of files for the given (platform-normalized) pkgPath array.
     * Missing files are just ignored.
     * @deprecated use `getFiles` instead, which auto-detects the path types
     */
    getFilesByPkgPaths<T extends BscFile[]>(pkgPaths: string[]): T;
    /**
     * Get a file with the specified (platform-normalized) pkg path.
     * If not found, return undefined
     * @deprecated use `getFile` instead, which auto-detects the path type
     */
    getFileByPkgPath<T extends BscFile>(pkgPath: string): T;
    /**
     * Remove a set of files from the program
     * @param filePaths can be an array of srcPath or destPath strings
     * @param normalizePath should this function repair and standardize the filePaths? Passing false should have a performance boost if you can guarantee your paths are already sanitized
     */
    removeFiles(srcPaths: string[], normalizePath?: boolean): void;
    /**
     * Remove a file from the program
     * @param filePath can be a srcPath, a pkgPath, or a destPath (same as pkgPath but without `pkg:/`)
     * @param normalizePath should this function repair and standardize the path? Passing false should have a performance boost if you can guarantee your path is already sanitized
     */
    removeFile(filePath: string, normalizePath?: boolean): void;
    /**
     * Traverse the entire project, and validate all scopes
     * @param force - if true, then all scopes are force to validate, even if they aren't marked as dirty
     */
    validate(): void;
    /**
     * Flag all duplicate component names
     */
    private detectDuplicateComponentNames;
    /**
     * Determine if the given file is included in at least one scope in this program
     */
    private fileIsIncludedInAnyScope;
    /**
     * Get the files for a list of filePaths
     * @param filePaths can be an array of srcPath or a destPath strings
     * @param normalizePath should this function repair and standardize the paths? Passing false should have a performance boost if you can guarantee your paths are already sanitized
     */
    getFiles<T extends BscFile>(filePaths: string[], normalizePath?: boolean): T[];
    /**
     * Get the file at the given path
     * @param filePath can be a srcPath or a destPath
     * @param normalizePath should this function repair and standardize the path? Passing false should have a performance boost if you can guarantee your path is already sanitized
     */
    getFile<T extends BscFile>(filePath: string, normalizePath?: boolean): T;
    /**
     * Get a list of all scopes the file is loaded into
     * @param file
     */
    getScopesForFile(file: XmlFile | BrsFile): Scope[];
    /**
     * Get the first found scope for a file.
     */
    getFirstScopeForFile(file: XmlFile | BrsFile): Scope;
    getStatementsByName(name: string, originFile: BrsFile, namespaceName?: string): FileLink<Statement>[];
    getStatementsForXmlFile(scope: XmlScope, filterName?: string): FileLink<FunctionStatement>[];
    /**
     * Find all available completion items at the given position
     * @param filePath can be a srcPath or a destPath
     * @param position the position (line & column) where completions should be found
     */
    getCompletions(filePath: string, position: Position): CompletionItem[];
    /**
     * Goes through each file and builds a list of workspace symbols for the program. Used by LanguageServer's onWorkspaceSymbol functionality
     */
    getWorkspaceSymbols(): import("vscode-languageserver-types").SymbolInformation[];
    /**
     * Given a position in a file, if the position is sitting on some type of identifier,
     * go to the definition of that identifier (where this thing was first defined)
     */
    getDefinition(pathAbsolute: string, position: Position): Location[];
    getHover(pathAbsolute: string, position: Position): Promise<import("vscode-languageserver-types").Hover>;
    /**
     * Compute code actions for the given file and range
     */
    getCodeActions(pathAbsolute: string, range: Range): CodeAction[];
    /**
     * Get semantic tokens for the specified file
     */
    getSemanticTokens(srcPath: string): SemanticToken[];
    getSignatureHelp(filepath: string, position: Position): SignatureInfoObj[];
    private getPartialStatementInfo;
    private getPartialItemCounts;
    getReferences(pathAbsolute: string, position: Position): Location[] | Promise<Location[]>;
    /**
     * Get a list of all script imports, relative to the specified pkgPath
     * @param sourcePkgPath - the pkgPath of the source that wants to resolve script imports.
     */
    getScriptImportCompletions(sourcePkgPath: string, scriptImport: FileReference): CompletionItem[];
    /**
     * Transpile a single file and get the result as a string.
     * This does not write anything to the file system.
     * @param filePath can be a srcPath or a destPath
     */
    getTranspiledFileContents(filePath: string): FileTranspileResult;
    /**
     * Internal function used to transpile files.
     * This does not write anything to the file system
     */
    private _getTranspiledFileContents;
    transpile(fileEntries: FileObj[], stagingFolderPath: string): Promise<void>;
    /**
     * Find a list of files in the program that have a function with the given name (case INsensitive)
     */
    findFilesForFunction(functionName: string): BscFile[];
    /**
     * Find a list of files in the program that have a class with the given name (case INsensitive)
     */
    findFilesForClass(className: string): BscFile[];
    /**
     * Get a map of the manifest information
     */
    getManifest(): Map<string, string>;
    private _manifest;
    dispose(): void;
}
export interface FileTranspileResult {
    pathAbsolute: string;
    pkgPath: string;
    code: string;
    map: SourceMapGenerator;
    typedef: string;
}

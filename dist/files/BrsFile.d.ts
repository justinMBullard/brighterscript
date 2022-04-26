import type { CodeWithSourceMap } from 'source-map';
import type { CompletionItem, Hover, Position } from 'vscode-languageserver';
import { Location, SignatureInformation, DocumentSymbol, SymbolInformation } from 'vscode-languageserver';
import type { Scope } from '../Scope';
import { FunctionScope } from '../FunctionScope';
import type { Callable, CommentFlag, FunctionCall, BsDiagnostic, FileReference, FileLink } from '../interfaces';
import type { Token } from '../lexer/Token';
import { TokenKind } from '../lexer/TokenKind';
import { Parser, ParseMode } from '../parser/Parser';
import type { FunctionExpression, Expression } from '../parser/Expression';
import type { ClassStatement, NamespaceStatement, Statement } from '../parser/Statement';
import type { Program, SignatureInfoObj } from '../Program';
import type { DependencyGraph } from '../DependencyGraph';
/**
 * Holds all details about this file within the scope of the whole program
 */
export declare class BrsFile {
    pathAbsolute: string;
    /**
     * The full pkg path to this file
     */
    pkgPath: string;
    program: Program;
    constructor(pathAbsolute: string, 
    /**
     * The full pkg path to this file
     */
    pkgPath: string, program: Program);
    /**
     * The parseMode used for the parser for this file
     */
    parseMode: ParseMode;
    /**
     * The key used to identify this file in the dependency graph
     */
    dependencyGraphKey: string;
    /**
     * Indicates whether this file needs to be validated.
     * Files are only ever validated a single time
     */
    isValidated: boolean;
    /**
     * The all-lowercase extension for this file (including the leading dot)
     */
    extension: string;
    private diagnostics;
    getDiagnostics(): BsDiagnostic[];
    addDiagnostics(diagnostics: BsDiagnostic[]): void;
    commentFlags: CommentFlag[];
    callables: Callable[];
    functionCalls: FunctionCall[];
    private _functionScopes;
    get functionScopes(): FunctionScope[];
    /**
     * files referenced by import statements
     */
    get ownScriptImports(): FileReference[];
    /**
     * Does this file need to be transpiled?
     */
    needsTranspiled: boolean;
    /**
     * The AST for this file
     */
    get ast(): import("../parser/Statement").Body;
    private documentSymbols;
    private workspaceSymbols;
    /**
     * Get the token at the specified position
     * @param position
     */
    getTokenAt(position: Position): Token;
    get parser(): Parser;
    private _parser;
    fileContents: string;
    /**
     * If this is a typedef file
     */
    isTypedef: boolean;
    /**
     * The key to find the typedef file in the program's files map.
     * A falsey value means this file is ineligable for a typedef
     */
    typedefKey?: string;
    /**
     * If the file was given type definitions during parse
     */
    hasTypedef: any;
    /**
     * A reference to the typedef file (if one exists)
     */
    typedefFile?: BrsFile;
    /**
     * An unsubscribe function for the dependencyGraph subscription
     */
    private unsubscribeFromDependencyGraph;
    /**
     * Find and set the typedef variables (if a matching typedef file exists)
     */
    private resolveTypedef;
    /**
     * Attach the file to the dependency graph so it can monitor changes.
     * Also notify the dependency graph of our current dependencies so other dependents can be notified.
     */
    attachDependencyGraph(dependencyGraph: DependencyGraph): void;
    /**
     * Calculate the AST for this file
     * @param fileContents
     */
    parse(fileContents: string): void;
    validate(): void;
    private validateImportStatements;
    /**
     * Find a class. This scans all scopes for this file, and returns the first matching class that is found.
     * Returns undefined if not found.
     * @param className - The class name, including the namespace of the class if possible
     * @param containingNamespace - The namespace used to resolve relative class names. (i.e. the namespace around the current statement trying to find a class)
     * @returns the first class in the first scope found, or undefined if not found
     */
    getClassFileLink(className: string, containingNamespace?: string): FileLink<ClassStatement>;
    findPropertyNameCompletions(): CompletionItem[];
    private _propertyNameCompletions;
    get propertyNameCompletions(): CompletionItem[];
    /**
     * Find all comment flags in the source code. These enable or disable diagnostic messages.
     * @param lines - the lines of the program
     */
    getCommentFlags(tokens: Token[]): void;
    scopesByFunc: Map<FunctionExpression, FunctionScope>;
    /**
     * Create a scope for every function in this file
     */
    private createFunctionScopes;
    private getBscTypeFromAssignment;
    private getCallableByName;
    private findCallables;
    private findFunctionCalls;
    /**
     * Find the function scope at the given position.
     * @param position
     * @param functionScopes
     */
    getFunctionScopeAtPosition(position: Position, functionScopes?: FunctionScope[]): FunctionScope;
    /**
     * Find the NamespaceStatement enclosing the given position
     * @param position
     * @param functionScopes
     */
    getNamespaceStatementForPosition(position: Position): NamespaceStatement;
    /**
     * Get completions available at the given cursor. This aggregates all values from this file and the current scope.
     */
    getCompletions(position: Position, scope?: Scope): CompletionItem[];
    private getLabelCompletion;
    private getClassMemberCompletions;
    getClassFromMReference(position: Position, currentToken: Token, functionScope: FunctionScope): FileLink<ClassStatement> | undefined;
    private getGlobalClassStatementCompletions;
    private getNonNamespacedEnumStatementCompletions;
    private getEnumMemberStatementCompletions;
    private getNamespaceCompletions;
    private getNamespaceDefinitions;
    /**
     * Given a current token, walk
     */
    getPartialVariableName(currentToken: Token, excludeTokens?: TokenKind[]): string;
    isPositionNextToTokenKind(position: Position, tokenKind: TokenKind): boolean;
    private getTokenBefore;
    private tokenFollows;
    getTokensUntil(currentToken: Token, tokenKind: TokenKind, direction?: -1 | 1): any[];
    getPreviousToken(token: Token): Token;
    /**
     * Find the first scope that has a namespace with this name.
     * Returns false if no namespace was found with that name
     */
    calleeStartsWithNamespace(callee: Expression): boolean;
    /**
     * Determine if the callee (i.e. function name) is a known function declared on the given namespace.
     */
    calleeIsKnownNamespaceFunction(callee: Expression, namespaceName: string): boolean;
    /**
     * Get the token closest to the position. if no token is found, the previous token is returned
     * @param position
     * @param tokens
     */
    getClosestToken(position: Position): Token;
    /**
     * Builds a list of document symbols for this file. Used by LanguageServer's onDocumentSymbol functionality
     */
    getDocumentSymbols(): DocumentSymbol[];
    /**
     * Builds a list of workspace symbols for this file. Used by LanguageServer's onWorkspaceSymbol functionality
     */
    getWorkspaceSymbols(): SymbolInformation[];
    /**
     * Builds a single DocumentSymbol object for use by LanguageServer's onDocumentSymbol functionality
     */
    private getDocumentSymbol;
    /**
     * Builds a single SymbolInformation object for use by LanguageServer's onWorkspaceSymbol functionality
     */
    private generateWorkspaceSymbols;
    /**
     * Given a position in a file, if the position is sitting on some type of identifier,
     * go to the definition of that identifier (where this thing was first defined)
     */
    getDefinition(position: Position): Location[];
    getClassMemberDefinitions(textToSearchFor: string, file: BrsFile): Location[];
    getHover(position: Position): Hover;
    /**
     * Build a hover documentation for a callable.
     */
    private getCallableDocumentation;
    getSignatureHelpForNamespaceMethods(callableName: string, dottedGetText: string, scope: Scope): {
        key: string;
        signature: SignatureInformation;
    }[];
    getSignatureHelpForStatement(statement: Statement): SignatureInfoObj;
    private getClassMethod;
    getClassSignatureHelp(classStatement: ClassStatement): SignatureInfoObj | undefined;
    getReferences(position: Position): Location[];
    /**
     * Convert the brightscript/brighterscript source code into valid brightscript
     */
    transpile(): CodeWithSourceMap;
    getTypedef(): string;
    dispose(): void;
}
/**
 * List of completions for all valid keywords/reserved words.
 * Build this list once because it won't change for the lifetime of this process
 */
export declare const KeywordCompletions: CompletionItem[];

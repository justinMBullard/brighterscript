import * as rokuDeploy from 'roku-deploy';
import type { Diagnostic, Position, Range } from 'vscode-languageserver';
import type { BsConfig } from './BsConfig';
import type { CallableContainer, BsDiagnostic, FileReference, CallableContainerMap, CompilerPlugin, ExpressionInfo } from './interfaces';
import { BooleanType } from './types/BooleanType';
import { DoubleType } from './types/DoubleType';
import { DynamicType } from './types/DynamicType';
import { FloatType } from './types/FloatType';
import { FunctionType } from './types/FunctionType';
import { IntegerType } from './types/IntegerType';
import { InvalidType } from './types/InvalidType';
import { LongIntegerType } from './types/LongIntegerType';
import { ObjectType } from './types/ObjectType';
import { StringType } from './types/StringType';
import { VoidType } from './types/VoidType';
import type { DottedGetExpression, Expression, VariableExpression } from './parser/Expression';
import type { Locatable, Token } from './lexer/Token';
import { CustomType } from './types/CustomType';
import { SourceNode } from 'source-map';
import type { SGAttribute } from './parser/SGTypes';
export declare class Util {
    clearConsole(): void;
    /**
     * Determine if the file exists
     * @param filePath
     */
    pathExists(filePath: string | undefined): Promise<boolean>;
    /**
     * Determine if the file exists
     * @param filePath
     */
    pathExistsSync(filePath: string | undefined): boolean;
    /**
     * Determine if this path is a directory
     */
    isDirectorySync(dirPath: string | undefined): boolean;
    /**
     * Given a pkg path of any kind, transform it to a roku-specific pkg path (i.e. "pkg:/some/path.brs")
     */
    sanitizePkgPath(pkgPath: string): string;
    /**
     * Determine if the given path starts with a protocol
     */
    startsWithProtocol(path: string): boolean;
    /**
     * Given a pkg path of any kind, transform it to a roku-specific pkg path (i.e. "pkg:/some/path.brs")
     */
    getRokuPkgPath(pkgPath: string): string;
    /**
     * Given a path to a file/directory, replace all path separators with the current system's version.
     * @param filePath
     */
    pathSepNormalize(filePath: string, separator?: string): string;
    /**
     * Find the path to the config file.
     * If the config file path doesn't exist
     * @param configFilePath
     */
    getConfigFilePath(cwd?: string): string;
    getRangeFromOffsetLength(text: string, offset: number, length: number): Range;
    /**
     * Load the contents of a config file.
     * If the file extends another config, this will load the base config as well.
     * @param configFilePath
     * @param parentProjectPaths
     */
    loadConfigFile(configFilePath: string, parentProjectPaths?: string[], cwd?: string): BsConfig;
    /**
     * Convert relative paths to absolute paths, relative to the given directory. Also de-dupes the paths. Modifies the array in-place
     * @param paths the list of paths to be resolved and deduped
     * @param relativeDir the path to the folder where the paths should be resolved relative to. This should be an absolute path
     */
    resolvePathsRelativeTo(collection: any, key: string, relativeDir: string): void;
    /**
     * Do work within the scope of a changed current working directory
     * @param targetCwd
     * @param callback
     */
    cwdWork<T>(targetCwd: string | null | undefined, callback: () => T): T;
    /**
     * Given a BsConfig object, start with defaults,
     * merge with bsconfig.json and the provided options.
     * @param config
     */
    normalizeAndResolveConfig(config: BsConfig): BsConfig;
    /**
     * Set defaults for any missing items
     * @param config
     */
    normalizeConfig(config: BsConfig): BsConfig;
    /**
     * Get the root directory from options.
     * Falls back to options.cwd.
     * Falls back to process.cwd
     * @param options
     */
    getRootDir(options: BsConfig): string;
    /**
     * Format a string with placeholders replaced by argument indexes
     * @param subject
     * @param params
     */
    stringFormat(subject: string, ...args: any[]): string;
    /**
     * Given a list of callables as a dictionary indexed by their full name (namespace included, transpiled to underscore-separated.
     * @param callables
     */
    getCallableContainersByLowerName(callables: CallableContainer[]): CallableContainerMap;
    /**
     * Split a file by newline characters (LF or CRLF)
     * @param text
     */
    getLines(text: string): string[];
    /**
     * Given an absolute path to a source file, and a target path,
     * compute the pkg path for the target relative to the source file's location
     * @param containingFilePathAbsolute
     * @param targetPath
     */
    getPkgPathFromTarget(containingFilePathAbsolute: string, targetPath: string): string;
    /**
     * Compute the relative path from the source file to the target file
     * @param pkgSourcePathAbsolute  - the absolute path to the source relative to the package location
     * @param pkgTargetPathAbsolute  - the absolute path ro the target relative to the package location
     */
    getRelativePath(pkgSourcePathAbsolute: string, pkgTargetPathAbsolute: string): string;
    /**
     * Walks left in a DottedGetExpression and returns a VariableExpression if found, or undefined if not found
     */
    findBeginningVariableExpression(dottedGet: DottedGetExpression): VariableExpression | undefined;
    /**
     * Does a touch b in any way?
     */
    rangesIntersect(a: Range, b: Range): boolean;
    /**
     * Test if `position` is in `range`. If the position is at the edges, will return true.
     * Adapted from core vscode
     * @param range
     * @param position
     */
    rangeContains(range: Range, position: Position): boolean;
    comparePositionToRange(position: Position, range: Range): 1 | -1 | 0;
    /**
     * Parse an xml file and get back a javascript object containing its results
     * @param text
     */
    parseXml(text: string): Promise<any>;
    propertyCount(object: Record<string, unknown>): number;
    padLeft(subject: string, totalLength: number, char: string): string;
    /**
     * Given a URI, convert that to a regular fs path
     * @param uri
     */
    uriToPath(uri: string): string;
    /**
     * Force the drive letter to lower case
     * @param fullPath
     */
    driveLetterToLower(fullPath: string): string;
    /**
     * Determine if two arrays containing primitive values are equal.
     * This considers order and compares by equality.
     */
    areArraysEqual(arr1: any[], arr2: any[]): boolean;
    /**
     * Given a file path, convert it to a URI string
     */
    pathToUri(pathAbsolute: string): string;
    /**
     * Get the outDir from options, taking into account cwd and absolute outFile paths
     * @param options
     */
    getOutDir(options: BsConfig): string;
    /**
     * Get paths to all files on disc that match this project's source list
     */
    getFilePaths(options: BsConfig): Promise<rokuDeploy.StandardizedFileEntry[]>;
    /**
     * Given a path to a brs file, compute the path to a theoretical d.bs file.
     * Only `.brs` files can have typedef path, so return undefined for everything else
     */
    getTypedefPath(brsSrcPath: string): string;
    /**
     * Determine whether this diagnostic should be supressed or not, based on brs comment-flags
     * @param diagnostic
     */
    diagnosticIsSuppressed(diagnostic: BsDiagnostic): boolean;
    /**
     * Walks up the chain
     * @param currentPath
     */
    findClosestConfigFile(currentPath: string): Promise<string>;
    /**
     * Set a timeout for the specified milliseconds, and resolve the promise once the timeout is finished.
     * @param milliseconds
     */
    sleep(milliseconds: number): Promise<unknown>;
    /**
     * Given an array, map and then flatten
     * @param arr
     * @param cb
     */
    flatMap<T, R>(array: T[], cb: (arg: T) => R): R;
    /**
     * Determines if the position is greater than the range. This means
     * the position does not touch the range, and has a position greater than the end
     * of the range. A position that touches the last line/char of a range is considered greater
     * than the range, because the `range.end` is EXclusive
     */
    positionIsGreaterThanRange(position: Position, range: Range): boolean;
    /**
     * Get a location object back by extracting location information from other objects that contain location
     */
    getRange(startObj: {
        range: Range;
    }, endObj: {
        range: Range;
    }): Range;
    /**
     * If the two items both start on the same line
     */
    sameStartLine(first: {
        range: Range;
    }, second: {
        range: Range;
    }): boolean;
    /**
     * If the two items have lines that touch
     * @param first
     * @param second
     */
    linesTouch(first: {
        range: Range;
    }, second: {
        range: Range;
    }): boolean;
    /**
     * Given text with (or without) dots separating text, get the rightmost word.
     * (i.e. given "A.B.C", returns "C". or "B" returns "B because there's no dot)
     */
    getTextAfterFinalDot(name: string): string;
    /**
     * Find a script import that the current position touches, or undefined if not found
     */
    getScriptImportAtPosition(scriptImports: FileReference[], position: Position): FileReference;
    /**
     * Given the class name text, return a namespace-prefixed name.
     * If the name already has a period in it, or the namespaceName was not provided, return the class name as is.
     * If the name does not have a period, and a namespaceName was provided, return the class name prepended by the namespace name.
     * If no namespace is provided, return the `className` unchanged.
     */
    getFullyQualifiedClassName(className: string, namespaceName?: string): string;
    splitIntoLines(string: string): string[];
    getTextForRange(string: string | string[], range: Range): string;
    /**
     * Helper for creating `Range` objects. Prefer using this function because vscode-languageserver's `util.createRange()` is significantly slower
     */
    createRange(startLine: number, startCharacter: number, endLine: number, endCharacter: number): Range;
    /**
     * Create a `Range` from two `Position`s
     */
    createRangeFromPositions(startPosition: Position, endPosition: Position): Range;
    /**
     * Given a list of ranges, create a range that starts with the first non-null lefthand range, and ends with the first non-null
     * righthand range. Returns undefined if none of the items have a range.
     */
    createBoundingRange(...locatables: Array<{
        range?: Range;
    }>): Range;
    /**
     * Create a `Position` object. Prefer this over `Position.create` for performance reasons
     */
    createPosition(line: number, character: number): {
        line: number;
        character: number;
    };
    /**
     * Convert a list of tokens into a string, including their leading whitespace
     */
    tokensToString(tokens: Token[]): string;
    /**
     * Convert a token into a BscType
     */
    tokenToBscType(token: Token, allowCustomType?: boolean): DynamicType | BooleanType | LongIntegerType | IntegerType | FloatType | DoubleType | FunctionType | InvalidType | ObjectType | StringType | VoidType | CustomType;
    /**
     * Get the extension for the given file path. Basically the part after the final dot, except for
     * `d.bs` which is treated as single extension
     */
    getExtension(filePath: string): string;
    /**
     * Load and return the list of plugins
     */
    loadPlugins(cwd: string, pathOrModules: string[], onError?: (pathOrModule: string, err: Error) => void): CompilerPlugin[];
    resolveRequire(cwd: string, pathOrModule: string): any;
    /**
     * Gathers expressions, variables, and unique names from an expression.
     * This is mostly used for the ternary expression
     */
    getExpressionInfo(expression: Expression): ExpressionInfo;
    /**
     * Create a SourceNode that maps every line to itself. Useful for creating maps for files
     * that haven't changed at all, but we still need the map
     */
    simpleMap(source: string, src: string): SourceNode;
    /**
     * Creates a new SGAttribute object, but keeps the existing Range references (since those shouldn't ever get changed directly)
     */
    cloneSGAttribute(attr: SGAttribute, value: string): SGAttribute;
    /**
     * Converts a path into a standardized format (drive letter to lower, remove extra slashes, use single slash type, resolve relative parts, etc...)
     */
    standardizePath(thePath: string): string;
    /**
     * Copy the version of bslib from local node_modules to the staging folder
     */
    copyBslibToStaging(stagingDir: string): Promise<void>;
    /**
     * Given a Diagnostic or BsDiagnostic, return a copy of the diagnostic
     */
    toDiagnostic(diagnostic: Diagnostic | BsDiagnostic): {
        severity: import("vscode-languageserver-types").DiagnosticSeverity;
        range: Range;
        message: string;
        relatedInformation: {
            location: import("vscode-languageserver-types").Location;
            message: string;
        }[];
        code: string | number;
        source: string;
    };
    /**
     * Sort an array of objects that have a Range
     */
    sortByRange(locatables: Locatable[]): Locatable[];
    /**
     * Split the given text and return ranges for each chunk.
     * Only works for single-line strings
     */
    splitGetRange(separator: string, text: string, range: Range): {
        text: string;
        range: Range;
    }[];
    /**
     * Wrap the given code in a markdown code fence (with the language)
     */
    mdFence(code: string, language?: string): string;
    /**
     * Gets each part of the dotted get.
     * @param expression
     * @returns an array of the parts of the dotted get. If not fully a dotted get, then returns undefined
     */
    getAllDottedGetParts(expression: Expression): string[] | undefined;
    /**
     * Returns an integer if valid, or undefined. Eliminates checking for NaN
     */
    parseInt(value: any): number;
    /**
     * Converts a range to a string in the format 1:2-3:4
     */
    rangeToString(range: Range): string;
}
/**
 * A tagged template literal function for standardizing the path. This has to be defined as standalone function since it's a tagged template literal function,
 * we can't use `object.tag` syntax.
 */
export declare function standardizePath(stringParts: any, ...expressions: any[]): string;
export declare let util: Util;
export default util;

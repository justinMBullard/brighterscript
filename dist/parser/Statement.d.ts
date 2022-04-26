import type { Token, Identifier } from '../lexer/Token';
import { TokenKind } from '../lexer/TokenKind';
import type { Expression, NamespacedVariableNameExpression, FunctionExpression, AnnotationExpression, FunctionParameterExpression } from './Expression';
import type { Range } from 'vscode-languageserver';
import type { BrsTranspileState } from './BrsTranspileState';
import { ParseMode } from './Parser';
import type { WalkVisitor, WalkOptions } from '../astUtils/visitors';
import { InternalWalkMode } from '../astUtils/visitors';
import type { TranspileResult, TypedefProvider } from '../interfaces';
import type { BscType } from '../types/BscType';
import type { SourceNode } from 'source-map';
import type { TranspileState } from './TranspileState';
/**
 * A BrightScript statement
 */
export declare abstract class Statement {
    /**
     *  The starting and ending location of the statement.
     **/
    abstract range: Range;
    /**
     * Statement annotations
     */
    annotations: AnnotationExpression[];
    abstract transpile(state: BrsTranspileState): TranspileResult;
    /**
     * When being considered by the walk visitor, this describes what type of element the current class is.
     */
    visitMode: InternalWalkMode;
    abstract walk(visitor: WalkVisitor, options: WalkOptions): any;
}
export declare class EmptyStatement extends Statement {
    /**
     * Create a negative range to indicate this is an interpolated location
     */
    range: Range;
    constructor(
    /**
     * Create a negative range to indicate this is an interpolated location
     */
    range?: Range);
    transpile(state: BrsTranspileState): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
/**
 * This is a top-level statement. Consider this the root of the AST
 */
export declare class Body extends Statement implements TypedefProvider {
    statements: Statement[];
    constructor(statements?: Statement[]);
    get range(): Range;
    transpile(state: BrsTranspileState): TranspileResult;
    getTypedef(state: BrsTranspileState): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class AssignmentStatement extends Statement {
    readonly equals: Token;
    readonly name: Identifier;
    readonly value: Expression;
    readonly containingFunction: FunctionExpression;
    constructor(equals: Token, name: Identifier, value: Expression, containingFunction: FunctionExpression);
    readonly range: Range;
    transpile(state: BrsTranspileState): TranspileResult;
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class Block extends Statement {
    readonly statements: Statement[];
    readonly startingRange: Range;
    constructor(statements: Statement[], startingRange: Range);
    readonly range: Range;
    transpile(state: BrsTranspileState): TranspileResult;
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class ExpressionStatement extends Statement {
    readonly expression: Expression;
    constructor(expression: Expression);
    readonly range: Range;
    transpile(state: BrsTranspileState): TranspileResult;
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class CommentStatement extends Statement implements Expression, TypedefProvider {
    comments: Token[];
    constructor(comments: Token[]);
    range: Range;
    get text(): string;
    transpile(state: BrsTranspileState): any[];
    getTypedef(state: TranspileState): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class ExitForStatement extends Statement {
    readonly tokens: {
        exitFor: Token;
    };
    constructor(tokens: {
        exitFor: Token;
    });
    readonly range: Range;
    transpile(state: BrsTranspileState): (string | SourceNode)[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class ExitWhileStatement extends Statement {
    readonly tokens: {
        exitWhile: Token;
    };
    constructor(tokens: {
        exitWhile: Token;
    });
    readonly range: Range;
    transpile(state: BrsTranspileState): (string | SourceNode)[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class FunctionStatement extends Statement implements TypedefProvider {
    name: Identifier;
    func: FunctionExpression;
    namespaceName: NamespacedVariableNameExpression;
    constructor(name: Identifier, func: FunctionExpression, namespaceName: NamespacedVariableNameExpression);
    readonly range: Range;
    /**
     * Get the name of this expression based on the parse mode
     */
    getName(parseMode: ParseMode): string;
    transpile(state: BrsTranspileState): any[];
    getTypedef(state: BrsTranspileState): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class IfStatement extends Statement {
    readonly tokens: {
        if: Token;
        then?: Token;
        else?: Token;
        endIf?: Token;
    };
    readonly condition: Expression;
    readonly thenBranch: Block;
    readonly elseBranch?: IfStatement | Block;
    readonly isInline?: boolean;
    constructor(tokens: {
        if: Token;
        then?: Token;
        else?: Token;
        endIf?: Token;
    }, condition: Expression, thenBranch: Block, elseBranch?: IfStatement | Block, isInline?: boolean);
    readonly range: Range;
    transpile(state: BrsTranspileState): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class IncrementStatement extends Statement {
    readonly value: Expression;
    readonly operator: Token;
    constructor(value: Expression, operator: Token);
    readonly range: Range;
    transpile(state: BrsTranspileState): (string | SourceNode)[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
/** Used to indent the current `print` position to the next 16-character-width output zone. */
export interface PrintSeparatorTab extends Token {
    kind: TokenKind.Comma;
}
/** Used to insert a single whitespace character at the current `print` position. */
export interface PrintSeparatorSpace extends Token {
    kind: TokenKind.Semicolon;
}
/**
 * Represents a `print` statement within BrightScript.
 */
export declare class PrintStatement extends Statement {
    readonly tokens: {
        print: Token;
    };
    readonly expressions: Array<Expression | PrintSeparatorTab | PrintSeparatorSpace>;
    /**
     * Creates a new internal representation of a BrightScript `print` statement.
     * @param expressions an array of expressions or `PrintSeparator`s to be
     *                    evaluated and printed.
     */
    constructor(tokens: {
        print: Token;
    }, expressions: Array<Expression | PrintSeparatorTab | PrintSeparatorSpace>);
    readonly range: Range;
    transpile(state: BrsTranspileState): (string | SourceNode)[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class DimStatement extends Statement {
    dimToken: Token;
    identifier?: Identifier;
    openingSquare?: Token;
    dimensions?: Expression[];
    closingSquare?: Token;
    constructor(dimToken: Token, identifier?: Identifier, openingSquare?: Token, dimensions?: Expression[], closingSquare?: Token);
    range: Range;
    transpile(state: BrsTranspileState): (string | SourceNode)[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class GotoStatement extends Statement {
    readonly tokens: {
        goto: Token;
        label: Token;
    };
    constructor(tokens: {
        goto: Token;
        label: Token;
    });
    readonly range: Range;
    transpile(state: BrsTranspileState): (string | SourceNode)[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class LabelStatement extends Statement {
    readonly tokens: {
        identifier: Token;
        colon: Token;
    };
    constructor(tokens: {
        identifier: Token;
        colon: Token;
    });
    readonly range: Range;
    transpile(state: BrsTranspileState): (string | SourceNode)[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class ReturnStatement extends Statement {
    readonly tokens: {
        return: Token;
    };
    readonly value?: Expression;
    constructor(tokens: {
        return: Token;
    }, value?: Expression);
    readonly range: Range;
    transpile(state: BrsTranspileState): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class EndStatement extends Statement {
    readonly tokens: {
        end: Token;
    };
    constructor(tokens: {
        end: Token;
    });
    readonly range: Range;
    transpile(state: BrsTranspileState): (string | SourceNode)[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class StopStatement extends Statement {
    readonly tokens: {
        stop: Token;
    };
    constructor(tokens: {
        stop: Token;
    });
    readonly range: Range;
    transpile(state: BrsTranspileState): (string | SourceNode)[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class ForStatement extends Statement {
    forToken: Token;
    counterDeclaration: AssignmentStatement;
    toToken: Token;
    finalValue: Expression;
    body: Block;
    endForToken: Token;
    stepToken?: Token;
    increment?: Expression;
    constructor(forToken: Token, counterDeclaration: AssignmentStatement, toToken: Token, finalValue: Expression, body: Block, endForToken: Token, stepToken?: Token, increment?: Expression);
    readonly range: Range;
    transpile(state: BrsTranspileState): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class ForEachStatement extends Statement {
    readonly tokens: {
        forEach: Token;
        in: Token;
        endFor: Token;
    };
    readonly item: Token;
    readonly target: Expression;
    readonly body: Block;
    constructor(tokens: {
        forEach: Token;
        in: Token;
        endFor: Token;
    }, item: Token, target: Expression, body: Block);
    readonly range: Range;
    transpile(state: BrsTranspileState): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class WhileStatement extends Statement {
    readonly tokens: {
        while: Token;
        endWhile: Token;
    };
    readonly condition: Expression;
    readonly body: Block;
    constructor(tokens: {
        while: Token;
        endWhile: Token;
    }, condition: Expression, body: Block);
    readonly range: Range;
    transpile(state: BrsTranspileState): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class DottedSetStatement extends Statement {
    readonly obj: Expression;
    readonly name: Identifier;
    readonly value: Expression;
    constructor(obj: Expression, name: Identifier, value: Expression);
    readonly range: Range;
    transpile(state: BrsTranspileState): TranspileResult;
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class IndexedSetStatement extends Statement {
    readonly obj: Expression;
    readonly index: Expression;
    readonly value: Expression;
    readonly openingSquare: Token;
    readonly closingSquare: Token;
    constructor(obj: Expression, index: Expression, value: Expression, openingSquare: Token, closingSquare: Token);
    readonly range: Range;
    transpile(state: BrsTranspileState): TranspileResult;
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class LibraryStatement extends Statement implements TypedefProvider {
    readonly tokens: {
        library: Token;
        filePath: Token | undefined;
    };
    constructor(tokens: {
        library: Token;
        filePath: Token | undefined;
    });
    readonly range: Range;
    transpile(state: BrsTranspileState): any[];
    getTypedef(state: BrsTranspileState): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class NamespaceStatement extends Statement implements TypedefProvider {
    keyword: Token;
    nameExpression: NamespacedVariableNameExpression;
    body: Body;
    endKeyword: Token;
    constructor(keyword: Token, nameExpression: NamespacedVariableNameExpression, body: Body, endKeyword: Token);
    /**
     * The string name for this namespace
     */
    name: string;
    get range(): Range;
    getName(parseMode: ParseMode): string;
    transpile(state: BrsTranspileState): TranspileResult;
    getTypedef(state: BrsTranspileState): string[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class ImportStatement extends Statement implements TypedefProvider {
    readonly importToken: Token;
    readonly filePathToken: Token;
    constructor(importToken: Token, filePathToken: Token);
    filePath: string;
    range: Range;
    transpile(state: BrsTranspileState): (string | SourceNode)[];
    /**
     * Get the typedef for this statement
     */
    getTypedef(state: BrsTranspileState): string[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class InterfaceStatement extends Statement implements TypedefProvider {
    parentInterfaceName: NamespacedVariableNameExpression;
    body: Statement[];
    namespaceName: NamespacedVariableNameExpression;
    constructor(interfaceToken: Token, name: Identifier, extendsToken: Token, parentInterfaceName: NamespacedVariableNameExpression, body: Statement[], endInterfaceToken: Token, namespaceName: NamespacedVariableNameExpression);
    tokens: {
        interface: Token;
        name: Identifier;
        extends: Token;
        endInterface: Token;
    };
    range: Range;
    get fields(): Statement[];
    get methods(): Statement[];
    /**
     * The name of the interface WITH its leading namespace (if applicable)
     */
    get fullName(): string;
    /**
     * The name of the interface (without the namespace prefix)
     */
    get name(): string;
    transpile(state: BrsTranspileState): TranspileResult;
    getTypedef(state: BrsTranspileState): TranspileResult;
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class InterfaceFieldStatement extends Statement implements TypedefProvider {
    type: BscType;
    transpile(state: BrsTranspileState): TranspileResult;
    constructor(nameToken: Identifier, asToken: Token, typeToken: Token, type: BscType);
    get range(): Range;
    tokens: {
        name: Identifier;
        as: Token;
        type: Token;
    };
    get name(): string;
    walk(visitor: WalkVisitor, options: WalkOptions): void;
    getTypedef(state: BrsTranspileState): (string | SourceNode)[];
}
export declare class InterfaceMethodStatement extends Statement implements TypedefProvider {
    params: FunctionParameterExpression[];
    returnType?: BscType;
    transpile(state: BrsTranspileState): TranspileResult;
    constructor(functionTypeToken: Token, nameToken: Identifier, leftParen: Token, params: FunctionParameterExpression[], rightParen: Token, asToken?: Token, returnTypeToken?: Token, returnType?: BscType);
    get range(): Range;
    tokens: {
        functionType: Token;
        name: Identifier;
        leftParen: Token;
        rightParen: Token;
        as: Token;
        returnType: Token;
    };
    walk(visitor: WalkVisitor, options: WalkOptions): void;
    getTypedef(state: BrsTranspileState): TranspileResult;
}
export declare class ClassStatement extends Statement implements TypedefProvider {
    readonly classKeyword: Token;
    /**
     * The name of the class (without namespace prefix)
     */
    readonly name: Identifier;
    body: Statement[];
    readonly end: Token;
    readonly extendsKeyword?: Token;
    readonly parentClassName?: NamespacedVariableNameExpression;
    readonly namespaceName?: NamespacedVariableNameExpression;
    constructor(classKeyword: Token, 
    /**
     * The name of the class (without namespace prefix)
     */
    name: Identifier, body: Statement[], end: Token, extendsKeyword?: Token, parentClassName?: NamespacedVariableNameExpression, namespaceName?: NamespacedVariableNameExpression);
    getName(parseMode: ParseMode): string;
    memberMap: Record<string, ClassMemberStatement>;
    methods: ClassMethodStatement[];
    fields: ClassFieldStatement[];
    readonly range: Range;
    transpile(state: BrsTranspileState): any[];
    getTypedef(state: BrsTranspileState): TranspileResult;
    /**
     * Find the parent index for this class's parent.
     * For class inheritance, every class is given an index.
     * The base class is index 0, its child is index 1, and so on.
     */
    getParentClassIndex(state: BrsTranspileState): number;
    hasParentClass(): boolean;
    /**
     * Get all ancestor classes, in closest-to-furthest order (i.e. 0 is parent, 1 is grandparent, etc...).
     * This will return an empty array if no ancestors were found
     */
    getAncestors(state: BrsTranspileState): ClassStatement[];
    private getBuilderName;
    /**
     * Get the constructor function for this class (if exists), or undefined if not exist
     */
    private getConstructorFunction;
    private getEmptyNewFunction;
    /**
     * Create an empty `new` function if class is missing it (simplifies transpile logic)
     */
    private ensureConstructorFunctionExists;
    /**
     * Determine if the specified field was declared in one of the ancestor classes
     */
    isFieldDeclaredByAncestor(fieldName: string, ancestors: ClassStatement[]): boolean;
    /**
     * The builder is a function that assigns all of the methods and property names to a class instance.
     * This needs to be a separate function so that child classes can call the builder from their parent
     * without instantiating the parent constructor at that point in time.
     */
    private getTranspiledBuilder;
    /**
     * The class function is the function with the same name as the class. This is the function that
     * consumers should call to create a new instance of that class.
     * This invokes the builder, gets an instance of the class, then invokes the "new" function on that class.
     */
    private getTranspiledClassFunction;
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class ClassMethodStatement extends FunctionStatement {
    accessModifier: Token;
    override: Token;
    constructor(accessModifier: Token, name: Identifier, func: FunctionExpression, override: Token);
    readonly range: Range;
    transpile(state: BrsTranspileState): any[];
    getTypedef(state: BrsTranspileState): string[];
    /**
     * All child classes must call the parent constructor. The type checker will warn users when they don't call it in their own class,
     * but we still need to call it even if they have omitted it. This injects the super call if it's missing
     */
    private ensureSuperConstructorCall;
    /**
     * Inject field initializers at the top of the `new` function (after any present `super()` call)
     */
    private injectFieldInitializersForConstructor;
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class ClassFieldStatement extends Statement implements TypedefProvider {
    readonly accessModifier?: Token;
    readonly name?: Identifier;
    readonly as?: Token;
    readonly type?: Token;
    readonly equal?: Token;
    readonly initialValue?: Expression;
    constructor(accessModifier?: Token, name?: Identifier, as?: Token, type?: Token, equal?: Token, initialValue?: Expression);
    /**
     * Derive a ValueKind from the type token, or the initial value.
     * Defaults to `DynamicType`
     */
    getType(): BscType;
    readonly range: Range;
    transpile(state: BrsTranspileState): TranspileResult;
    getTypedef(state: BrsTranspileState): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare type ClassMemberStatement = ClassFieldStatement | ClassMethodStatement;
export declare class TryCatchStatement extends Statement {
    tokens: {
        try: Token;
        endTry?: Token;
    };
    tryBranch?: Block;
    catchStatement?: CatchStatement;
    constructor(tokens: {
        try: Token;
        endTry?: Token;
    }, tryBranch?: Block, catchStatement?: CatchStatement);
    get range(): Range;
    transpile(state: BrsTranspileState): TranspileResult;
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class CatchStatement extends Statement {
    tokens: {
        catch: Token;
    };
    exceptionVariable?: Identifier;
    catchBranch?: Block;
    constructor(tokens: {
        catch: Token;
    }, exceptionVariable?: Identifier, catchBranch?: Block);
    get range(): Range;
    transpile(state: BrsTranspileState): TranspileResult;
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class ThrowStatement extends Statement {
    throwToken: Token;
    expression?: Expression;
    constructor(throwToken: Token, expression?: Expression);
    range: Range;
    transpile(state: BrsTranspileState): (string | SourceNode)[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class EnumStatement extends Statement implements TypedefProvider {
    tokens: {
        enum: Token;
        name: Identifier;
        endEnum: Token;
    };
    body: Array<EnumMemberStatement | CommentStatement>;
    namespaceName?: NamespacedVariableNameExpression;
    constructor(tokens: {
        enum: Token;
        name: Identifier;
        endEnum: Token;
    }, body: Array<EnumMemberStatement | CommentStatement>, namespaceName?: NamespacedVariableNameExpression);
    get range(): Range;
    getMembers(): EnumMemberStatement[];
    /**
     * Get a map of member names and their values.
     * All values are stored as their AST LiteralExpression representation (i.e. string enum values include the wrapping quotes)
     */
    getMemberValueMap(): Map<string, string>;
    getMemberValue(name: string): string;
    /**
     * The name of the enum (without the namespace prefix)
     */
    get name(): string;
    /**
     * The name of the enum WITH its leading namespace (if applicable)
     */
    get fullName(): string;
    transpile(state: BrsTranspileState): any[];
    getTypedef(state: BrsTranspileState): TranspileResult;
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class EnumMemberStatement extends Statement implements TypedefProvider {
    tokens: {
        name: Identifier;
        equal?: Token;
    };
    value?: Expression;
    constructor(tokens: {
        name: Identifier;
        equal?: Token;
    }, value?: Expression);
    /**
     * The name of the member
     */
    get name(): string;
    get range(): Range;
    transpile(state: BrsTranspileState): TranspileResult;
    getTypedef(state: BrsTranspileState): (string | SourceNode)[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}

import type { Body, AssignmentStatement, Block, ExpressionStatement, CommentStatement, ExitForStatement, ExitWhileStatement, FunctionStatement, IfStatement, IncrementStatement, PrintStatement, GotoStatement, LabelStatement, ReturnStatement, EndStatement, StopStatement, ForStatement, ForEachStatement, WhileStatement, DottedSetStatement, IndexedSetStatement, LibraryStatement, NamespaceStatement, ImportStatement, ClassFieldStatement, ClassMethodStatement, ClassStatement, Statement, InterfaceFieldStatement, InterfaceMethodStatement, InterfaceStatement, EnumStatement, EnumMemberStatement, TryCatchStatement, CatchStatement } from '../parser/Statement';
import type { LiteralExpression, Expression, BinaryExpression, CallExpression, FunctionExpression, NamespacedVariableNameExpression, DottedGetExpression, XmlAttributeGetExpression, IndexedGetExpression, GroupingExpression, EscapedCharCodeLiteralExpression, ArrayLiteralExpression, AALiteralExpression, UnaryExpression, VariableExpression, SourceLiteralExpression, NewExpression, CallfuncExpression, TemplateStringQuasiExpression, TemplateStringExpression, TaggedTemplateStringExpression, AnnotationExpression, FunctionParameterExpression, AAMemberExpression } from '../parser/Expression';
import type { BrsFile } from '../files/BrsFile';
import type { XmlFile } from '../files/XmlFile';
import type { BscFile, File, TypedefProvider } from '../interfaces';
import { InvalidType } from '../types/InvalidType';
import { VoidType } from '../types/VoidType';
import { FunctionType } from '../types/FunctionType';
import { StringType } from '../types/StringType';
import { BooleanType } from '../types/BooleanType';
import { IntegerType } from '../types/IntegerType';
import { LongIntegerType } from '../types/LongIntegerType';
import { FloatType } from '../types/FloatType';
import { DoubleType } from '../types/DoubleType';
import { CustomType } from '../types/CustomType';
import type { Scope } from '../Scope';
import type { XmlScope } from '../XmlScope';
import { DynamicType } from '../types/DynamicType';
import type { InterfaceType } from '../types/InterfaceType';
import type { ObjectType } from '../types/ObjectType';
export declare function isBrsFile(file: (BscFile | File)): file is BrsFile;
export declare function isXmlFile(file: (BscFile)): file is XmlFile;
export declare function isXmlScope(scope: (Scope)): scope is XmlScope;
/**
 * Determine if the variable is a descendent of the Statement base class.
 * Due to performance restrictions, this expects all statements to
 * directly extend Statement or FunctionStatement,
 * so it only checks the immediate parent's class name.
 */
export declare function isStatement(element: Statement | Expression | undefined): element is Statement;
export declare function isBody(element: Statement | Expression | undefined): element is Body;
export declare function isAssignmentStatement(element: Statement | Expression | undefined): element is AssignmentStatement;
export declare function isBlock(element: Statement | Expression | undefined): element is Block;
export declare function isExpressionStatement(element: Statement | Expression | undefined): element is ExpressionStatement;
export declare function isCommentStatement(element: Statement | Expression | undefined): element is CommentStatement;
export declare function isExitForStatement(element: Statement | Expression | undefined): element is ExitForStatement;
export declare function isExitWhileStatement(element: Statement | Expression | undefined): element is ExitWhileStatement;
export declare function isFunctionStatement(element: Statement | Expression | undefined): element is FunctionStatement;
export declare function isIfStatement(element: Statement | Expression | undefined): element is IfStatement;
export declare function isIncrementStatement(element: Statement | Expression | undefined): element is IncrementStatement;
export declare function isPrintStatement(element: Statement | Expression | undefined): element is PrintStatement;
export declare function isGotoStatement(element: Statement | Expression | undefined): element is GotoStatement;
export declare function isLabelStatement(element: Statement | Expression | undefined): element is LabelStatement;
export declare function isReturnStatement(element: Statement | Expression | undefined): element is ReturnStatement;
export declare function isEndStatement(element: Statement | Expression | undefined): element is EndStatement;
export declare function isStopStatement(element: Statement | Expression | undefined): element is StopStatement;
export declare function isForStatement(element: Statement | Expression | undefined): element is ForStatement;
export declare function isForEachStatement(element: Statement | Expression | undefined): element is ForEachStatement;
export declare function isWhileStatement(element: Statement | Expression | undefined): element is WhileStatement;
export declare function isDottedSetStatement(element: Statement | Expression | undefined): element is DottedSetStatement;
export declare function isIndexedSetStatement(element: Statement | Expression | undefined): element is IndexedSetStatement;
export declare function isLibraryStatement(element: Statement | Expression | undefined): element is LibraryStatement;
export declare function isNamespaceStatement(element: Statement | Expression | undefined): element is NamespaceStatement;
export declare function isClassStatement(element: Statement | Expression | undefined): element is ClassStatement;
export declare function isImportStatement(element: Statement | Expression | undefined): element is ImportStatement;
export declare function isClassMethodStatement(element: Statement | Expression | undefined): element is ClassMethodStatement;
export declare function isClassFieldStatement(element: Statement | Expression | undefined): element is ClassFieldStatement;
export declare function isInterfaceStatement(element: Statement | Expression | undefined): element is InterfaceStatement;
export declare function isInterfaceMethodStatement(element: Statement | Expression | undefined): element is InterfaceMethodStatement;
export declare function isInterfaceFieldStatement(element: Statement | Expression | undefined): element is InterfaceFieldStatement;
export declare function isEnumStatement(element: Statement | Expression | undefined): element is EnumStatement;
export declare function isEnumMemberStatement(element: Statement | Expression | undefined): element is EnumMemberStatement;
export declare function isTryCatchStatement(element: Statement | Expression | undefined): element is TryCatchStatement;
export declare function isCatchStatement(element: Statement | Expression | undefined): element is CatchStatement;
/**
 * Determine if the variable is a descendent of the Expression base class.
 * Due to performance restrictions, this expects all statements to directly extend Expression,
 * so it only checks the immediate parent's class name. For example:
 * this will work for StringLiteralExpression -> Expression,
 * but will not work CustomStringLiteralExpression -> StringLiteralExpression -> Expression
 */
export declare function isExpression(element: Statement | Expression | undefined): element is Expression;
export declare function isBinaryExpression(element: Statement | Expression | undefined): element is BinaryExpression;
export declare function isCallExpression(element: Statement | Expression | undefined): element is CallExpression;
export declare function isFunctionExpression(element: Statement | Expression | undefined): element is FunctionExpression;
export declare function isNamespacedVariableNameExpression(element: Statement | Expression | undefined): element is NamespacedVariableNameExpression;
export declare function isDottedGetExpression(element: Statement | Expression | undefined): element is DottedGetExpression;
export declare function isXmlAttributeGetExpression(element: Statement | Expression | undefined): element is XmlAttributeGetExpression;
export declare function isIndexedGetExpression(element: Statement | Expression | undefined): element is IndexedGetExpression;
export declare function isGroupingExpression(element: Statement | Expression | undefined): element is GroupingExpression;
export declare function isLiteralExpression(element: Statement | Expression | undefined): element is LiteralExpression;
export declare function isEscapedCharCodeLiteralExpression(element: Statement | Expression | undefined): element is EscapedCharCodeLiteralExpression;
export declare function isArrayLiteralExpression(element: Statement | Expression | undefined): element is ArrayLiteralExpression;
export declare function isAALiteralExpression(element: Statement | Expression | undefined): element is AALiteralExpression;
export declare function isAAMemberExpression(element: Statement | Expression | undefined): element is AAMemberExpression;
export declare function isUnaryExpression(element: Statement | Expression | undefined): element is UnaryExpression;
export declare function isVariableExpression(element: Statement | Expression | undefined): element is VariableExpression;
export declare function isSourceLiteralExpression(element: Statement | Expression | undefined): element is SourceLiteralExpression;
export declare function isNewExpression(element: Statement | Expression | undefined): element is NewExpression;
export declare function isCallfuncExpression(element: Statement | Expression | undefined): element is CallfuncExpression;
export declare function isTemplateStringQuasiExpression(element: Statement | Expression | undefined): element is TemplateStringQuasiExpression;
export declare function isTemplateStringExpression(element: Statement | Expression | undefined): element is TemplateStringExpression;
export declare function isTaggedTemplateStringExpression(element: Statement | Expression | undefined): element is TaggedTemplateStringExpression;
export declare function isFunctionParameterExpression(element: Statement | Expression | undefined): element is FunctionParameterExpression;
export declare function isAnnotationExpression(element: Statement | Expression | undefined): element is AnnotationExpression;
export declare function isTypedefProvider(element: any): element is TypedefProvider;
export declare function isStringType(value: any): value is StringType;
export declare function isFunctionType(e: any): e is FunctionType;
export declare function isBooleanType(e: any): e is BooleanType;
export declare function isIntegerType(e: any): e is IntegerType;
export declare function isLongIntegerType(e: any): e is LongIntegerType;
export declare function isFloatType(e: any): e is FloatType;
export declare function isDoubleType(e: any): e is DoubleType;
export declare function isInvalidType(e: any): e is InvalidType;
export declare function isVoidType(e: any): e is VoidType;
export declare function isCustomType(e: any): e is CustomType;
export declare function isDynamicType(e: any): e is DynamicType;
export declare function isInterfaceType(e: any): e is InterfaceType;
export declare function isObjectType(e: any): e is ObjectType;
export declare function isNumberType(e: any): e is IntegerType | LongIntegerType | FloatType | DoubleType;
export declare function isLiteralInvalid(e: any): e is LiteralExpression & {
    type: InvalidType;
};
export declare function isLiteralBoolean(e: any): e is LiteralExpression & {
    type: BooleanType;
};
export declare function isLiteralString(e: any): e is LiteralExpression & {
    type: StringType;
};
export declare function isLiteralNumber(e: any): e is LiteralExpression & {
    type: IntegerType | LongIntegerType | FloatType | DoubleType;
};

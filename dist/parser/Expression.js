"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegexLiteralExpression = exports.NullCoalescingExpression = exports.TernaryExpression = exports.AnnotationExpression = exports.TaggedTemplateStringExpression = exports.TemplateStringExpression = exports.TemplateStringQuasiExpression = exports.CallfuncExpression = exports.NewExpression = exports.SourceLiteralExpression = exports.VariableExpression = exports.UnaryExpression = exports.AALiteralExpression = exports.AAMemberExpression = exports.ArrayLiteralExpression = exports.EscapedCharCodeLiteralExpression = exports.LiteralExpression = exports.GroupingExpression = exports.IndexedGetExpression = exports.XmlAttributeGetExpression = exports.DottedGetExpression = exports.NamespacedVariableNameExpression = exports.FunctionParameterExpression = exports.FunctionExpression = exports.CallExpression = exports.BinaryExpression = exports.Expression = void 0;
const TokenKind_1 = require("../lexer/TokenKind");
const util_1 = require("../util");
const Parser_1 = require("./Parser");
const fileUrl = require("file-url");
const visitors_1 = require("../astUtils/visitors");
const reflection_1 = require("../astUtils/reflection");
const VoidType_1 = require("../types/VoidType");
const DynamicType_1 = require("../types/DynamicType");
const FunctionType_1 = require("../types/FunctionType");
/** A BrightScript expression */
class Expression {
    constructor() {
        /**
         * When being considered by the walk visitor, this describes what type of element the current class is.
         */
        this.visitMode = visitors_1.InternalWalkMode.visitExpressions;
    }
}
exports.Expression = Expression;
class BinaryExpression extends Expression {
    constructor(left, operator, right) {
        super();
        this.left = left;
        this.operator = operator;
        this.right = right;
        this.range = util_1.default.createRangeFromPositions(this.left.range.start, this.right.range.end);
    }
    transpile(state) {
        return [
            state.sourceNode(this.left, this.left.transpile(state)),
            ' ',
            state.transpileToken(this.operator),
            ' ',
            state.sourceNode(this.right, this.right.transpile(state))
        ];
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_1.InternalWalkMode.walkExpressions) {
            (0, visitors_1.walk)(this, 'left', visitor, options);
            (0, visitors_1.walk)(this, 'right', visitor, options);
        }
    }
}
exports.BinaryExpression = BinaryExpression;
class CallExpression extends Expression {
    constructor(callee, 
    /**
     * Can either be `(`, or `?(` for optional chaining
     */
    openingParen, closingParen, args, 
    /**
     * The namespace that currently wraps this call expression. This is NOT the namespace of the callee...that will be represented in the callee expression itself.
     */
    namespaceName) {
        super();
        this.callee = callee;
        this.openingParen = openingParen;
        this.closingParen = closingParen;
        this.args = args;
        this.namespaceName = namespaceName;
        this.range = util_1.default.createRangeFromPositions(this.callee.range.start, this.closingParen.range.end);
    }
    transpile(state, nameOverride) {
        let result = [];
        //transpile the name
        if (nameOverride) {
            result.push(state.sourceNode(this.callee, nameOverride));
        }
        else {
            result.push(...this.callee.transpile(state));
        }
        result.push(state.transpileToken(this.openingParen));
        for (let i = 0; i < this.args.length; i++) {
            //add comma between args
            if (i > 0) {
                result.push(', ');
            }
            let arg = this.args[i];
            result.push(...arg.transpile(state));
        }
        result.push(state.transpileToken(this.closingParen));
        return result;
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_1.InternalWalkMode.walkExpressions) {
            (0, visitors_1.walk)(this, 'callee', visitor, options);
            for (let i = 0; i < this.args.length; i++) {
                (0, visitors_1.walk)(this.args, i, visitor, options, this);
            }
        }
    }
}
exports.CallExpression = CallExpression;
CallExpression.MaximumArguments = 32;
class FunctionExpression extends Expression {
    constructor(parameters, body, functionType, end, leftParen, rightParen, asToken, returnTypeToken, 
    /**
     * If this function is enclosed within another function, this will reference that parent function
     */
    parentFunction, namespaceName) {
        super();
        this.parameters = parameters;
        this.body = body;
        this.functionType = functionType;
        this.end = end;
        this.leftParen = leftParen;
        this.rightParen = rightParen;
        this.asToken = asToken;
        this.returnTypeToken = returnTypeToken;
        this.parentFunction = parentFunction;
        this.namespaceName = namespaceName;
        /**
         * The list of function calls that are declared within this function scope. This excludes CallExpressions
         * declared in child functions
         */
        this.callExpressions = [];
        /**
         * A list of all child functions declared directly within this function
         */
        this.childFunctionExpressions = [];
        if (this.returnTypeToken) {
            this.returnType = util_1.default.tokenToBscType(this.returnTypeToken);
        }
        else if (this.functionType.text.toLowerCase() === 'sub') {
            this.returnType = new VoidType_1.VoidType();
        }
        else {
            this.returnType = new DynamicType_1.DynamicType();
        }
    }
    /**
     * The range of the function, starting at the 'f' in function or 's' in sub (or the open paren if the keyword is missing),
     * and ending with the last n' in 'end function' or 'b' in 'end sub'
     */
    get range() {
        var _a, _b, _c, _d, _e;
        return util_1.default.createRangeFromPositions(((_a = this.functionType) !== null && _a !== void 0 ? _a : this.leftParen).range.start, ((_e = (_d = (_c = (_b = this.end) !== null && _b !== void 0 ? _b : this.body) !== null && _c !== void 0 ? _c : this.returnTypeToken) !== null && _d !== void 0 ? _d : this.asToken) !== null && _e !== void 0 ? _e : this.rightParen).range.end);
    }
    transpile(state, name, includeBody = true) {
        let results = [];
        //'function'|'sub'
        results.push(state.transpileToken(this.functionType));
        //functionName?
        if (name) {
            results.push(' ', state.transpileToken(name));
        }
        //leftParen
        results.push(state.transpileToken(this.leftParen));
        //parameters
        for (let i = 0; i < this.parameters.length; i++) {
            let param = this.parameters[i];
            //add commas
            if (i > 0) {
                results.push(', ');
            }
            //add parameter
            results.push(param.transpile(state));
        }
        //right paren
        results.push(state.transpileToken(this.rightParen));
        //as [Type]
        if (this.asToken) {
            results.push(' ', 
            //as
            state.transpileToken(this.asToken), ' ', 
            //return type
            state.sourceNode(this.returnTypeToken, this.returnType.toTypeString()));
        }
        if (includeBody) {
            state.lineage.unshift(this);
            let body = this.body.transpile(state);
            state.lineage.shift();
            results.push(...body);
        }
        results.push('\n');
        //'end sub'|'end function'
        results.push(state.indent(), state.transpileToken(this.end));
        return results;
    }
    getTypedef(state, name) {
        return this.transpile(state, name, false);
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_1.InternalWalkMode.walkExpressions) {
            for (let i = 0; i < this.parameters.length; i++) {
                (0, visitors_1.walk)(this.parameters, i, visitor, options, this);
            }
            //This is the core of full-program walking...it allows us to step into sub functions
            if (options.walkMode & visitors_1.InternalWalkMode.recurseChildFunctions) {
                (0, visitors_1.walk)(this, 'body', visitor, options);
            }
        }
    }
    getFunctionType() {
        let functionType = new FunctionType_1.FunctionType(this.returnType);
        functionType.isSub = this.functionType.text === 'sub';
        for (let param of this.parameters) {
            functionType.addParameter(param.name.text, param.type, !!param.typeToken);
        }
        return functionType;
    }
}
exports.FunctionExpression = FunctionExpression;
class FunctionParameterExpression extends Expression {
    constructor(name, typeToken, defaultValue, asToken, namespaceName) {
        super();
        this.name = name;
        this.typeToken = typeToken;
        this.defaultValue = defaultValue;
        this.asToken = asToken;
        this.namespaceName = namespaceName;
        if (typeToken) {
            this.type = util_1.default.tokenToBscType(typeToken);
        }
        else {
            this.type = new DynamicType_1.DynamicType();
        }
    }
    get range() {
        return {
            start: this.name.range.start,
            end: this.typeToken ? this.typeToken.range.end : this.name.range.end
        };
    }
    transpile(state) {
        let result = [
            //name
            state.transpileToken(this.name)
        ];
        //default value
        if (this.defaultValue) {
            result.push(' = ');
            result.push(this.defaultValue.transpile(state));
        }
        //type declaration
        if (this.asToken) {
            result.push(' ');
            result.push(state.transpileToken(this.asToken));
            result.push(' ');
            result.push(state.sourceNode(this.typeToken, this.type.toTypeString()));
        }
        return result;
    }
    walk(visitor, options) {
        // eslint-disable-next-line no-bitwise
        if (this.defaultValue && options.walkMode & visitors_1.InternalWalkMode.walkExpressions) {
            (0, visitors_1.walk)(this, 'defaultValue', visitor, options);
        }
    }
}
exports.FunctionParameterExpression = FunctionParameterExpression;
class NamespacedVariableNameExpression extends Expression {
    constructor(
    //if this is a `DottedGetExpression`, it must be comprised only of `VariableExpression`s
    expression) {
        super();
        this.expression = expression;
        this.range = expression.range;
    }
    transpile(state) {
        return [
            state.sourceNode(this, this.getName(Parser_1.ParseMode.BrightScript))
        ];
    }
    getNameParts() {
        let parts = [];
        if ((0, reflection_1.isVariableExpression)(this.expression)) {
            parts.push(this.expression.name.text);
        }
        else {
            let expr = this.expression;
            parts.push(expr.name.text);
            while ((0, reflection_1.isVariableExpression)(expr) === false) {
                expr = expr.obj;
                parts.unshift(expr.name.text);
            }
        }
        return parts;
    }
    getName(parseMode) {
        if (parseMode === Parser_1.ParseMode.BrighterScript) {
            return this.getNameParts().join('.');
        }
        else {
            return this.getNameParts().join('_');
        }
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_1.InternalWalkMode.walkExpressions) {
            (0, visitors_1.walk)(this, 'expression', visitor, options);
        }
    }
}
exports.NamespacedVariableNameExpression = NamespacedVariableNameExpression;
class DottedGetExpression extends Expression {
    constructor(obj, name, 
    /**
     * Can either be `.`, or `?.` for optional chaining
     */
    dot) {
        super();
        this.obj = obj;
        this.name = name;
        this.dot = dot;
        this.range = util_1.default.createRangeFromPositions(this.obj.range.start, this.name.range.end);
    }
    transpile(state) {
        //if the callee starts with a namespace name, transpile the name
        if (state.file.calleeStartsWithNamespace(this)) {
            return new NamespacedVariableNameExpression(this).transpile(state);
        }
        else {
            return [
                ...this.obj.transpile(state),
                state.transpileToken(this.dot),
                state.transpileToken(this.name)
            ];
        }
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_1.InternalWalkMode.walkExpressions) {
            (0, visitors_1.walk)(this, 'obj', visitor, options);
        }
    }
}
exports.DottedGetExpression = DottedGetExpression;
class XmlAttributeGetExpression extends Expression {
    constructor(obj, name, 
    /**
     * Can either be `@`, or `?@` for optional chaining
     */
    at) {
        super();
        this.obj = obj;
        this.name = name;
        this.at = at;
        this.range = util_1.default.createRangeFromPositions(this.obj.range.start, this.name.range.end);
    }
    transpile(state) {
        return [
            ...this.obj.transpile(state),
            state.transpileToken(this.at),
            state.transpileToken(this.name)
        ];
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_1.InternalWalkMode.walkExpressions) {
            (0, visitors_1.walk)(this, 'obj', visitor, options);
        }
    }
}
exports.XmlAttributeGetExpression = XmlAttributeGetExpression;
class IndexedGetExpression extends Expression {
    constructor(obj, index, 
    /**
     * Can either be `[` or `?[`. If `?.[` is used, this will be `[` and `optionalChainingToken` will be `?.`
     */
    openingSquare, closingSquare, questionDotToken //  ? or ?.
    ) {
        super();
        this.obj = obj;
        this.index = index;
        this.openingSquare = openingSquare;
        this.closingSquare = closingSquare;
        this.questionDotToken = questionDotToken;
        this.range = util_1.default.createBoundingRange(this.obj, this.openingSquare, this.questionDotToken, this.openingSquare, this.index, this.closingSquare);
    }
    transpile(state) {
        return [
            ...this.obj.transpile(state),
            this.questionDotToken ? state.transpileToken(this.questionDotToken) : '',
            state.transpileToken(this.openingSquare),
            ...this.index.transpile(state),
            state.transpileToken(this.closingSquare)
        ];
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_1.InternalWalkMode.walkExpressions) {
            (0, visitors_1.walk)(this, 'obj', visitor, options);
            (0, visitors_1.walk)(this, 'index', visitor, options);
        }
    }
}
exports.IndexedGetExpression = IndexedGetExpression;
class GroupingExpression extends Expression {
    constructor(tokens, expression) {
        super();
        this.tokens = tokens;
        this.expression = expression;
        this.range = util_1.default.createRangeFromPositions(this.tokens.left.range.start, this.tokens.right.range.end);
    }
    transpile(state) {
        return [
            state.transpileToken(this.tokens.left),
            ...this.expression.transpile(state),
            state.transpileToken(this.tokens.right)
        ];
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_1.InternalWalkMode.walkExpressions) {
            (0, visitors_1.walk)(this, 'expression', visitor, options);
        }
    }
}
exports.GroupingExpression = GroupingExpression;
class LiteralExpression extends Expression {
    constructor(token) {
        super();
        this.token = token;
        this.type = util_1.default.tokenToBscType(token);
    }
    get range() {
        return this.token.range;
    }
    transpile(state) {
        let text;
        if (this.token.kind === TokenKind_1.TokenKind.TemplateStringQuasi) {
            //wrap quasis with quotes (and escape inner quotemarks)
            text = `"${this.token.text.replace(/"/g, '""')}"`;
        }
        else if ((0, reflection_1.isStringType)(this.type)) {
            text = this.token.text;
            //add trailing quotemark if it's missing. We will have already generated a diagnostic for this.
            if (text.endsWith('"') === false) {
                text += '"';
            }
        }
        else {
            text = this.token.text;
        }
        return [
            state.sourceNode(this, text)
        ];
    }
    walk(visitor, options) {
        //nothing to walk
    }
}
exports.LiteralExpression = LiteralExpression;
/**
 * This is a special expression only used within template strings. It exists so we can prevent producing lots of empty strings
 * during template string transpile by identifying these expressions explicitly and skipping the bslib_toString around them
 */
class EscapedCharCodeLiteralExpression extends Expression {
    constructor(token) {
        super();
        this.token = token;
        this.range = token.range;
    }
    transpile(state) {
        return [
            state.sourceNode(this, `chr(${this.token.charCode})`)
        ];
    }
    walk(visitor, options) {
        //nothing to walk
    }
}
exports.EscapedCharCodeLiteralExpression = EscapedCharCodeLiteralExpression;
class ArrayLiteralExpression extends Expression {
    constructor(elements, open, close, hasSpread = false) {
        super();
        this.elements = elements;
        this.open = open;
        this.close = close;
        this.hasSpread = hasSpread;
        this.range = util_1.default.createRangeFromPositions(this.open.range.start, this.close.range.end);
    }
    transpile(state) {
        let result = [];
        result.push(state.transpileToken(this.open));
        let hasChildren = this.elements.length > 0;
        state.blockDepth++;
        for (let i = 0; i < this.elements.length; i++) {
            let previousElement = this.elements[i - 1];
            let element = this.elements[i];
            if ((0, reflection_1.isCommentStatement)(element)) {
                //if the comment is on the same line as opening square or previous statement, don't add newline
                if (util_1.default.linesTouch(this.open, element) || util_1.default.linesTouch(previousElement, element)) {
                    result.push(' ');
                }
                else {
                    result.push('\n', state.indent());
                }
                state.lineage.unshift(this);
                result.push(element.transpile(state));
                state.lineage.shift();
            }
            else {
                result.push('\n');
                result.push(state.indent(), ...element.transpile(state));
            }
        }
        state.blockDepth--;
        //add a newline between open and close if there are elements
        if (hasChildren) {
            result.push('\n');
            result.push(state.indent());
        }
        result.push(state.transpileToken(this.close));
        return result;
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_1.InternalWalkMode.walkExpressions) {
            for (let i = 0; i < this.elements.length; i++) {
                (0, visitors_1.walk)(this.elements, i, visitor, options, this);
            }
        }
    }
}
exports.ArrayLiteralExpression = ArrayLiteralExpression;
class AAMemberExpression extends Expression {
    constructor(keyToken, colonToken, 
    /** The expression evaluated to determine the member's initial value. */
    value) {
        super();
        this.keyToken = keyToken;
        this.colonToken = colonToken;
        this.value = value;
        this.range = util_1.default.createRangeFromPositions(keyToken.range.start, this.value.range.end);
    }
    transpile(state) {
        //TODO move the logic from AALiteralExpression loop into this function
        return [];
    }
    walk(visitor, options) {
        (0, visitors_1.walk)(this, 'value', visitor, options);
    }
}
exports.AAMemberExpression = AAMemberExpression;
class AALiteralExpression extends Expression {
    constructor(elements, open, close) {
        super();
        this.elements = elements;
        this.open = open;
        this.close = close;
        this.range = util_1.default.createRangeFromPositions(this.open.range.start, this.close.range.end);
    }
    transpile(state) {
        let result = [];
        //open curly
        result.push(state.transpileToken(this.open));
        let hasChildren = this.elements.length > 0;
        //add newline if the object has children and the first child isn't a comment starting on the same line as opening curly
        if (hasChildren && ((0, reflection_1.isCommentStatement)(this.elements[0]) === false || !util_1.default.linesTouch(this.elements[0], this.open))) {
            result.push('\n');
        }
        state.blockDepth++;
        for (let i = 0; i < this.elements.length; i++) {
            let element = this.elements[i];
            let previousElement = this.elements[i - 1];
            let nextElement = this.elements[i + 1];
            //don't indent if comment is same-line
            if ((0, reflection_1.isCommentStatement)(element) &&
                (util_1.default.linesTouch(this.open, element) || util_1.default.linesTouch(previousElement, element))) {
                result.push(' ');
                //indent line
            }
            else {
                result.push(state.indent());
            }
            //render comments
            if ((0, reflection_1.isCommentStatement)(element)) {
                result.push(...element.transpile(state));
            }
            else {
                //key
                result.push(state.transpileToken(element.keyToken));
                //colon
                result.push(state.transpileToken(element.colonToken), ' ');
                //value
                result.push(...element.value.transpile(state));
            }
            //if next element is a same-line comment, skip the newline
            if (nextElement && (0, reflection_1.isCommentStatement)(nextElement) && nextElement.range.start.line === element.range.start.line) {
                //add a newline between statements
            }
            else {
                result.push('\n');
            }
        }
        state.blockDepth--;
        //only indent the closing curly if we have children
        if (hasChildren) {
            result.push(state.indent());
        }
        //close curly
        result.push(state.transpileToken(this.close));
        return result;
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_1.InternalWalkMode.walkExpressions) {
            for (let i = 0; i < this.elements.length; i++) {
                if ((0, reflection_1.isCommentStatement)(this.elements[i])) {
                    (0, visitors_1.walk)(this.elements, i, visitor, options, this);
                }
                else {
                    (0, visitors_1.walk)(this.elements, i, visitor, options, this);
                }
            }
        }
    }
}
exports.AALiteralExpression = AALiteralExpression;
class UnaryExpression extends Expression {
    constructor(operator, right) {
        super();
        this.operator = operator;
        this.right = right;
        this.range = util_1.default.createRangeFromPositions(this.operator.range.start, this.right.range.end);
    }
    transpile(state) {
        return [
            state.transpileToken(this.operator),
            ' ',
            ...this.right.transpile(state)
        ];
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_1.InternalWalkMode.walkExpressions) {
            (0, visitors_1.walk)(this, 'right', visitor, options);
        }
    }
}
exports.UnaryExpression = UnaryExpression;
class VariableExpression extends Expression {
    constructor(name, namespaceName) {
        super();
        this.name = name;
        this.namespaceName = namespaceName;
        this.range = this.name.range;
    }
    getName(parseMode) {
        return parseMode === Parser_1.ParseMode.BrightScript ? this.name.text : this.name.text;
    }
    transpile(state) {
        var _a;
        let result = [];
        //if the callee is the name of a known namespace function
        if (state.file.calleeIsKnownNamespaceFunction(this, (_a = this.namespaceName) === null || _a === void 0 ? void 0 : _a.getName(Parser_1.ParseMode.BrighterScript))) {
            result.push(state.sourceNode(this, [
                this.namespaceName.getName(Parser_1.ParseMode.BrightScript),
                '_',
                this.getName(Parser_1.ParseMode.BrightScript)
            ]));
            //transpile  normally
        }
        else {
            result.push(state.transpileToken(this.name));
        }
        return result;
    }
    walk(visitor, options) {
        //nothing to walk
    }
}
exports.VariableExpression = VariableExpression;
class SourceLiteralExpression extends Expression {
    constructor(token) {
        super();
        this.token = token;
        this.range = token.range;
    }
    getFunctionName(state, parseMode) {
        let func = state.file.getFunctionScopeAtPosition(this.token.range.start).func;
        let nameParts = [];
        while (func.parentFunction) {
            let index = func.parentFunction.childFunctionExpressions.indexOf(func);
            nameParts.unshift(`anon${index}`);
            func = func.parentFunction;
        }
        //get the index of this function in its parent
        nameParts.unshift(func.functionStatement.getName(parseMode));
        return nameParts.join('$');
    }
    transpile(state) {
        let text;
        switch (this.token.kind) {
            case TokenKind_1.TokenKind.SourceFilePathLiteral:
                const pathUrl = fileUrl(state.srcPath);
                text = `"${pathUrl.substring(0, 4)}" + "${pathUrl.substring(4)}"`;
                break;
            case TokenKind_1.TokenKind.SourceLineNumLiteral:
                text = `${this.token.range.start.line + 1}`;
                break;
            case TokenKind_1.TokenKind.FunctionNameLiteral:
                text = `"${this.getFunctionName(state, Parser_1.ParseMode.BrightScript)}"`;
                break;
            case TokenKind_1.TokenKind.SourceFunctionNameLiteral:
                text = `"${this.getFunctionName(state, Parser_1.ParseMode.BrighterScript)}"`;
                break;
            case TokenKind_1.TokenKind.SourceLocationLiteral:
                const locationUrl = fileUrl(state.srcPath);
                text = `"${locationUrl.substring(0, 4)}" + "${locationUrl.substring(4)}:${this.token.range.start.line + 1}"`;
                break;
            case TokenKind_1.TokenKind.PkgPathLiteral:
                let pkgPath1 = `pkg:/${state.file.pkgPath}`
                    .replace(/\\/g, '/')
                    .replace(/\.bs$/i, '.brs');
                text = `"${pkgPath1}"`;
                break;
            case TokenKind_1.TokenKind.PkgLocationLiteral:
                let pkgPath2 = `pkg:/${state.file.pkgPath}`
                    .replace(/\\/g, '/')
                    .replace(/\.bs$/i, '.brs');
                text = `"${pkgPath2}:" + str(LINE_NUM)`;
                break;
            case TokenKind_1.TokenKind.LineNumLiteral:
            default:
                //use the original text (because it looks like a variable)
                text = this.token.text;
                break;
        }
        return [
            state.sourceNode(this, text)
        ];
    }
    walk(visitor, options) {
        //nothing to walk
    }
}
exports.SourceLiteralExpression = SourceLiteralExpression;
/**
 * This expression transpiles and acts exactly like a CallExpression,
 * except we need to uniquely identify these statements so we can
 * do more type checking.
 */
class NewExpression extends Expression {
    constructor(newKeyword, call) {
        super();
        this.newKeyword = newKeyword;
        this.call = call;
        this.range = util_1.default.createRangeFromPositions(this.newKeyword.range.start, this.call.range.end);
    }
    /**
     * The name of the class to initialize (with optional namespace prefixed)
     */
    get className() {
        //the parser guarantees the callee of a new statement's call object will be
        //a NamespacedVariableNameExpression
        return this.call.callee;
    }
    get namespaceName() {
        return this.call.namespaceName;
    }
    transpile(state) {
        var _a, _b;
        const cls = (_b = state.file.getClassFileLink(this.className.getName(Parser_1.ParseMode.BrighterScript), (_a = this.namespaceName) === null || _a === void 0 ? void 0 : _a.getName(Parser_1.ParseMode.BrighterScript))) === null || _b === void 0 ? void 0 : _b.item;
        //new statements within a namespace block can omit the leading namespace if the class resides in that same namespace.
        //So we need to figure out if this is a namespace-omitted class, or if this class exists without a namespace.
        return this.call.transpile(state, cls === null || cls === void 0 ? void 0 : cls.getName(Parser_1.ParseMode.BrightScript));
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_1.InternalWalkMode.walkExpressions) {
            (0, visitors_1.walk)(this, 'call', visitor, options);
        }
    }
}
exports.NewExpression = NewExpression;
class CallfuncExpression extends Expression {
    constructor(callee, operator, methodName, openingParen, args, closingParen) {
        var _a, _b, _c;
        super();
        this.callee = callee;
        this.operator = operator;
        this.methodName = methodName;
        this.openingParen = openingParen;
        this.args = args;
        this.closingParen = closingParen;
        this.range = util_1.default.createRangeFromPositions(callee.range.start, ((_c = (_b = (_a = closingParen !== null && closingParen !== void 0 ? closingParen : args[args.length - 1]) !== null && _a !== void 0 ? _a : openingParen) !== null && _b !== void 0 ? _b : methodName) !== null && _c !== void 0 ? _c : operator).range.end);
    }
    transpile(state) {
        let result = [];
        result.push(...this.callee.transpile(state), state.sourceNode(this.operator, '.callfunc'), state.transpileToken(this.openingParen), 
        //the name of the function
        state.sourceNode(this.methodName, ['"', this.methodName.text, '"']), ', ');
        //transpile args
        //callfunc with zero args never gets called, so pass invalid as the first parameter if there are no args
        if (this.args.length === 0) {
            result.push('invalid');
        }
        else {
            for (let i = 0; i < this.args.length; i++) {
                //add comma between args
                if (i > 0) {
                    result.push(', ');
                }
                let arg = this.args[i];
                result.push(...arg.transpile(state));
            }
        }
        result.push(state.transpileToken(this.closingParen));
        return result;
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_1.InternalWalkMode.walkExpressions) {
            (0, visitors_1.walk)(this, 'callee', visitor, options);
            for (let i = 0; i < this.args.length; i++) {
                (0, visitors_1.walk)(this.args, i, visitor, options, this);
            }
        }
    }
}
exports.CallfuncExpression = CallfuncExpression;
/**
 * Since template strings can contain newlines, we need to concatenate multiple strings together with chr() calls.
 * This is a single expression that represents the string contatenation of all parts of a single quasi.
 */
class TemplateStringQuasiExpression extends Expression {
    constructor(expressions) {
        super();
        this.expressions = expressions;
        this.range = util_1.default.createRangeFromPositions(this.expressions[0].range.start, this.expressions[this.expressions.length - 1].range.end);
    }
    transpile(state, skipEmptyStrings = true) {
        let result = [];
        let plus = '';
        for (let expression of this.expressions) {
            //skip empty strings
            //TODO what does an empty string literal expression look like?
            if (expression.token.text === '' && skipEmptyStrings === true) {
                continue;
            }
            result.push(plus, ...expression.transpile(state));
            plus = ' + ';
        }
        return result;
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_1.InternalWalkMode.walkExpressions) {
            for (let i = 0; i < this.expressions.length; i++) {
                (0, visitors_1.walk)(this.expressions, i, visitor, options, this);
            }
        }
    }
}
exports.TemplateStringQuasiExpression = TemplateStringQuasiExpression;
class TemplateStringExpression extends Expression {
    constructor(openingBacktick, quasis, expressions, closingBacktick) {
        super();
        this.openingBacktick = openingBacktick;
        this.quasis = quasis;
        this.expressions = expressions;
        this.closingBacktick = closingBacktick;
        this.range = util_1.default.createRangeFromPositions(quasis[0].range.start, quasis[quasis.length - 1].range.end);
    }
    transpile(state) {
        if (this.quasis.length === 1 && this.expressions.length === 0) {
            return this.quasis[0].transpile(state);
        }
        let result = [];
        let plus = '';
        //helper function to figure out when to include the plus
        function add(...items) {
            if (items.length > 0) {
                result.push(plus, ...items);
            }
            //set the plus after the first occurance of a nonzero length set of items
            if (plus === '' && items.length > 0) {
                plus = ' + ';
            }
        }
        for (let i = 0; i < this.quasis.length; i++) {
            let quasi = this.quasis[i];
            let expression = this.expressions[i];
            add(...quasi.transpile(state));
            if (expression) {
                //skip the toString wrapper around certain expressions
                if ((0, reflection_1.isEscapedCharCodeLiteralExpression)(expression) ||
                    ((0, reflection_1.isLiteralExpression)(expression) && (0, reflection_1.isStringType)(expression.type))) {
                    add(...expression.transpile(state));
                    //wrap all other expressions with a bslib_toString call to prevent runtime type mismatch errors
                }
                else {
                    add(state.bslibPrefix + '_toString(', ...expression.transpile(state), ')');
                }
            }
        }
        return result;
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_1.InternalWalkMode.walkExpressions) {
            //walk the quasis and expressions in left-to-right order
            for (let i = 0; i < this.quasis.length; i++) {
                (0, visitors_1.walk)(this.quasis, i, visitor, options, this);
                //this skips the final loop iteration since we'll always have one more quasi than expression
                if (this.expressions[i]) {
                    (0, visitors_1.walk)(this.expressions, i, visitor, options, this);
                }
            }
        }
    }
}
exports.TemplateStringExpression = TemplateStringExpression;
class TaggedTemplateStringExpression extends Expression {
    constructor(tagName, openingBacktick, quasis, expressions, closingBacktick) {
        super();
        this.tagName = tagName;
        this.openingBacktick = openingBacktick;
        this.quasis = quasis;
        this.expressions = expressions;
        this.closingBacktick = closingBacktick;
        this.range = util_1.default.createRangeFromPositions(quasis[0].range.start, quasis[quasis.length - 1].range.end);
    }
    transpile(state) {
        let result = [];
        result.push(state.transpileToken(this.tagName), '([');
        //add quasis as the first array
        for (let i = 0; i < this.quasis.length; i++) {
            let quasi = this.quasis[i];
            //separate items with a comma
            if (i > 0) {
                result.push(', ');
            }
            result.push(...quasi.transpile(state, false));
        }
        result.push('], [');
        //add expressions as the second array
        for (let i = 0; i < this.expressions.length; i++) {
            let expression = this.expressions[i];
            if (i > 0) {
                result.push(', ');
            }
            result.push(...expression.transpile(state));
        }
        result.push(state.sourceNode(this.closingBacktick, '])'));
        return result;
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_1.InternalWalkMode.walkExpressions) {
            //walk the quasis and expressions in left-to-right order
            for (let i = 0; i < this.quasis.length; i++) {
                (0, visitors_1.walk)(this.quasis, i, visitor, options, this);
                //this skips the final loop iteration since we'll always have one more quasi than expression
                if (this.expressions[i]) {
                    (0, visitors_1.walk)(this.expressions, i, visitor, options, this);
                }
            }
        }
    }
}
exports.TaggedTemplateStringExpression = TaggedTemplateStringExpression;
class AnnotationExpression extends Expression {
    constructor(atToken, nameToken) {
        super();
        this.atToken = atToken;
        this.nameToken = nameToken;
        this.name = nameToken.text;
        this.range = util_1.default.createRangeFromPositions(atToken.range.start, nameToken.range.end);
    }
    /**
     * Convert annotation arguments to JavaScript types
     * @param strict If false, keep Expression objects not corresponding to JS types
     */
    getArguments(strict = true) {
        if (!this.call) {
            return [];
        }
        return this.call.args.map(e => expressionToValue(e, strict));
    }
    transpile(state) {
        return [];
    }
    walk(visitor, options) {
        //nothing to walk
    }
    getTypedef(state) {
        var _a, _b;
        return [
            '@',
            this.name,
            ...((_b = (_a = this.call) === null || _a === void 0 ? void 0 : _a.transpile(state)) !== null && _b !== void 0 ? _b : [])
        ];
    }
}
exports.AnnotationExpression = AnnotationExpression;
class TernaryExpression extends Expression {
    constructor(test, questionMarkToken, consequent, colonToken, alternate) {
        var _a, _b, _c;
        super();
        this.test = test;
        this.questionMarkToken = questionMarkToken;
        this.consequent = consequent;
        this.colonToken = colonToken;
        this.alternate = alternate;
        this.range = util_1.default.createRangeFromPositions(test.range.start, ((_c = (_b = (_a = alternate !== null && alternate !== void 0 ? alternate : colonToken) !== null && _a !== void 0 ? _a : consequent) !== null && _b !== void 0 ? _b : questionMarkToken) !== null && _c !== void 0 ? _c : test).range.end);
    }
    transpile(state) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        let result = [];
        let consequentInfo = util_1.default.getExpressionInfo(this.consequent);
        let alternateInfo = util_1.default.getExpressionInfo(this.alternate);
        //get all unique variable names used in the consequent and alternate, and sort them alphabetically so the output is consistent
        let allUniqueVarNames = [...new Set([...consequentInfo.uniqueVarNames, ...alternateInfo.uniqueVarNames])].sort();
        let mutatingExpressions = [
            ...consequentInfo.expressions,
            ...alternateInfo.expressions
        ].filter(e => e instanceof CallExpression || e instanceof CallfuncExpression || e instanceof DottedGetExpression);
        if (mutatingExpressions.length > 0) {
            result.push(state.sourceNode(this.questionMarkToken, 
            //write all the scope variables as parameters.
            //TODO handle when there are more than 31 parameters
            `(function(__bsCondition, ${allUniqueVarNames.join(', ')})`), state.newline, 
            //double indent so our `end function` line is still indented one at the end
            state.indent(2), state.sourceNode(this.test, `if __bsCondition then`), state.newline, state.indent(1), state.sourceNode((_a = this.consequent) !== null && _a !== void 0 ? _a : this.questionMarkToken, 'return '), ...(_c = (_b = this.consequent) === null || _b === void 0 ? void 0 : _b.transpile(state)) !== null && _c !== void 0 ? _c : [state.sourceNode(this.questionMarkToken, 'invalid')], state.newline, state.indent(-1), state.sourceNode((_d = this.consequent) !== null && _d !== void 0 ? _d : this.questionMarkToken, 'else'), state.newline, state.indent(1), state.sourceNode((_e = this.consequent) !== null && _e !== void 0 ? _e : this.questionMarkToken, 'return '), ...(_g = (_f = this.alternate) === null || _f === void 0 ? void 0 : _f.transpile(state)) !== null && _g !== void 0 ? _g : [state.sourceNode((_h = this.consequent) !== null && _h !== void 0 ? _h : this.questionMarkToken, 'invalid')], state.newline, state.indent(-1), state.sourceNode(this.questionMarkToken, 'end if'), state.newline, state.indent(-1), state.sourceNode(this.questionMarkToken, 'end function)('), ...this.test.transpile(state), state.sourceNode(this.questionMarkToken, `, ${allUniqueVarNames.join(', ')})`));
            state.blockDepth--;
        }
        else {
            result.push(state.sourceNode(this.test, state.bslibPrefix + `_ternary(`), ...this.test.transpile(state), state.sourceNode(this.test, `, `), ...(_k = (_j = this.consequent) === null || _j === void 0 ? void 0 : _j.transpile(state)) !== null && _k !== void 0 ? _k : ['invalid'], `, `, ...(_m = (_l = this.alternate) === null || _l === void 0 ? void 0 : _l.transpile(state)) !== null && _m !== void 0 ? _m : ['invalid'], `)`);
        }
        return result;
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_1.InternalWalkMode.walkExpressions) {
            (0, visitors_1.walk)(this, 'test', visitor, options);
            (0, visitors_1.walk)(this, 'consequent', visitor, options);
            (0, visitors_1.walk)(this, 'alternate', visitor, options);
        }
    }
}
exports.TernaryExpression = TernaryExpression;
class NullCoalescingExpression extends Expression {
    constructor(consequent, questionQuestionToken, alternate) {
        var _a;
        super();
        this.consequent = consequent;
        this.questionQuestionToken = questionQuestionToken;
        this.alternate = alternate;
        this.range = util_1.default.createRangeFromPositions(consequent.range.start, ((_a = alternate !== null && alternate !== void 0 ? alternate : questionQuestionToken) !== null && _a !== void 0 ? _a : consequent).range.end);
    }
    transpile(state) {
        let result = [];
        let consequentInfo = util_1.default.getExpressionInfo(this.consequent);
        let alternateInfo = util_1.default.getExpressionInfo(this.alternate);
        //get all unique variable names used in the consequent and alternate, and sort them alphabetically so the output is consistent
        let allUniqueVarNames = [...new Set([...consequentInfo.uniqueVarNames, ...alternateInfo.uniqueVarNames])].sort();
        let hasMutatingExpression = [
            ...consequentInfo.expressions,
            ...alternateInfo.expressions
        ].find(e => (0, reflection_1.isCallExpression)(e) || (0, reflection_1.isCallfuncExpression)(e) || (0, reflection_1.isDottedGetExpression)(e));
        if (hasMutatingExpression) {
            result.push(`(function(`, 
            //write all the scope variables as parameters.
            //TODO handle when there are more than 31 parameters
            allUniqueVarNames.join(', '), ')', state.newline, 
            //double indent so our `end function` line is still indented one at the end
            state.indent(2), 
            //evaluate the consequent exactly once, and then use it in the following condition
            `__bsConsequent = `, ...this.consequent.transpile(state), state.newline, state.indent(), `if __bsConsequent <> invalid then`, state.newline, state.indent(1), 'return __bsConsequent', state.newline, state.indent(-1), 'else', state.newline, state.indent(1), 'return ', ...this.alternate.transpile(state), state.newline, state.indent(-1), 'end if', state.newline, state.indent(-1), 'end function)(', allUniqueVarNames.join(', '), ')');
            state.blockDepth--;
        }
        else {
            result.push(state.bslibPrefix + `_coalesce(`, ...this.consequent.transpile(state), ', ', ...this.alternate.transpile(state), ')');
        }
        return result;
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_1.InternalWalkMode.walkExpressions) {
            (0, visitors_1.walk)(this, 'consequent', visitor, options);
            (0, visitors_1.walk)(this, 'alternate', visitor, options);
        }
    }
}
exports.NullCoalescingExpression = NullCoalescingExpression;
class RegexLiteralExpression extends Expression {
    constructor(tokens) {
        super();
        this.tokens = tokens;
    }
    get range() {
        return this.tokens.regexLiteral.range;
    }
    transpile(state) {
        var _a, _b;
        let text = (_b = (_a = this.tokens.regexLiteral) === null || _a === void 0 ? void 0 : _a.text) !== null && _b !== void 0 ? _b : '';
        let flags = '';
        //get any flags from the end
        const flagMatch = /\/([a-z]+)$/i.exec(text);
        if (flagMatch) {
            text = text.substring(0, flagMatch.index + 1);
            flags = flagMatch[1];
        }
        let pattern = text
            //remove leading and trailing slashes
            .substring(1, text.length - 1)
            //escape quotemarks
            .split('"').join('" + chr(34) + "');
        return [
            state.sourceNode(this.tokens.regexLiteral, [
                'CreateObject("roRegex", ',
                `"${pattern}", `,
                `"${flags}"`,
                ')'
            ])
        ];
    }
    walk(visitor, options) {
        //nothing to walk
    }
}
exports.RegexLiteralExpression = RegexLiteralExpression;
function expressionToValue(expr, strict) {
    if (!expr) {
        return null;
    }
    if ((0, reflection_1.isUnaryExpression)(expr) && (0, reflection_1.isLiteralNumber)(expr.right)) {
        return numberExpressionToValue(expr.right, expr.operator.text);
    }
    if ((0, reflection_1.isLiteralString)(expr)) {
        //remove leading and trailing quotes
        return expr.token.text.replace(/^"/, '').replace(/"$/, '');
    }
    if ((0, reflection_1.isLiteralNumber)(expr)) {
        return numberExpressionToValue(expr);
    }
    if ((0, reflection_1.isLiteralBoolean)(expr)) {
        return expr.token.text.toLowerCase() === 'true';
    }
    if ((0, reflection_1.isArrayLiteralExpression)(expr)) {
        return expr.elements
            .filter(e => !(0, reflection_1.isCommentStatement)(e))
            .map(e => expressionToValue(e, strict));
    }
    if ((0, reflection_1.isAALiteralExpression)(expr)) {
        return expr.elements.reduce((acc, e) => {
            if (!(0, reflection_1.isCommentStatement)(e)) {
                acc[e.keyToken.text] = expressionToValue(e.value, strict);
            }
            return acc;
        }, {});
    }
    return strict ? null : expr;
}
function numberExpressionToValue(expr, operator = '') {
    if ((0, reflection_1.isIntegerType)(expr.type) || (0, reflection_1.isLongIntegerType)(expr.type)) {
        return parseInt(operator + expr.token.text);
    }
    else {
        return parseFloat(operator + expr.token.text);
    }
}
//# sourceMappingURL=Expression.js.map
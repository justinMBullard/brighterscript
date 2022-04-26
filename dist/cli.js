#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const path = require("path");
const ProgramBuilder_1 = require("./ProgramBuilder");
const vscode_languageserver_1 = require("vscode-languageserver");
const util_1 = require("./util");
let options = yargs
    .usage('$0', 'BrighterScript, a superset of Roku\'s BrightScript language')
    .help('help', 'View help information about this tool.')
    .option('create-package', { type: 'boolean', defaultDescription: 'true', description: 'Creates a zip package. This setting is ignored when deploy is enabled.' })
    .option('source-map', { type: 'boolean', defaultDescription: 'false', description: 'Enables generating sourcemap files, which allow debugging tools to show the original source code while running the emitted files.' })
    .option('cwd', { type: 'string', description: 'Override the current working directory.' })
    .option('copy-to-staging', { type: 'boolean', defaultDescription: 'true', description: 'Copy project files into the staging folder, ready to be packaged.' })
    .option('diagnostic-level', { type: 'string', defaultDescription: '"warn"', description: 'Specify what diagnostic types should be printed to the console. Value can be "error", "warn", "hint", "info".' })
    .option('plugins', { type: 'array', alias: 'plugin', description: 'A list of scripts or modules to add extra diagnostics or transform the AST.' })
    .option('deploy', { type: 'boolean', defaultDescription: 'false', description: 'Deploy to a Roku device if compilation succeeds. When in watch mode, this will deploy on every change.' })
    .option('emit-full-paths', { type: 'boolean', defaultDescription: 'false', description: 'Emit full paths to files when encountering diagnostics.' })
    .option('files', { type: 'array', description: 'The list of files (or globs) to include in your project. Be sure to wrap these in double quotes when using globs.' })
    .option('host', { type: 'string', description: 'The host used when deploying to a Roku.' })
    .option('ignore-error-codes', { type: 'array', description: 'A list of error codes that the compiler should NOT emit, even if encountered.' })
    .option('log-level', { type: 'string', defaultDescription: '"log"', description: 'The log level. Value can be "error", "warn", "log", "info", "debug".' })
    .option('out-file', { type: 'string', description: 'Path to the zip folder containing the bundled project. Defaults to `./out/[YOUR_ROOT_FOLDER_NAME].zip' })
    .option('password', { type: 'string', description: 'The password for deploying to a Roku.' })
    .option('project', { type: 'string', description: 'Path to a bsconfig.json project file.' })
    .option('retain-staging-folder', { type: 'boolean', defaultDescription: 'false', description: 'Prevent the staging folder from being deleted after creating the package.' })
    .option('root-dir', { type: 'string', description: 'Path to the root of your project files (where the manifest lives). Defaults to current directory.' })
    .option('staging-folder-path', { type: 'string', description: 'The path where the files should be staged (right before being zipped up).' })
    .option('username', { type: 'string', defaultDescription: '"rokudev"', description: 'The username for deploying to a Roku.' })
    .option('source-root', { type: 'string', description: 'Override the root directory path where debugger should locate the source files. The location will be embedded in the source map to help debuggers locate the original source files. This only applies to files found within rootDir. This is useful when you want to preprocess files before passing them to BrighterScript, and want a debugger to open the original files.' })
    .option('watch', { type: 'boolean', defaultDescription: 'false', description: 'Watch input files.' })
    .option('require', { type: 'array', description: 'A list of modules to require() on startup. Useful for doing things like ts-node registration.' })
    .check(argv => {
    var _a;
    const diagnosticLevel = argv.diagnosticLevel;
    //if we have the diagnostic level and it's not a known value, then fail
    if (diagnosticLevel && ['error', 'warn', 'hint', 'info'].includes(diagnosticLevel) === false) {
        throw new Error(`Invalid diagnostic level "${diagnosticLevel}". Value can be "error", "warn", "hint", "info".`);
    }
    const cwd = path.resolve(process.cwd(), (_a = argv.cwd) !== null && _a !== void 0 ? _a : process.cwd());
    //cli-provided plugin paths should be relative to cwd
    util_1.default.resolvePathsRelativeTo(argv, 'plugins', cwd);
    //cli-provided require paths should be relative to cwd
    util_1.default.resolvePathsRelativeTo(argv, 'require', cwd);
    return true;
})
    .argv;
let builder = new ProgramBuilder_1.ProgramBuilder();
builder.run(options).then(() => {
    //if this is a single run (i.e. not watch mode) and there are error diagnostics, return an error code
    const hasError = !!builder.getDiagnostics().find(x => x.severity === vscode_languageserver_1.DiagnosticSeverity.Error);
    if (builder.options.watch === false && hasError) {
        process.exit(1);
    }
}).catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map
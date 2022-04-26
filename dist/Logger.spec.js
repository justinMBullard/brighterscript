"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const Logger_1 = require("./Logger");
const chalk_1 = require("chalk");
const sinon_1 = require("sinon");
const sinon = (0, sinon_1.createSandbox)();
describe('Logger', () => {
    let logger;
    beforeEach(() => {
        logger = new Logger_1.Logger(Logger_1.LogLevel.trace);
        sinon.restore();
        //disable chalk colors for testing
        sinon.stub(chalk_1.default, 'grey').callsFake((arg) => arg);
    });
    it('noop does nothing', () => {
        (0, Logger_1.noop)();
    });
    it('loglevel setter converts string to enum', () => {
        logger.logLevel = 'error';
        (0, chai_1.expect)(logger.logLevel).to.eql(Logger_1.LogLevel.error);
        logger.logLevel = 'info';
        (0, chai_1.expect)(logger.logLevel).to.eql(Logger_1.LogLevel.info);
    });
    it('uses LogLevel.log by default', () => {
        logger = new Logger_1.Logger();
        (0, chai_1.expect)(logger.logLevel).to.eql(Logger_1.LogLevel.log);
    });
    describe('log methods call correct error type', () => {
        it('error', () => {
            const stub = sinon.stub(logger, 'writeToLog').callsFake(() => { });
            logger.error();
            (0, chai_1.expect)(stub.getCalls()[0].args[0]).to.eql(console.error);
        });
        it('warn', () => {
            const stub = sinon.stub(logger, 'writeToLog').callsFake(() => { });
            logger.warn();
            (0, chai_1.expect)(stub.getCalls()[0].args[0]).to.eql(console.warn);
        });
        it('log', () => {
            const stub = sinon.stub(logger, 'writeToLog').callsFake(() => { });
            logger.log();
            (0, chai_1.expect)(stub.getCalls()[0].args[0]).to.eql(console.log);
        });
        it('info', () => {
            const stub = sinon.stub(logger, 'writeToLog').callsFake(() => { });
            logger.info();
            (0, chai_1.expect)(stub.getCalls()[0].args[0]).to.eql(console.info);
        });
        it('debug', () => {
            const stub = sinon.stub(logger, 'writeToLog').callsFake(() => { });
            logger.debug();
            (0, chai_1.expect)(stub.getCalls()[0].args[0]).to.eql(console.debug);
        });
        it('trace', () => {
            const stub = sinon.stub(logger, 'writeToLog').callsFake(() => { });
            logger.trace();
            (0, chai_1.expect)(stub.getCalls()[0].args[0]).to.eql(console.trace);
        });
    });
    it('skips all errors on error level', () => {
        logger.logLevel = Logger_1.LogLevel.off;
        const stub = sinon.stub(logger, 'writeToLog').callsFake(() => { });
        logger.trace();
        logger.debug();
        logger.info();
        logger.log();
        logger.warn();
        logger.error();
        (0, chai_1.expect)(stub.getCalls().map(x => x.args[0])).to.eql([]);
    });
    it('does not skip when log level is high enough', () => {
        logger.logLevel = Logger_1.LogLevel.trace;
        const stub = sinon.stub(logger, 'writeToLog').callsFake(() => { });
        logger.trace();
        logger.debug();
        logger.info();
        logger.log();
        logger.warn();
        logger.error();
        (0, chai_1.expect)(stub.getCalls().map(x => x.args[0])).to.eql([
            console.trace,
            console.debug,
            console.info,
            console.log,
            console.warn,
            console.error
        ]);
    });
    describe('time', () => {
        it('calls action even if logLevel is wrong', () => {
            logger.logLevel = Logger_1.LogLevel.error;
            const spy = sinon.spy();
            logger.time(Logger_1.LogLevel.info, null, spy);
            (0, chai_1.expect)(spy.called).to.be.true;
        });
        it('runs timer when loglevel is right', () => {
            logger.logLevel = Logger_1.LogLevel.log;
            const spy = sinon.spy();
            logger.time(Logger_1.LogLevel.log, null, spy);
            (0, chai_1.expect)(spy.called).to.be.true;
        });
        it('returns value', () => {
            logger.logLevel = Logger_1.LogLevel.log;
            const spy = sinon.spy(() => {
                return true;
            });
            (0, chai_1.expect)(logger.time(Logger_1.LogLevel.log, null, spy)).to.be.true;
            (0, chai_1.expect)(spy.called).to.be.true;
        });
        it('gives callable pause and resume functions even when not running timer', () => {
            logger.time(Logger_1.LogLevel.info, null, (pause, resume) => {
                pause();
                resume();
            });
        });
        it('waits for and returns a promise when a promise is returned from the action', () => {
            (0, chai_1.expect)(logger.time(Logger_1.LogLevel.info, ['message'], () => {
                return Promise.resolve();
            })).to.be.instanceof(Promise);
        });
    });
});
//# sourceMappingURL=Logger.spec.js.map
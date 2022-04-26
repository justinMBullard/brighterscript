"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const sinon = require("sinon");
const Logger_1 = require("./Logger");
const PluginInterface_1 = require("./PluginInterface");
describe('PluginInterface', () => {
    let pluginInterface;
    beforeEach(() => {
        pluginInterface = new PluginInterface_1.default([], new Logger_1.Logger());
    });
    it('allows adding a plugin', () => {
        const beforePublish = sinon.spy();
        const plugin = {
            name: 'allows adding a plugin',
            beforePublish: beforePublish
        };
        pluginInterface.emit('beforePublish', undefined, []);
        pluginInterface.add(plugin);
        pluginInterface.emit('beforePublish', undefined, []);
        (0, chai_1.expect)(beforePublish.callCount).to.equal(1);
    });
    it('allows testing whether a plugin is registered', () => {
        const plugin = {
            name: 'allows testing whether a plugin is registered'
        };
        (0, chai_1.expect)(pluginInterface.has(plugin)).to.be.false;
        pluginInterface.add(plugin);
        (0, chai_1.expect)(pluginInterface.has(plugin)).to.be.true;
    });
    it('does not allows adding a plugin multiple times', () => {
        const beforePublish = sinon.spy();
        const plugin = {
            name: 'does not allows adding a plugin multiple times',
            beforePublish: beforePublish
        };
        pluginInterface.add(plugin);
        pluginInterface.add(plugin);
        pluginInterface.emit('beforePublish', undefined, []);
        (0, chai_1.expect)(beforePublish.callCount).to.equal(1);
        pluginInterface.remove(plugin);
        (0, chai_1.expect)(pluginInterface.has(plugin)).to.be.false;
    });
    it('allows removing a plugin', () => {
        const beforePublish = sinon.spy();
        const plugin = {
            name: 'allows removing a plugin',
            beforePublish: beforePublish
        };
        pluginInterface.add(plugin);
        pluginInterface.emit('beforePublish', undefined, []);
        (0, chai_1.expect)(beforePublish.callCount).to.equal(1);
        pluginInterface.remove(plugin);
        pluginInterface.emit('beforePublish', undefined, []);
        (0, chai_1.expect)(beforePublish.callCount).to.equal(1);
    });
});
//# sourceMappingURL=PluginInterface.spec.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Cache_1 = require("./Cache");
const chai_1 = require("chai");
describe('Cache', () => {
    let cache;
    beforeEach(() => {
        cache = new Cache_1.Cache();
    });
    describe('getOrAdd', () => {
        it('adds items to the cache', () => {
            cache.getOrAdd('bool', () => {
                return true;
            });
            (0, chai_1.expect)(cache.getOrAdd('bool', () => false)).to.be.true;
        });
    });
    describe('clear', () => {
        it('works', () => {
            cache.getOrAdd('bool', () => {
                return true;
            });
            (0, chai_1.expect)(cache.getOrAdd('bool', () => false)).to.be.true;
            cache.clear();
            (0, chai_1.expect)(cache.getOrAdd('bool', () => false)).to.be.false;
        });
    });
});
//# sourceMappingURL=Cache.spec.js.map
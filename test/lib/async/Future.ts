import chai, { expect } from 'chai';
import cap from 'chai-as-promised';
chai.use(cap);

import { Future } from '../../../src/lib/async/Future';

describe('Future', () => {
    it('Should construct', () => {
        const value = new Future();
        expect(value).to.exist;
    });
    it('Should have a resolve and reject property', () => {
        const value = new Future();
        expect(value).to.have.property('resolve');
        expect(value).to.have.property('reject');
    });
    it('Calling resolve should resolve the promise', () => {
        const value = new Future();
        value.resolve(123);
        return expect(value).to.eventually.equal(123);
    });
    it('Calling reject should reject the promise', () => {
        const value = new Future();
        value.reject(new Error('boop'));
        return expect(value).to.be.rejectedWith(Error);
    });
    it('Calling resolve should return from await', async () => {
        const value = new Future();
        value.resolve(123);
        expect(await value).to.equal(123);
    });
    it('Calling reject should throw an error from await', async () => {
        const value = new Future();
        value.reject(new Error('boop'));
        try {
            await value;
        }
        catch (e) {
            expect(e).to.exist.and.be.an.instanceOf(Error).with.property('message', 'boop');
        }
    });
});

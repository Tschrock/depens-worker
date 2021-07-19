import { expect } from 'chai';
import { firstIndexNotOf, lastIndexNotOf, makeSafeString, splitFirst, trimEnd, trimStart } from '../../src/lib/util';

describe('makeSafeString', () => {
    it('Should encode control characters', () => {
        const testString = '\u{0}foo\u{7}bar\u{1B}baz';
        const result = makeSafeString(testString);
        expect(result).to.equal('\\x00foo\\x07bar\\x1Bbaz');
    });
});

describe('splitFirst', () => {
    it('Should split things', () => {
        const result = splitFirst('foo bar baz', ' ');
        expect(result).to.deep.equal(['foo', 'bar baz']);
    });

    it('Should split at the beginning', () => {
        const result = splitFirst(' foo bar baz', ' ');
        expect(result).to.deep.equal(['', 'foo bar baz']);
    });

    it('Should split at the end', () => {
        const result = splitFirst('foobarbaz ', ' ');
        expect(result).to.deep.equal(['foobarbaz', '']);
    });

    it('Should handle no seperator', () => {
        const result = splitFirst('foobarbaz', ' ');
        expect(result).to.deep.equal(['foobarbaz']);
    });

    it('Should split things with long seperator', () => {
        const result = splitFirst('foo bar baz', ' bar ');
        expect(result).to.deep.equal(['foo', 'baz']);
    });
});

describe('firstIndexNotOf', () => {
    it('Should find the first index not of', () => {
        const result = firstIndexNotOf(' /// /   // foo //   / baz', [' ', '/']);
        expect(result).to.equal(12);
    });

    it('Should handle strings with no matching characters', () => {
        const result = firstIndexNotOf('foobar', ['x']);
        expect(result).to.equal(0);
    });

    it('Should handle strings with only matching characters', () => {
        const result = firstIndexNotOf('aaaaaa', ['a']);
        expect(result).to.equal(6);
    });

    it('Should handle empty strings', () => {
        const result = firstIndexNotOf('', ['a']);
        expect(result).to.equal(0);
    });

    it('Should handle empty characters', () => {
        const result = firstIndexNotOf('foo bar baz', []);
        expect(result).to.equal(0);
    });
});

describe('lastIndexNotOf', () => {
    it('Should find the last index not of', () => {
        const result = lastIndexNotOf('foo //   / baz /// /   // ', [' ', '/']);
        expect(result).to.equal(13);
    });

    it('Should handle strings with no matching characters', () => {
        const result = lastIndexNotOf('foobar', ['x']);
        expect(result).to.equal(5);
    });

    it('Should handle strings with only matching characters', () => {
        const result = lastIndexNotOf('aaaaaa', ['a']);
        expect(result).to.equal(-1);
    });

    it('Should handle empty strings', () => {
        const result = lastIndexNotOf('', ['a']);
        expect(result).to.equal(-1);
    });

    it('Should handle empty characters', () => {
        const result = lastIndexNotOf('foo bar baz', []);
        expect(result).to.equal(10);
    });
});

describe('trimStart', () => {
    it('Should trim from the start', () => {
        const result = trimStart(' /// /   // foo //   / baz', [' ', '/']);
        expect(result).to.equal('foo //   / baz');
    });

    it('Should handle strings with no matching characters', () => {
        const result = trimStart('foobar', ['x']);
        expect(result).to.equal('foobar');
    });

    it('Should handle strings with only matching characters', () => {
        const result = trimStart('aaaaaa', ['a']);
        expect(result).to.equal('');
    });

    it('Should handle empty strings', () => {
        const result = trimStart('', ['a']);
        expect(result).to.equal('');
    });

    it('Should handle empty characters', () => {
        const result = trimStart('foo bar baz', []);
        expect(result).to.equal('foo bar baz');
    });
});

describe('trimEnd', () => {
    it('Should trim from the start', () => {
        const result = trimEnd('foo //   / baz /// /   // ', [' ', '/']);
        expect(result).to.equal('foo //   / baz');
    });

    it('Should handle strings with no matching characters', () => {
        const result = trimEnd('foobar', ['x']);
        expect(result).to.equal('foobar');
    });

    it('Should handle strings with only matching characters', () => {
        const result = trimEnd('aaaaaa', ['a']);
        expect(result).to.equal('');
    });

    it('Should handle empty strings', () => {
        const result = trimEnd('', ['a']);
        expect(result).to.equal('');
    });

    it('Should handle empty characters', () => {
        const result = trimEnd('foo bar baz', []);
        expect(result).to.equal('foo bar baz');
    });
});

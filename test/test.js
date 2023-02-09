const assert = require('assert');

describe('Test addition of two numbers', () => {
    it('should add two numbers correctly', () => {
        const num1 = 2;
        const num2 = 3;
        const expectedSum = 5;

        const actualSum = num1 + num2;
        assert.equal(actualSum, expectedSum);
    });
});

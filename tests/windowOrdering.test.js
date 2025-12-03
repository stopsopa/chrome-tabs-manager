const assert = require('assert');
const { 
    levenshteinDistance, 
    generateNewOrder 
} = require('../extension/lib/windowOrdering.js');

console.log('Running windowOrdering tests...');

// Test Levenshtein
console.log('Test: Levenshtein Distance');
assert.strictEqual(levenshteinDistance(['a', 'b'], ['a', 'b']), 0, 'Identical arrays should have 0 distance');
assert.strictEqual(levenshteinDistance(['a', 'b'], ['a', 'c']), 1, 'Substitution should be 1');
assert.strictEqual(levenshteinDistance(['a', 'b'], ['a']), 1, 'Deletion should be 1');
assert.strictEqual(levenshteinDistance(['a'], ['a', 'b']), 1, 'Insertion should be 1');
assert.strictEqual(levenshteinDistance([], ['a', 'b']), 2, 'Empty to 2 items should be 2');
console.log('PASS');

// Test generateNewOrder
console.log('Test: generateNewOrder');

const stored = [
    ['A', 'B', 'C'], // Window 1
    ['D', 'E'],      // Window 2
    ['F', 'G', 'H']  // Window 3
];

const fresh = [
    ['F', 'G', 'X'], // Similar to Window 3 (dist 1)
    ['A', 'B'],      // Similar to Window 1 (dist 1)
    ['D', 'E', 'Z'], // Similar to Window 2 (dist 1)
    ['New']          // New window
];

// Expected order:
// 1. Match for stored[0] ('A','B','C') -> fresh[1] ('A','B')
// 2. Match for stored[1] ('D','E')     -> fresh[2] ('D','E','Z')
// 3. Match for stored[2] ('F','G','H') -> fresh[0] ('F','G','X')
// 4. Remainder                         -> fresh[3] ('New')

const result = generateNewOrder(fresh, stored);

assert.strictEqual(result.length, 4, 'Should have all fresh windows');
assert.deepStrictEqual(result[0], ['A', 'B'], 'First should be A,B');
assert.deepStrictEqual(result[1], ['D', 'E', 'Z'], 'Second should be D,E,Z');
assert.deepStrictEqual(result[2], ['F', 'G', 'X'], 'Third should be F,G,X');
assert.deepStrictEqual(result[3], ['New'], 'Fourth should be New');

console.log('PASS');

// Test: Empty stored
console.log('Test: Empty stored');
const resEmpty = generateNewOrder(fresh, []);
assert.deepStrictEqual(resEmpty, fresh, 'Should return fresh as is if stored is empty');
console.log('PASS');

// Test: Empty fresh
console.log('Test: Empty fresh');
const resFreshEmpty = generateNewOrder([], stored);
assert.deepStrictEqual(resFreshEmpty, [], 'Should return empty if fresh is empty');
console.log('PASS');

console.log('All tests passed!');

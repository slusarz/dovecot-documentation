import { describe, test } from 'node:test'
import assert from 'node:assert'
import { normalizeArrayData } from '../lib/utility.js'

describe('normalizeArrayData', () => {
	test('Normalize string to array', () => {
		const data = {
			item1: {
				foo: 'bar'
			}
		}
		const keys = ['foo']
		const result = normalizeArrayData(data, keys)
		assert.deepStrictEqual(result.item1.foo, ['bar'])
	})

	test('Initialize missing keys as empty array', () => {
		const data = {
			item1: {}
		}
		const keys = ['foo']
		const result = normalizeArrayData(data, keys)
		assert.deepStrictEqual(result.item1.foo, [])
	})

	test('Handles already array values', () => {
		const data = {
			item1: {
				foo: ['bar']
			}
		}
		const keys = ['foo']
		const result = normalizeArrayData(data, keys)
		assert.deepStrictEqual(result.item1.foo, ['bar'])
	})

	test('Handles multiple keys', () => {
		const data = {
			item1: {
				foo: 'bar',
				baz: null
			}
		}
		const keys = ['foo', 'baz']
		const result = normalizeArrayData(data, keys)
		assert.deepStrictEqual(result.item1.foo, ['bar'])
		assert.deepStrictEqual(result.item1.baz, [])
	})

	test('Handles multiple items', () => {
		const data = {
			item1: { foo: 'bar' },
			item2: { foo: 'baz' }
		}
		const keys = ['foo']
		const result = normalizeArrayData(data, keys)
		assert.deepStrictEqual(result.item1.foo, ['bar'])
		assert.deepStrictEqual(result.item2.foo, ['baz'])
	})

	test('Handles empty data object', () => {
		const data = {}
		const keys = ['tags']
		const result = normalizeArrayData(data, keys)
		assert.deepStrictEqual(result, {})
	})

	test('Skips falsy values', () => {
		const data = {
			item1: null,
			item2: undefined,
			item3: false,
			item4: 0,
			item5: ''
		}
		const keys = ['tags']
		const result = normalizeArrayData(data, keys)
		// Should remain unchanged as the loop checks `if (v)`
		assert.strictEqual(result.item1, null)
		assert.strictEqual(result.item2, undefined)
		assert.strictEqual(result.item3, false)
		assert.strictEqual(result.item4, 0)
		assert.strictEqual(result.item5, '')
	})
})

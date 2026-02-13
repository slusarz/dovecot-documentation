import { test, describe } from 'node:test'
import assert from 'node:assert'
import { getDoveadmCmdLine, doveadm_arg_types } from '../lib/doveadm.js'

describe('getDoveadmCmdLine', () => {
	test('Return an empty string when no arguments are provided', () => {
		assert.strictEqual(getDoveadmCmdLine({}), '')
	})

	test('Skip hidden arguments', () => {
		const args = {
			foo: { hidden: true, positional: true }
		}
		assert.strictEqual(getDoveadmCmdLine(args), '')
	})

	test('Handle required positional arguments', () => {
		const args = {
			'user-mask': { positional: true }
		}
		assert.strictEqual(getDoveadmCmdLine(args), '<user mask>')
	})

	test('Handle optional positional arguments', () => {
		const args = {
			mailbox: { positional: true, optional: true }
		}
		assert.strictEqual(getDoveadmCmdLine(args), '[mailbox]')
	})

	test('Handle boolean CLI arguments with short flag', () => {
		const args = {
			'all-users': { cli: 'A', type: doveadm_arg_types.BOOL }
		}
		assert.strictEqual(getDoveadmCmdLine(args), '[-A]')
	})

	test('Handle boolean CLI arguments without short flag', () => {
		const args = {
			'verbose': { type: doveadm_arg_types.BOOL }
		}
		assert.strictEqual(getDoveadmCmdLine(args), '[--verbose]')
	})

	test('Handle non-boolean CLI arguments with short flag', () => {
		const args = {
			'socket-path': { cli: 'S', type: doveadm_arg_types.STRING }
		}
		assert.strictEqual(getDoveadmCmdLine(args), '[-S socket-path]')
	})

	test('Handle non-boolean CLI arguments without short flag', () => {
		const args = {
			'user': { type: doveadm_arg_types.STRING }
		}
		assert.strictEqual(getDoveadmCmdLine(args), '[--user user]')
	})

	test('Handle multiple arguments of different types', () => {
		const args = {
			'all-users': { cli: 'A', type: doveadm_arg_types.BOOL },
			'user': { cli: 'u', type: doveadm_arg_types.STRING },
			'mailbox': { positional: true, optional: true }
		}
		assert.strictEqual(getDoveadmCmdLine(args), '[-A] [-u user] [mailbox]')
	})

	test('Handle positional arguments with hyphens replaced by spaces', () => {
		const args = {
			'multiple-word-arg': { positional: true }
		}
		assert.strictEqual(getDoveadmCmdLine(args), '<multiple word arg>')
	})
})

import * as cheerio from 'cheerio'
import fetch from 'node-fetch'
import pLimit from 'p-limit'

const limit = pLimit(10) // Check 10 links concurrently
const linkCache = new Map()
const brokenLinks = new Map()

function isExcluded(url, exclusions) {
	for (const e of exclusions) {
		if (((typeof e === 'string') && (url === e)) ||
			((exclusion instanceof RegExp) && exclusion.test(url))) {
			return true
		}
	}
	return false
}

async function performCheck(url) {
	const fetchOpts = {
		headers: {
			'User-Agent': 'Mozilla/5.0 (compatible; VitepressLinkChecker/1.0)'
		},
		signal: AbortSignal.timeout(10000) // 10s timeout
	}

	try {
		let response = await fetch(url, { ...fetchOpts, method: 'HEAD' })

		// If HEAD fails (e.g., 405 Method Not Allowed), fall back to GET
		if (!response.ok && response.status !== 404) {
			response = await fetch(url, { ...fetchOpts, method: 'GET' })
		}

		return { ok: response.ok, status: response.status }
	} catch (error) {
		return { ok: false, status: error.message }
	}
}

function checkLink(url, page) {
	let promise = linkCache.get(url)

	if (!promise) {
		promise = limit(() => performCheck(url))
		linkCache.set(url, promise)
	}

	promise.then(status => {
		if (!status.ok) {
			if (!brokenLinks.has(url)) {
				brokenLinks.set(url, { status: status.status, pages: new Set() })
			}
			brokenLinks.get(url).pages.add(page)
		}
	}).catch(err => {
		console.error(`Link checking failed for ${url}:`, err)
	})

	return promise
}

export function linkCheck(code, id, ctx, exclusions) {
	const $ = cheerio.load(code)
	const links = $('a[href^="http://"], a[href^="https://"]')

	links.each((_, el) => {
		const href = $(el).attr('href')
		if (href && !isExcluded(href, exclusions)) {
			checkLink(href, id)
		}
	})
}

export async function linkReport() {
	// Wait for all checks to complete
	await Promise.all(linkCache.values())

	if (brokenLinks.size) {
		console.warn('\n⚠️  Broken External Links Found:\n')
		for (const [url, info] of brokenLinks.entries()) {
			console.warn(`URL: ${url}`)
			console.warn(`Status: ${info.status}`)
			console.warn(`Found on pages:`)
			for (const page of info.pages) {
				console.warn(`  - ${page}`)
			}
			console.warn('---')
		}
	}
}

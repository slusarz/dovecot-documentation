/**
 * Auto-link common topics across documentation pages.
 *
 * This script automates the creation of cross-links between documentation
 * pages to improve discoverability and navigation.
 *
 * It is intended to be run occasionally by and admin, and then the results
 * be manually reviewed and added (e.g. git add -p).
 *
 * Workflow:
 * 1. Scanning Phase: Iterates through all Markdown files in the `docs/`
 *    directory to collect `dovecotlinks` defined in frontmatter.
 * 2. Mapping Phase: Builds a master map of topics, associating each key with
 *    a target URL (handling path rewrites if configured) and default display
 *    text.
 * 3. Processing Phase: Scans every document's content (excluding frontmatter)
 *    to find the first occurrence of each topic.
 *    - Priority 1: Exact match of the topic key.
 *    - Priority 2: Fallback to the topic's display text (unless generic).
 * 4. Protection Logic: Ensures links are not inserted inside code blocks,
 *    HTML tags, Markdown images, or existing links.
 * 5. Update Phase: Inserts the `[[link,key,text]]` syntax. If a link already
 *    exists but a new occurrence is found earlier in the page, the link is
 *    moved to the earlier position.
 *
 * Safety Features:
 * - Generic word list prevents linking common English terms.
 * - Self-link prevention: Pages will not link to topics they define.
 * - Dry-run mode: Preview changes without modifying files.
 *
 * Usage: From the project root, run:
 *   node util/auto_link.js --help
 **/

import { Command } from 'commander'
import fg from 'fast-glob'
import fs from 'fs'
import matter from 'gray-matter'
import { dovecotSettingBootstrap } from '../lib/utility.js'

const program = new Command()
program
	.name('auto_link.js')
	.description('Auto-link common topics across documentation pages.')
	.option('-n, --dry-run', "don't write files, just print changes")
	.option('-c, --check', "remove duplicate links (keep only the first occurrence)")
	.argument('[files...]', 'files to process (default: all docs)')
	.parse()

const dryRun = program.opts().dryRun
const checkDuplicates = program.opts().check
const files = program.args

/* Link keys considered too generic to auto-link. */
const GENERIC_KEYS = new Set([
	'debug', 'mail', 'mailbox', 'testing', 'time',
])

/* Pre-compiled regular expressions for performance. */
const RE_EXISTING_LINK = /\[\[([^,\]]+),([^,\]]+)(?:,([^\]]*))?\]\]/g
const RE_FENCED_CODE = /```[\s\S]*?```/g
const RE_INLINE_CODE = /`[^`]*`/g
const RE_HTML_TAG = /<[^>]+>/g
const RE_MD_IMAGE = /!\[[^\]]*\]\([^)]+\)/g
const RE_MD_LINK = /\[[^\]]+\]\([^)]+\)/g
const RE_MD_HEADER = /^#{1,6}\s.*$/gm
const RE_WORD_BOUNDARY = /[a-zA-Z0-9_\-]/
const RE_ANY_TAG = /\[\[[\s\S]*?\]\]/g

/** Build the dovecotlinks map from all documentation files. **/
async function buildLinkMap() {
	const links = {}
	const doc_paths = await dovecotSettingBootstrap('doc_paths')
	const files = doc_paths.flatMap((x) => fg.sync(x))

	for (const filePath of files) {
		try {
			const str = fs.readFileSync(filePath, 'utf8')
			const data = matter(str).data

			if (!data.dovecotlinks) {
				continue
			}

			for (const [ key, value ] of Object.entries(data.dovecotlinks)) {
				/* Respect the first occurrence of a link key. */
				if (links[key]) {
					continue
				}

				let text
				if (typeof value === 'object') {
					text = value.text ?? key
				} else {
					text = value ?? key
				}

				links[key] = {
					key: key,
					file: filePath,
					text: text
				}
			}
		} catch (err) {
			if (err.code !== 'ENOENT') {
				console.error('Error reading ' + filePath + ': ' + err.message)
			}
		}
	}

	/* Sort topics by key length (longest first) to avoid partial matches
	 * and filter out generic keys. */
	return Object.values(links)
		.filter((link) => !isGeneric(link.key))
		.sort((a, b) => b.key.length - a.key.length)
}

/** Check if a word is too generic to auto-link. **/
function isGeneric(word) {
	const lower = word.toLowerCase()
	return GENERIC_KEYS.has(lower) || lower.startsWith('settings_types_')
}

/**
 * Parse all existing [[type,key,text]] or [[type,key]] patterns from content.
 * Returns an object containing a map of first-occurrence links and all ranges.
 **/
function parseExistingLinks(content) {
	const links = {}
	const ranges = []
	const allLinks = []
	let match

	RE_EXISTING_LINK.lastIndex = 0
	while ((match = RE_EXISTING_LINK.exec(content)) !== null) {
		const type = match[1]
		const key = match[2]
		const text = match[3] ?? key
		const start = match.index
		const end = match.index + match[0].length

		ranges.push({ start, end })

		const linkInfo = { type, key, text, start, end }
		allLinks.push(linkInfo)

		/* Store only the first occurrence for replacement priority logic. */
		if (!links[key]) {
			links[key] = linkInfo
		}
	}

	return { links, ranges, allLinks }
}

/** Compute protected ranges in content that should not be auto-linked. **/
function getProtectedRanges(content, existingLinkRanges) {
	const protectedRanges = [ ...existingLinkRanges ]

	/* Internal helper to collect regex matches into protected ranges. */
	const addMatches = (re) => {
		let match
		re.lastIndex = 0
		while ((match = re.exec(content)) !== null) {
			protectedRanges.push({ start: match.index, end: match.index + match[0].length })
		}
	}

	addMatches(RE_FENCED_CODE)
	addMatches(RE_INLINE_CODE)
	addMatches(RE_HTML_TAG)
	addMatches(RE_MD_IMAGE)
	addMatches(RE_MD_LINK)
	addMatches(RE_MD_HEADER)
	addMatches(RE_ANY_TAG)

	return protectedRanges
}

/** Check if a character range overlaps with any protected range. **/
function isProtected(start, end, protectedRanges) {
	for (const range of protectedRanges) {
		if (start < range.end && end > range.start) {
			return true
		}
	}
	return false
}

/**
 * Find the first valid (unprotected, whole-word) occurrence of a search
 * string.
 **/
function findFirstOccurrence(content, searchStr, protectedRanges) {
	const lowerContent = content.toLowerCase()
	const lowerSearch = searchStr.toLowerCase()
	let searchPos = 0

	while (searchPos < content.length) {
		const idx = lowerContent.indexOf(lowerSearch, searchPos)

		if (idx === -1) {
			return -1
		}

		const matchEnd = idx + searchStr.length

		/* Skip if any part of the match is inside a protected region. */
		if (isProtected(idx, matchEnd, protectedRanges)) {
			searchPos = idx + 1
			continue
		}

		/* Verify word boundaries to avoid matching substrings. */
		const before = idx > 0 ? content[idx - 1] : ''
		const after = matchEnd < content.length ? content[matchEnd] : ''

		if (RE_WORD_BOUNDARY.test(before) || RE_WORD_BOUNDARY.test(after)) {
			searchPos = idx + 1
			continue
		}

		return idx
	}

	return -1
}

/**
 * Process a single file to identify required auto-linking changes.
 **/
function findChanges(filePath, content, topics) {
	/* Detect and skip the frontmatter section. */
	let searchContent = content
	let contentOffset = 0
	if (content.startsWith('---')) {
		const end = content.indexOf('---', 3)
		if (end !== -1) {
			/* Skip past the closing marker and the following newline. */
			let nextLine = content.indexOf('\n', end)
			if (nextLine === -1) {
				nextLine = end + 3
			} else {
				nextLine++
			}
			searchContent = content.substring(nextLine)
			contentOffset = nextLine
		}
	}

	const existingInfo = parseExistingLinks(searchContent)
	const protectedRanges = getProtectedRanges(searchContent, existingInfo.ranges)
	const existingLinks = existingInfo.links

	const changes = []

	/* Handle logic for removing duplicate links (keeping only the first one). */
	if (checkDuplicates) {
		for (const link of existingInfo.allLinks) {
			/* If this is not the first occurrence of this key, remove it. */
			if (link !== existingLinks[link.key]) {
				changes.push({
					start: link.start + contentOffset,
					end: link.end + contentOffset,
					replacement: link.text
				})
			}
		}
	}

	for (const linkData of topics) {
		/* Avoid self-linking (linking a topic to the page where it is
		 * defined). */
		if (linkData.file === filePath) {
			continue
		}

		const existingLink = existingLinks[linkData.key]

		/* Search priority 1: Topic key. */
		let idx = findFirstOccurrence(searchContent, linkData.key, protectedRanges)
		let matchLen = linkData.key.length

		/* Search priority 2: Display text (unless generic). */
		if (idx === -1) {
			if (isGeneric(linkData.text)) {
				continue
			}
			idx = findFirstOccurrence(searchContent, linkData.text, protectedRanges)
			matchLen = linkData.text.length
		}

		if (idx === -1) {
			continue
		}

		const matchPos = idx + contentOffset

		/* Handle logic for moving links to the first occurrence. */
		if (existingLink) {
			const existingPos = existingLink.start + contentOffset

			/* If an existing link is already the first occurrence, skip. */
			if (existingPos < matchPos) {
				continue
			}

			const originalText = searchContent.substring(idx, idx + matchLen)
			const replacement = `[[link,${linkData.key},${originalText}]]`

			/* Insert link at the new first occurrence. */
			changes.push({
				start: matchPos,
				end: matchPos + matchLen,
				replacement: replacement
			})
			protectedRanges.push({ start: idx, end: idx + matchLen })

			/* Convert the old later link back to plain text. */
			changes.push({
				start: existingLink.start + contentOffset,
				end: existingLink.end + contentOffset,
				replacement: linkData.text
			})
		} else {
			/* No existing link: simply insert the new one. */
			const originalText = searchContent.substring(idx, idx + matchLen)
			const replacement = `[[link,${linkData.key},${originalText}]]`

			changes.push({
				start: matchPos,
				end: matchPos + matchLen,
				replacement: replacement
			})
			protectedRanges.push({ start: idx, end: idx + matchLen })
		}
	}

	return changes
}

/** Apply identified changes to file content. **/
function applyChanges(content, changes) {
	/* Apply changes from end to start to preserve index accuracy. */
	const sorted = changes.sort((a, b) => b.start - a.start)

	let result = content
	for (const change of sorted) {
		result = result.substring(0, change.start) +
			change.replacement +
			result.substring(change.end)
	}

	return result
}

/** Main execution loop. **/
async function main() {
	const topics = await buildLinkMap()

	if (topics.length === 0) {
		console.log('No dovecotlinks found in any documentation pages.')
		return
	}

	console.log(`Found ${topics.length} topics to link.\n`)

	const filesList = files.length > 0 ? files :
		(await dovecotSettingBootstrap('doc_paths'))
			.flatMap((x) => fg.sync(x))
	let changedCount = 0
	let totalLinks = 0

	for (const filePath of filesList) {
		const content = fs.readFileSync(filePath, 'utf8')
		const changes = findChanges(filePath, content, topics)

		if (changes.length === 0) {
			continue
		}

		totalLinks += changes.length

		if (dryRun) {
			console.log('File: ' + filePath)
			for (const change of changes) {
				const line = content.substring(0, change.start).split('\n').length
				const originalText = content.substring(change.start, change.end)
				console.log(`  L${line}: "${originalText}" -> "${change.replacement}"`)
			}
		} else {
			const result = applyChanges(content, changes)
			fs.writeFileSync(filePath, result, 'utf8')
			changedCount++
			console.log('Updated: ' + filePath)
		}
	}

	console.log(`\nDone. ${changedCount} files updated, ${totalLinks} total links added.`)
}

main()

import { dataFileList, publicDataDir } from './datafiles.js'
import { dovecotMdInit } from './markdown.js'
import fs from 'fs'

let has_run = false

export default function dovecotVitepressInit() {
	return {
		name: 'dovecot-vitepress-init',
		async configResolved(config) {
			/*** Init Dovecot Markdown. ***/

			/* We need to synchronously initialize markdown,
			 * since we need to pre-populate various internal
			 * tables (e.g. links). */
			await dovecotMdInit()
			console.log('\n✅ Dovecot Markdown initialized.')

			/*** Create static downloadable data files. ***/

			if (has_run) {
				return
			}
			has_run = true

			/* Clean old data files (if they exist) and prepare directory. */
			await fs.promises.rm(publicDataDir, { force: true, recursive: true });
			await fs.promises.mkdir(publicDataDir, { recursive: true });
			console.log(`✅ Data files: Created ${publicDataDir}.`)

			/* Build the data files. */
			await Promise.all(dataFileList.map(async (d) => {
				fs.promises.writeFile(
					d.json,
					JSON.stringify(await d.data(), null, 2)
				)
				console.log(`✅ Data files: Generated ${d.json}.`)
			}))
		}
	}
}

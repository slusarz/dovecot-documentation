/* Spellcheck utility for Dovecot documentation.
 *
 * This script checks for spelling errors in markdown and javascript files.
 */

import { Command } from 'commander';
import { glob } from 'glob';
import fs from 'fs';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import { checkText } from 'cspell-lib';
import { parser } from '@lezer/javascript';
import inquirer from 'inquirer';

const MARKDOWN_CONTENT_NODES = ['paragraph', 'heading', 'text', 'strong', 'emphasis', 'link', 'listItem'];
const DICTIONARY_PATH = 'dict/exceptions.json';

const program = new Command();

program
  .name('spellcheck')
  .description('Spellcheck utility for Dovecot documentation.')
  .option('-m, --markdown', 'Scan markdown files in docs/')
  .option('-j, --javascript', 'Scan javascript files in data/')
  .option('-i, --interactive', 'Interactive mode to add words to the dictionary')
  .option('-d', '--debug', 'Enable debug mode')
  .parse(process.argv);

const options = program.opts();

if (!options.markdown && !options.javascript) {
  options.markdown = true;
  options.javascript = true;
}

if (options.debug) {
  console.log('Options:', options);
}

async function scanFiles(options) {
  const patterns = [];
  if (options.markdown) {
    patterns.push('docs/**/*.md', 'docs/**/*.inc');
  }
  if (options.javascript) {
    patterns.push('data/**/*.js');
  }
  return await glob(patterns);
}

async function main() {
  const files = await scanFiles(options);
  if (options.debug) {
    console.log('Files to scan:', files);
  }

  const dictionary = await loadDictionary();
  if (options.debug) {
    console.log('Loaded dictionary:', dictionary);
  }
  const results = await spellcheckFiles(files, options, dictionary);

  if (options.interactive) {
    await interactiveMode(results, dictionary);
  } else {
    printResults(results);
  }
}

async function loadDictionary() {
  try {
    const data = await fs.promises.readFile(DICTIONARY_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function spellcheckFiles(files, options, dictionary) {
  const results = {};
  for (const file of files) {
    if (options.debug) {
      console.log('Scanning file:', file);
    }
    const errors = [];
    const ignoreWords = dictionary[file] || [];
    if (options.debug) {
      console.log(`Ignoring words for ${file}:`, ignoreWords);
    }
    if (file.endsWith('.md') || file.endsWith('.inc')) {
      errors.push(...(await spellcheckMarkdown(file, ignoreWords)));
    } else if (file.endsWith('.js')) {
      errors.push(...(await spellcheckJavascript(file, ignoreWords)));
    }
    if (errors.length > 0) {
      results[file] = errors;
    }
  }
  return results;
}

async function spellcheckMarkdown(file, ignoreWords) {
  const content = await fs.promises.readFile(file, 'utf8');
  const { data: frontmatter, content: markdown } = matter(content);

  const errors = [];

  // Spellcheck frontmatter
  const frontmatterErrors = await spellcheckObject(frontmatter, ignoreWords);
  errors.push(...frontmatterErrors);

  // Spellcheck markdown content
  const processor = unified().use(remarkParse);
  const tree = processor.parse(markdown);

  const textNodes = [];
  visit(tree, (node) => {
    if (MARKDOWN_CONTENT_NODES.includes(node.type) && node.value) {
      textNodes.push(node.value);
    }
  });

  const text = textNodes.join(' ');
  const words = text.split(/[\s,`\[\]\(\)\/:.'"|{}\t\n\r\\<>&~#=]+/);

  for (const word of words) {
    if (word.length > 0 && !ignoreWords.includes(word)) {
      const spellcheckResult = await checkText(word, {});
      if (spellcheckResult.items.length > 0) {
        if (options.debug) {
          console.log(`Found spelling error: "${word}" in file: ${file}`);
        }
        errors.push(word);
      }
    }
  }

  return errors;
}

async function spellcheckObject(obj, ignoreWords) {
  const errors = [];
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === 'string') {
      const words = value.split(/[\s,`\[\]\(\)\/:.'"|{}\t\n\r\\<>&~#=]+/);
      for (const word of words) {
        if (word.length > 0 && !ignoreWords.includes(word)) {
          const spellcheckResult = await checkText(word, {});
          if (spellcheckResult.items.length > 0) {
            if (options.debug) {
              console.log(`Found spelling error in frontmatter: "${word}"`);
            }
            errors.push(word);
          }
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      errors.push(...(await spellcheckObject(value, ignoreWords)));
    }
  }
  return errors;
}

async function spellcheckJavascript(file, ignoreWords) {
  const content = await fs.promises.readFile(file, 'utf8');
  const tree = parser.parse(content);
  const errors = [];
  const textToSpellcheck = [];

  tree.iterate({
    enter: (node) => {
      if (node.type.name === 'String' || node.type.name === 'LineComment' || node.type.name === 'BlockComment') {
        textToSpellcheck.push(content.substring(node.from, node.to));
      }
    },
  });

  const text = textToSpellcheck.join(' ');
  const words = text.split(/[\s,`\[\]\(\)\/:.'"|{}\t\n\r\\<>&~#=]+/);

  for (const word of words) {
    if (word.length > 0 && !ignoreWords.includes(word)) {
      const spellcheckResult = await checkText(word, {});
      if (spellcheckResult.items.length > 0) {
        if (options.debug) {
          console.log(`Found spelling error: "${word}" in file: ${file}`);
        }
        errors.push(word);
      }
    }
  }

  return errors;
}

function printResults(results) {
  for (const file in results) {
    console.log(`\nSpelling errors in ${file}:`);
    for (const error of results[file]) {
      console.log(`- ${error}`);
    }
  }
}

async function interactiveMode(results, dictionary) {
  for (const file in results) {
    for (const error of results[file]) {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: `Spelling error in ${file}: "${error}". What do you want to do?`,
          choices: ['ignore', 'skip'],
        },
      ]);

      if (answers.action === 'ignore') {
        if (!dictionary[file]) {
          dictionary[file] = [];
        }
        dictionary[file].push(error);
        await saveDictionary(dictionary);
        console.log(`Added "${error}" to the dictionary for ${file}.`);
      }
    }
  }
}

async function saveDictionary(dictionary) {
  await fs.promises.writeFile(DICTIONARY_PATH, JSON.stringify(dictionary, null, 2));
}

main();

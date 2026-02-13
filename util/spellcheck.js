#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { Command } from 'commander';
import * as cspell from 'cspell-lib';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import matter from 'gray-matter';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import fg from 'fast-glob';
import { visit } from 'unist-util-visit';
import { parents } from 'unist-util-parents';

const program = new Command();

program
  .name('spellcheck')
  .description('Spellcheck markdown and data files locally')
  .option('--markdown', 'Scan markdown files in docs/')
  .option('--data', 'Scan javascript data files in data/')
  .option('--interactive', 'Interactive mode to add exceptions')
  .option('--debug', 'Output debug information')
  .parse(process.argv);

const options = program.opts();

const DEBUG = options.debug;
const INTERACTIVE = options.interactive;

const EXCEPTIONS_FILE = path.join(process.cwd(), 'dict', 'exceptions.json');

// Configuration for Markdown
const ALLOWABLE_MARKDOWN_NODES = [
  'paragraph',
  'heading',
  'blockquote',
  'list',
  'listItem',
  'emphasis',
  'strong',
  'link',
  'image',
  'table',
  'tableRow',
  'tableCell'
];

// Load exceptions
let exceptions = {};

function loadExceptions() {
  if (fs.existsSync(EXCEPTIONS_FILE)) {
    try {
      const content = fs.readFileSync(EXCEPTIONS_FILE, 'utf8');
      exceptions = JSON.parse(content);
    } catch (e) {
      console.error('Error loading exceptions file:', e);
      exceptions = {};
    }
  } else {
    if (DEBUG) console.log('No exceptions file found, starting fresh.');
    exceptions = {};
  }
}

function saveExceptions() {
  try {
    // Sort keys and values for consistency
    const sortedExceptions = {};
    Object.keys(exceptions).sort().forEach(key => {
      sortedExceptions[key] = exceptions[key].sort();
    });
    fs.writeFileSync(EXCEPTIONS_FILE, JSON.stringify(sortedExceptions, null, 2) + '\n');
    if (DEBUG) console.log('Exceptions saved.');
  } catch (e) {
    console.error('Error saving exceptions file:', e);
  }
}

async function main() {
  if (!options.markdown && !options.data) {
    program.help();
    return;
  }

  loadExceptions();

  // Load CSpell settings
  const config = await cspell.loadConfig('cspell.json');
  const settings = cspell.mergeSettings(await cspell.getDefaultSettings(), config);

  let allIssues = [];

  // Helper to check text
  async function checkText(text, file, line, col = 0) {
    if (!text || !text.trim()) return;

    // We use cspell-lib's checkText.
    // It returns a promise resolving to check result.
    // However, checkText takes 'text' and 'settings'.
    // It doesn't seem to support file-specific settings easily unless we construct them.
    // But for now, we pass the global settings.

    try {
      const languageIds = cspell.getLanguageIdsForBaseFilename(file);
      const fileSettings = cspell.constructSettingsForText(settings, text, languageIds);
      const result = await cspell.checkText(text, fileSettings);

      for (const item of result.items) {
        if (item.isError) {
          const word = item.text;

          // Check if ignored in exceptions.json
          if (exceptions[file] && exceptions[file].includes(word)) {
            continue;
          }

          const prefix = text.substring(0, item.startPos);
          const lines = prefix.split('\n');
          const lineOffset = lines.length - 1;
          const currentLine = line + lineOffset;
          // If on first line of chunk, col is base + offset.
          // If on subsequent lines, col is offset from last newline (which is lines[lines.length-1].length).
          const colOffset = lines[lines.length - 1].length;
          const currentCol = (lineOffset === 0 ? col : 1) + colOffset; // Assuming col is 1-based

          const contextStart = Math.max(0, item.startPos - 20);
          const contextEnd = Math.min(text.length, item.endPos + 20);
          const contextSnippet = text.substring(contextStart, contextEnd).replace(/\n/g, ' ');

          allIssues.push({
            file,
            line: currentLine,
            col: currentCol,
            word,
            context: contextSnippet
          });
        }
      }
    } catch (e) {
      if (DEBUG) console.error(`Failed to check text in ${file}:`, e);
    }
  }

  // Markdown Scanning
  if (options.markdown) {
    if (DEBUG) console.log('Scanning markdown files...');
    const files = await fg('docs/**/*.{md,inc}', { dot: true });

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const { data, content: markdownBody } = matter(content);

      // Check Frontmatter
      const checkFrontmatter = async (obj) => {
        if (typeof obj === 'string') {
          await checkText(obj, file, 1); // Line 1 is approximate for frontmatter
        } else if (typeof obj === 'object' && obj !== null) {
          for (const key in obj) {
            await checkFrontmatter(obj[key]);
          }
        }
      };
      await checkFrontmatter(data);

      // Check Markdown Body
      const tree = unified().use(remarkParse).parse(markdownBody);
      const treeWithParents = parents(tree);

      const nodesToCheck = [];

      visit(treeWithParents, ['text', 'image'], (node) => {
        let textToCheck = null;
        if (node.type === 'text') textToCheck = node.value;
        if (node.type === 'image') textToCheck = node.alt;

        if (!textToCheck) return;

        let p = node.parent;
        let isAllowable = false;
        while (p) {
          if (ALLOWABLE_MARKDOWN_NODES.includes(p.type)) {
            isAllowable = true;
            break;
          }
          p = p.parent;
        }
        if (isAllowable) {
          nodesToCheck.push({ value: textToCheck, position: node.position });
        }
      });

      for (const node of nodesToCheck) {
        // Adjust line number because frontmatter strips lines?
        // gray-matter returns content without frontmatter.
        // But unified parse line numbers are relative to the start of 'markdownBody'.
        // We need to offset by frontmatter length.
        // Actually, let's just use the position from remark, which is relative to the string passed.
        // If we want absolute line number in file, we need to add lines of frontmatter.
        const frontmatterLines = content.substring(0, content.length - markdownBody.length).split('\n').length - 1;

        await checkText(node.value, file, node.position.start.line + frontmatterLines, node.position.start.column);
      }
    }
  }

  if (options.data) {
    if (DEBUG) console.log('Scanning data files...');
    const files = await fg('data/**/*.js');

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const comments = [];

      try {
        const ast = acorn.parse(content, {
          ecmaVersion: 2020,
          sourceType: 'module',
          locations: true,
          onComment: comments
        });

        // Check comments
        for (const comment of comments) {
          await checkText(comment.value, file, comment.loc.start.line, comment.loc.start.column);
        }

        const nodesToCheck = [];

        // Walk AST for string literals
        walk.ancestor(ast, {
          Literal(node, ancestors) {
            if (typeof node.value !== 'string') return;

            const parent = ancestors[ancestors.length - 2];
            if (parent) {
              // Ignore Object keys
              if (parent.type === 'Property' && parent.key === node) return;
              // Ignore MemberExpression properties (obj['prop'])
              if (parent.type === 'MemberExpression' && parent.property === node) return;
              // Ignore Import sources
              if (parent.type === 'ImportDeclaration' || parent.type === 'ExportNamedDeclaration' || parent.type === 'ExportAllDeclaration') return;
            }

            nodesToCheck.push({
              text: node.value,
              line: node.loc.start.line,
              col: node.loc.start.column
            });
          },
          TemplateLiteral(node, ancestors) {
            // Check template literals too?
            // "Spellchecking should only occur in leaf values".
            // Template literals are often used for multiline strings in data files.
            // But they can contain expressions.
            // We should check the quasis (parts of the string).

            // Check parent to avoid keys if computed property names are used?
            const parent = ancestors[ancestors.length - 2];
            if (parent) {
              if (parent.type === 'Property' && parent.key === node) return;
              if (parent.type === 'MemberExpression' && parent.property === node) return;
            }

            for (const quasi of node.quasis) {
              if (quasi.value.cooked) {
                nodesToCheck.push({
                  text: quasi.value.cooked,
                  line: quasi.loc.start.line,
                  col: quasi.loc.start.column
                });
              }
            }
          }
        });

        for (const node of nodesToCheck) {
          await checkText(node.text, file, node.line, node.col);
        }
      } catch (e) {
        console.error(`Error parsing ${file}:`, e);
      }
    }
  }

  // Interactive handling logic placeholder
  if (INTERACTIVE && allIssues.length > 0) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

    console.log(`\nFound ${allIssues.length} issues.`);

    for (const issue of allIssues) {
      // Check if already ignored (in case we ignored it in a previous iteration for the same file)
      if (exceptions[issue.file] && exceptions[issue.file].includes(issue.word)) {
        continue;
      }

      console.log(`\nFile: ${issue.file}:${issue.line}:${issue.col}`);
      console.log(`Word: ${issue.word}`);
      console.log(`Context: ...${issue.context}...`);

      let answer = '';
      while (!['i', 's', 'q'].includes(answer)) {
        answer = (await askQuestion('(i)gnore for this file, (s)kip, (q)uit: ')).trim().toLowerCase();
      }

      if (answer === 'q') {
        break;
      } else if (answer === 'i') {
        if (!exceptions[issue.file]) {
          exceptions[issue.file] = [];
        }
        if (!exceptions[issue.file].includes(issue.word)) {
          exceptions[issue.file].push(issue.word);
        }
        console.log(`Added '${issue.word}' to exceptions for ${issue.file}`);
      }
    }

    rl.close();
    saveExceptions();

    // Check remaining issues after interactive session to determine exit code?
    // If user quit, we might still have issues.
    // If user ignored all, we are good?
    // We should probably re-check or just rely on the fact that we handled them.
    // But for simplicity, if we are in interactive mode, we assume user handled what they wanted.
    // However, typical lint behavior is to exit 0 only if no errors remain.
    // If user skipped some, exit 1.

    // Let's filter allIssues against updated exceptions
    const remaining = allIssues.filter(issue =>
      !exceptions[issue.file] || !exceptions[issue.file].includes(issue.word)
    );

    if (remaining.length > 0) {
      console.log(`\n${remaining.length} issues remaining.`);
      process.exit(1);
    } else {
      console.log('\nNo issues remaining.');
    }

  } else if (allIssues.length > 0) {
    // Non-interactive mode
    for (const issue of allIssues) {
      console.log(`${issue.file}:${issue.line}:${issue.col} - Misspelled word: ${issue.word}`);
    }
    process.exit(1);
  } else {
    if (options.markdown || options.data) {
      console.log('No spelling issues found.');
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

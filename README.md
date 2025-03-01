# dovecot-ce-documentation

Static website content for Dovecot CE documentation.

## Site Generation Software

The site is statically generated via the
[VitePress](https://www.vitepress.dev/) framework.

VitePress is a JavaScript application.  The content pages use markdown, with
the ability to layer additional VitePress (and [Vue](https://www.vuejs.org))
functionality on top of it, i.e. the ability to use templates/variables to
generate page content.

Most maintenance tasks on the JavaScript code use simple functionality using
basic JavaScript components. The Mozilla reference page might be useful if
there are any questions:
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference

Markdown reference: https://www.markdownguide.org/

Configuration of VitePress is in the `.vitepress/config.js` file.

### Prerequisites

From [VitePress](https://vitepress.dev/guide/getting-started#prerequisites):

* Node.js **version 18+**
  * Alternatively, Bun (https://bun.sh/) can be used instead.

> [!WARNING]
> Ubuntu 22.04 LTS (and prior) does NOT contain a new enough version of nodejs.
>
> Either run in a container (see https://hub.docker.com/_/node) or install
> via out-of-band packages (see https://github.com/nodesource/distributions).

## Installation

> [!NOTE]
> Instead of `npm` you can use any compatible node package managing software:
> `pnpm`, `yarn`, `bun`, etc.

To install, run:

```sh
npm install
```

## Local Testing Server

VitePress provides a local development server that will do real-time updates
when source files change.

> [!IMPORTANT]
> This must be run from the base of the project!

Run with:

```sh
npm run docs:dev
```

> [!NOTE]
> Certain features (such as search) will not work in testing/dev mode and
> require the documentation to be statically built and served.

## Documentation Generation

To generate the static documentation, run:

```sh
npm run docs:build
```

Generated documentation will be output in the `docs/.vitepress/dist` directory.
The statically generated documentation can be displayed locally by running:

```sh
npm run docs:preview
```

### Debugging

Depending on when an issue occurs, errors may be displayed on the development
screen (and in the terminal where the `docs:dev` command is being run).

However, some errors only occur when viewing a page, and will oftentimes
result in a blank or incomplete page render. In these cases, looking at the
browser developer console will generally show the error that has occurred.

## Docker Container

An updated Docker container is produced after every code addition, and can be
used to view the documentation locally.

Container installation information can be found at:
https://github.com/dovecot/documentation/pkgs/container/documentation

The container exposes a web server on port 80, and the documentation is available
in the `2.4` directory.

### Example

Provide access to Dovecot documentation at `http://localhost:8080/`:

```sh
docker run --rm \
  -p 8080:80 \
  ghcr.io/dovecot/documentation:latest
```

## Dovecot-specific VitePress Features

### Directory Structure

`docs/` contains the pages to be rendered by VitePress into the site.

### Sidebar Generation

The sidebar is automatically generated via the
[vitepress-sidebar](https://github.com/jooy2/vitepress-sidebar) plugin.

It will create the sidebar based on the file layout in the `docs/` directory.

The title is configured via the `title` parameter in the
[frontmatter](https://vitepress.dev/guide/frontmatter) content of the page.

Any page can be excluded from output by setting the `exclude` parameter to
`true` in the frontmatter content of the page.

Header titles can be set via the `index.md` file in the folder. This file
can be hidden by setting the `exclude` parameter to `true`.

### Dovecot Data Generation

Dovecot has several systems (configuration, doveadm, events, etc.) that can
be added throughout the code and need a way to collect and handle the
documentation in a single location.

This is accomplished by maintaining a "database" of these elements in a
special data file. These data files can then be processed via simple javascript
and HTML templating to vastly simplify the output of this common data.

Additionally, this allows this information to be maintained in a single place
and shown on multiple pages. For example, it is useful on a plugins page to
show all configuration settings related to that plugin, but it is also useful
to have a page that shows all information on all plugin settings.

The data files live in the base `/data` directory. Each file attempts to be
self-documenting, but they are all essentially large JSON objects. Developers
should need to know basically no JavaScript to be able to edit the files.

### Dovecot VitePress Configuration

Additional configuration options required for VitePress static generation are
defined using the `dovecot` object in the `themeConfig` VitePress
configuration setting.

#### data_paths

Allows custom mapping of data sources.

It is used by the VitePress data loaders to determine what data to
load for export.

Keys are data identifiers, Values are location RELATIVE TO `<base>/lib`
DIRECTORY.

#### gitrev

Configures how the current git revision information is displayed in the
page footer.

##### align

Alignment of the text. Either `left` or `right`.

##### hash

The git hash of the branch tip.

#### man_includes

A list of additional paths (other than the `include/` directory of the man
folder) where include files can live.

#### man_paths

A listing of paths containing man files.
Paths are relative to project base.

Supports fast-glob: https://github.com/mrmlnc/fast-glob#pattern-syntax

#### markdown_extend

An object containing callbacks that enable additional labels to support in
Dovecot-specific markdown processing (i.e. [[xyz,...]]).

##### open

Opening tag function. Returns opening tag.

The opts argument contains a "resolveURL" key that allows access to the
internal Dovecot Markdown `resolveURL()` function.

Example: `open: (mode, parts, opts, env) => { return '' }`

##### body

Body function. Returns body text.

Example: `body: (mode, env) => { return '' }`

##### close

Close tag function. Returns closing tag.

Example: `close: (mode, env) => { return '' }`

#### plugin_paths

A listing of paths containing plugin files.
Paths are relative to project base.

Supports fast-glob: https://github.com/mrmlnc/fast-glob#pattern-syntax

#### url_rewrite

A callback where Markdown generated URLs can be rewritten.
Function is called the original URL and returns the (modified) URL.

Example: `url_rewrite: (url) => { return url + '.foo' }`

#### watch_paths

An array of file patterns to watch to refresh data loaders in dev mode.
See: https://vitepress.dev/guide/data-loading#data-from-local-files
Paths are relative to project base.

Supports fast-glob: https://github.com/mrmlnc/fast-glob#pattern-syntax

### Dovecot Markdown Extensions

Markdown has been extended to allow various Dovecot-specific tasks to be
performed.

This Markdown works in both the base pages and in many database fields
(see documentation in `data/*.data.js` for the fields that support Markdown).

> [!NOTE]
> All Dovecot extended Markdown commands are wrapped in `[[...]]` syntax.

#### Doveadm Commands

***Syntax: `[[doveadm,command_string(,args)]]` (args is optional)***

`command_string` should NOT include "doveadm" - this will automatically be
added in the output.

If args is set, it is appended to the display as doveadm arguments. Example:

```
# [[doveadm,foo,--bar &lt;baz&gt;]] results in:
<a href="PATH_TO_FOO_COMMAND">doveadm foo --bar &lt;baz&gt;</a>
```

#### Events

***Syntax: `[[event,event_name]]`***

`event_name` is the name of the Dovecot event to link to.

#### Link

***Syntax: `[[link,tag(,optional_text)]]`***

VitePress does not support inter-documentation linking, by default.

However, this wiki-like linking is useful and has been custom implemented
in Dovecot's implementation of VitePress.

Dovecot linking "tags" are defined in a page's Frontmatter (the YAML at
the top of the page) under the `dovecotlinks` key.

`dovecotlinks` keys are the link tags.  Values are one of two formats:

* If text, this the default text associated with the tag. A link to this tag
  will link the to base page.
* If an object, it must define two sub-keys: `hash` and `text`
  * `hash` is the anchor on the page to link to when using the tag. The '#'
    MUST not be present. Hash strings can be determined by mousing over
    headers on a page. (Roughly: every non-character is converted to '-'.)
  * `text` is the default text for the tag.

#### Man Pages

***Syntax: `[[man,command_name(,hash,section)]]`***

Links to the man page.

`command_name` is the command to link to (e.g., `doveconf`).

Hash is the section number.  It defaults to empty.

Section is the section number.  It defaults to `1`.

#### Plugin

***Syntax: `[[plugin,plugin_name(,text)]]`***

Links to the plugin page.

If `text` is set, it is used as the link text instead of the plugin name.

#### RFC

***Syntax: `[[rfc,rfc_number(,section)]]`***

Links to the RFC page (external).

`section` is optional and will link to the RFC subsection.

#### Settings

***Syntax: `[[setting,setting_name(,args)]]`***
***Syntax: `[[setting_text,setting_name(,text)]]`***

For the `setting` variant, if args is set, it is appended to the display as a
setting value. Example:

```
# [[setting,foo,5]] results in:
<a href="PATH_TO_FOO_SETTING">foo = 5</a>
```

For the `setting_text` variant, if text is set, it is used as the link text.
Example:

```
# [[setting_text,foo,bar]] results in:
<a href="PATH_TO_FOO_SETTING">bar</a>
```

#### Variable

***Syntax: `[[variable(,section)]]`***

Link to the Settings Variable page.

By default, links to the base page.

If section is defined, will link to the sub-section. Valid sub-sections:

* `auth`
* `settings` (default)
* `global`
* `login`
* `mail-service-user`
* `mail-user`

#### Updates (added, changed, deprecated, removed)

***Syntax: `[[(update),tag_name]]`***

Create a update tag based on a tag_name.

The tag_name must be defined in `data/updates.js`.

Example: `[[changed,tag_name]]`

### Other Markdown Extensions

#### TODO Container

***Syntax:***

```
::: todo
TODO text contents
:::
```

Outputs a formatted TODO container, using the (optional) TODO text contents
as the body.

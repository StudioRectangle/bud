const {join, resolve} = require(`path`)
const npm2yarn = require(`@docusaurus/remark-plugin-npm2yarn`)

const config = require(`../../../../config/monorepo.config.cjs`)
const themeConfig = require(`./docusaurus.theme.cjs`)

const presetClassic = require.resolve(`@docusaurus/preset-classic`)
const pluginBlog = require.resolve(`@docusaurus/plugin-content-blog`)
const pluginDocs = require.resolve(`@docusaurus/plugin-content-docs`)
const pluginSearch = require.resolve(`docusaurus-lunr-search`)

const docsPath = path => resolve(__dirname, `..`, path ?? ``)

const sidebarPath = docsPath(`sidebars/docs.cjs`)

const remarkPlugins = [[npm2yarn, {sync: true}]]

module.exports = {
  baseUrl: `/`,
  customFields: config,
  favicon: config.organization.favicon,
  onBrokenLinks: `warn`,
  onBrokenMarkdownLinks: `warn`,
  organizationName: config.organization.name,
  plugins: [
    [
      pluginBlog,
      {
        blogDescription: config.description,
        blogSidebarTitle: `Recent releases`,
        blogTitle: `Releases`,
        feedOptions: {
          description: config.description,
          title: `${config.name} releases`,
        },
        id: `releases`,
        path: docsPath(`generated/releases`),
        remarkPlugins,
        routeBasePath: `releases`,
        showReadingTime: true,
        tagsBasePath: `tags`,
      },
    ],
    [
      pluginDocs,
      {
        editUrl: join(config.url.web, `edit/main/sources/@repo/docs/`),
        id: `dev`,
        include: [`**/*.md`, `**/*.mdx`],
        path: docsPath(`content/dev`),
        remarkPlugins,
        routeBasePath: `dev`,
        sidebarPath: docsPath(`sidebars/sidebar.cjs`),
      },
    ],
    [
      pluginDocs,
      {
        editUrl: join(config.url.web, `edit/main/sources/@repo/docs/`),
        id: `guides`,
        include: [`**/*.md`, `**/*.mdx`],
        path: docsPath(`content/guides`),
        remarkPlugins,
        routeBasePath: `guides`,
        sidebarPath: docsPath(`sidebars/guides.cjs`),
      },
    ],
    [
      pluginDocs,
      {
        editUrl: join(config.url.web, `edit/main/sources/@repo/docs/`),
        id: `extensions`,
        include: [`**/*.md`, `**/*.mdx`],
        path: docsPath(`content/extensions`),
        routeBasePath: `extensions`,
        sidebarPath: docsPath(`sidebars/sidebar.cjs`),
      },
    ],
    [
      pluginSearch,
      {
        excludeRoutes: [`blog/**/*`, `pages/**/*`],
      },
    ],
  ],
  presets: [
    [
      presetClassic,
      {
        blog: {
          path: docsPath(`content/blog`),
          showReadingTime: true,
        },
        docs: {
          editUrl: join(config.url.web, `edit/main/sources/@repo/docs/`),
          path: docsPath(`content/docs`),
          remarkPlugins,
          sidebarPath,
        },
        pages: {
          path: docsPath(`content/pages`),
        },
        theme: {
          customCss: docsPath(`src/css/custom.css`),
        },
      },
    ],
  ],
  projectName: config.name,
  scripts: [
    {
      [`data-website-id`]: `1b6eddea-80b8-46fa-b237-ab32eeb44b68`,
      defer: true,
      src: `https://analytics.umami.is/script.js`,
    },
  ],
  tagline: config.description,
  themeConfig,
  title: config.name,
  trailingSlash: false,
  url: config.url.docs,
}

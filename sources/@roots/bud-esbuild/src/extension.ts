import {type Bud} from '@roots/bud-framework'
import {Extension} from '@roots/bud-framework/extension'
import {
  bind,
  expose,
  label,
  options,
} from '@roots/bud-framework/extension/decorators'
import Value from '@roots/bud-support/value'
import {EsbuildPlugin} from 'esbuild-loader'

/**
 * Esbuild options
 */
export interface Options {
  /**
   * JS settings
   */
  js: {
    loader: `js` | `jsx`
    target: string
  }
  /**
   * Minify settings
   */
  minify: {
    /**
     * Esbuild should minify CSS
     */
    css: boolean
    /**
     * Patterns to be excluded from minimization
     */
    exclude: Array<RegExp | string> | RegExp | string
    /**
     * Patterns to be minified
     */
    include: Array<RegExp | string> | RegExp | string
  }

  /**
   *TS settings
   */
  ts: {
    loader: `ts` | `tsx`
    target: string
    tsconfig: string
  }
}

/**
 * `BudEsbuild` configures Bud to process JS and TS with esbuild-loader
 */
@label(`@roots/bud-esbuild`)
@expose(`esbuild`)
@options({
  js: Value.make(() => ({
    loader: `jsx`,
    target: `es2015`,
  })),
  minify: Value.make(app => ({
    css: true,
    exclude: app.hooks.filter(`pattern.modules`),
    include: [
      app.hooks.filter(`pattern.css`),
      app.hooks.filter(`pattern.js`),
      app.hooks.filter(`pattern.ts`),
    ],
  })),
  ts: Value.make(({context}) => ({
    loader: `tsx`,
    target: `es2015`,
    tsconfig: context.files[`tsconfig`]?.path ?? null,
  })),
})
export default class BudEsbuild extends Extension<Options> {
  /**
   * {@link Extension.boot}
   */
  @bind
  public override async boot(_bud: Bud) {
    this.use()
  }

  /**
   * {@link Extension.register}
   */
  @bind
  public override async register({build, hooks}: Bud) {
    const loader = await this.resolve(`esbuild-loader`, import.meta.url)
    if (!loader) return this.logger.error(`Esbuild loader not found`)

    hooks.on(`build.resolve.extensions`, ext => ext.add(`.ts`).add(`.tsx`))
    hooks.on(`build.resolveLoader.alias`, (aliases = {}) => ({
      ...aliases,
      [`esbuild-loader`]: loader,
    }))

    build.setLoader(`esbuild`, `esbuild-loader`)

    build.setItem(`esbuild-js`, {
      loader: `esbuild`,
      options: () => this.get(`js`),
    })

    build.setItem(`esbuild-ts`, {
      loader: `esbuild`,
      options: () => this.get(`ts`),
    })

    build.getRule(`js`).setUse(items => [...items, `esbuild-js`])
  }

  /**
   * Use esbuild
   *
   * @remarks
   * This method is called automatically when the extension is booted.
   *
   * If you have multiple compilers installed you may need to call this manually.
   *
   * @example
   * ```js
   * bud.esbuild.use()
   * ```
   */
  @bind
  public use(): Bud[`esbuild`] {
    this.app.minify.js.enable(false)
    this.app.minify.css.enable(false)

    this.app.hooks
      .on(`build.optimization.minimizer`, minimizer => [
        new EsbuildPlugin(this.get(`minify`)),
      ])
      .build.setRule(`ts`, {
        include: [({path}) => path(`@src`)],
        resolve: {
          fullySpecified: false,
        },
        test: ({hooks}) => hooks.filter(`pattern.ts`),
        use: [`esbuild-ts`],
      })
      .rules.js.setUse([`esbuild-js`])

    this.app.hooks.on(
      `build.resolve.extensions`,
      (extensions = new Set()) =>
        extensions
          .add(`.ts`)
          .add(`.jsx`)
          .add(`.tsx`)
          .add(`.mts`)
          .add(`.cts`),
    )

    return this
  }
}

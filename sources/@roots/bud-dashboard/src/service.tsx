import type {Bud} from '@roots/bud-framework'
import type {
  StatsCompilation,
  StatsError,
} from '@roots/bud-framework/config'
import type {Dashboard as BudDashboard} from '@roots/bud-framework/services'
import type {BudHandler} from '@roots/bud-support/errors'

import {stderr, stdin, stdout} from 'node:process'

import {makeErrorFormatter} from '@roots/bud-dashboard/helpers/formatErrors'
import {Service} from '@roots/bud-framework/service'
import {bind} from '@roots/bud-support/decorators/bind'
import {Box, type ReactElement, render} from '@roots/bud-support/ink'
import isUndefined from '@roots/bud-support/lodash/isUndefined'
import patchConsole from '@roots/bud-support/patch-console'

import {Application, TeletypeApplication} from './application.js'
import {Console} from './console/index.js'

type Compilations = Array<Omit<StatsCompilation, `children`>>

/**
 * {@link BudDashboard} implementation
 */
export class Dashboard extends Service implements BudDashboard {
  /**
   * {@link BudDashboard.formatStatsErrors}
   */
  public declare formatStatsErrors: (errors: StatsError[]) => StatsError[]

  /**
   * {@link BudDashboard.instance}
   */
  public declare instance?: BudDashboard[`instance`]

  /**
   * {@link BudDashboard.messages}
   */
  public declare messages: BudDashboard[`messages`]

  /**
   * Restore console function
   *
   * @remarks
   * Returned from {@link patchConsole} call. Restores
   * the normal {@link console} behavior.
   */
  public declare restore?: () => any

  /**
   * {@link BudDashboard.stats}
   */
  public declare stats?: StatsCompilation

  /**
   * {@link BudDashboard.status}
   */
  public declare status?: false | string

  /**
   * {@link BudDashboard.stdout}
   */
  public stderr = stderr

  /**
   * {@link BudDashboard.stdin}
   */
  public stdin = stdin

  /**
   * {@link BudDashboard.stderr}
   */
  public stdout = stdout

  /**
   * Class constructor
   * @param app
   */
  public constructor(app: () => Bud) {
    super(app)

    this.messages = []

    this.stdin = this.app.context.stdin
    this.stdout = this.app.context.stdout
    this.stderr = this.app.context.stderr

    this.formatStatsErrors = makeErrorFormatter(this.app)
    this.updateStatus(`Initializing`)
    this.render()
  }

  /**
   * {@link BudDashboard.patched}
   */
  @bind
  public patched() {
    return !isUndefined(this.restore)
  }

  /**
   * {@link BudDashboard.render}
   */
  @bind
  public render(error?: BudHandler) {
    /**
     * Do not render if:
     * - dashboard is disabled
     * - CI is enabled
     * - silent mode is enabled
     */
    if (
      this.app.context.silent === true ||
      this.app.context.dashboard === false ||
      this.app.context.ci
    )
      return

    if (!this.patched())
      /**
       * Patch the console if it has not been patched already.
       *
       * {@link patchConsole} returns a restore function which can be called
       * after the dashboard has been unmounted.
       */
      this.restore = patchConsole((stream, data) => {
        if (!data || data === ``) return

        const message = data.trim()

        // Ignore empty messages
        if (!message) return

        // Ignore messages that have been logged before
        if (
          this.messages.some(
            stale => stale.message === message && stale.stream === stream,
          )
        )
          return

        // Push to queue
        this.messages.push({message, stream})
      })

    /**
     * Set the render function
     *
     * `rerender` is a method returned by the {@link render} function
     * that allows us to update the application without
     * re-mounting it.
     *
     * If `rerender` is not available, we can use the {@link render} function
     * directly (it is hopefully the initial render)
     */
    const renderApplication = this.instance?.rerender
      ? this.instance.rerender
      : (node: ReactElement) => {
          this.instance = render(node, {
            // We handle the console ourselves
            patchConsole: false,
            stderr: this.stderr,
            stdin: this.stdin,
            stdout: this.stdout,
          })
        }

    /**
     * Get compilations
     *
     * @remarks
     * If the stats object has children, we can assume that
     * we are dealing with a multi-compiler setup. In this
     * case, we want to flatten the children array.
     */
    const getCompilations = (): Compilations => {
      if (!this.stats) return []
      if (!this.stats.children?.length) return [this.stats]
      return this.stats.children.flat()
    }

    /**
     * Cleanly format errors and warnings for each compilation
     */
    const compilations = getCompilations().map(compilation => ({
      ...compilation,
      errors: this.formatStatsErrors(compilation?.errors),
      warnings: this.formatStatsErrors(compilation?.warnings),
    }))

    /**
     * Get dashboard.assets option
     */
    const assets = !isUndefined(this.app.context.dashboard?.assets)
      ? this.app.context.dashboard.assets
      : true

    /**
     * Get dashboard.compact option
     */
    const compact = !isUndefined(this.app.context.dashboard?.compact)
      ? this.app.context.dashboard.compact
      : compilations.length > 2

    /**
     * Get dashboard.entrypoints option
     */
    const entrypoints = !isUndefined(
      this.app.context.dashboard?.entrypoints,
    )
      ? this.app.context.dashboard.entrypoints
      : true

    /**
     * Get dashboard.server option
     */
    const server = !isUndefined(this.app.context.dashboard?.server)
      ? this.app.context.dashboard.server
      : true

    /**
     * Get the application to render
     *
     * @remarks
     * If the application is running in development mode, and
     * the terminal is a TTY, we want to render the teletype
     * application. Otherwise, we want to render the normal
     * application.
     */
    const App =
      this.stdin.isTTY && this.app.isDevelopment
        ? TeletypeApplication
        : Application

    /**
     * Render the application
     *
     * @remarks
     * The application is rendered using Ink. The `renderApplication`
     * function is used to update the application without re-mounting
     * it. This allows us to update the application without losing
     * the current state.
     */
    renderApplication(
      <Box flexDirection="column" width="100%">
        <Console messages={this.messages} />

        <App
          close={cb =>
            this.app.compiler?.instance?.compilers?.map(c => c.close(cb))
          }
          basedir={this.app.context.basedir}
          compact={compact}
          compilations={compilations}
          debug={this.app.context.debug}
          devUrl={this.app.server?.url}
          displayAssets={assets}
          displayEntrypoints={entrypoints}
          displayServerInfo={this.app.mode === `development` && server}
          error={error}
          isolated={0}
          mode={this.app.mode}
          proxy={this.app.server?.enabledMiddleware?.[`proxy`]}
          proxyUrl={this.app.server?.proxyUrl}
          publicDevUrl={this.app.server?.publicUrl}
          publicProxyUrl={this.app.server?.publicProxyUrl}
          status={this.status}
        />
      </Box>,
    )
  }

  /**
   * {@link BudDashboard.renderString}
   */
  @bind
  public renderString(text: string) {
    if (this.app.context.silent) return
    this.stdout.write(`${text}\n`)
  }

  /**
   * {@link BudDashboard.updateStats}
   */
  @bind
  public updateStats(stats: StatsCompilation): BudDashboard {
    if (stats) this.stats = stats

    if (this.app.context.silent === true) return this

    if (this.app.context.dashboard === false || this.app.context.ci) {
      this.renderString(
        this.app.compiler.stats.toString({
          color: true,
          preset: `minimal`,
        }),
      )
      return this
    }

    this.render()
    return this
  }

  /**
   * {@link BudDashboard.updateStatus}
   */
  @bind
  public updateStatus(status: string): BudDashboard {
    /**
     * Update the status prop
     */
    this.status = status

    /**
     * Don't render status updates for silent, dashboard-less, or CI
     * environments.
     */
    if (
      this.app.context.silent === true ||
      this.app.context.dashboard === false ||
      this.app.context.ci === true
    ) {
      return this
    }

    /**
     * Render or re-render the application
     */
    this.render()
    return this
  }
}

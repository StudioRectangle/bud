import type {Server as BudServer} from '@roots/bud-framework'
import type {Bud} from '@roots/bud-framework'
import type {
  Connection,
  Middleware,
  Watcher,
} from '@roots/bud-framework/services/server'

import {Service} from '@roots/bud-framework/service'
import {inject} from '@roots/bud-server/inject'
import {bind} from '@roots/bud-support/decorators/bind'
import {BudError, ServerError} from '@roots/bud-support/errors'

/**
 * Server service class
 */
export class Server extends Service implements BudServer {
  /**
   * {@link BudServer.application}
   */
  public application: Express.Application & {set: any; use: any}

  /**
   * {@link BudServer.appliedMiddleware}
   */
  public appliedMiddleware: Partial<
    Record<keyof Middleware.Available, any>
  > = {}

  /**
   * {@link BudServer.availableMiddleware}
   */
  public declare availableMiddleware: Record<string, string>

  /**
   * {@link BudServer.connection}
   */
  public declare connection: Connection

  /**
   * {@link BudServer.watcher}
   */
  public declare watcher: Watcher

  /**
   * {@link BudServer.applyMiddleware}
   */
  @bind
  public async applyMiddleware() {
    await Promise.all(
      Object.entries(this.enabledMiddleware).map(
        async ([key, signifier]) => {
          if (this.app.context.hot === false && key === `hot`) return

          /** import middleware */
          const {factory} = await this.app.module
            .import(signifier, import.meta.url)
            .catch(error => {
              throw error
            })

          /** save reference to middleware instance */
          this.appliedMiddleware[key] = factory(this.app)
          /** apply middleware */
          this.application.use(this.appliedMiddleware[key])
        },
      ),
    ).catch(error => {
      throw new ServerError(`Error instantiating middleware`, {
        props: {
          origin: BudError.normalize(error),
          thrownBy: `bud.server.applyMiddleware`,
        },
      })
    })
  }

  /**
   * {@link BudServer.compilerBefore}
   */
  @bind
  public override async compilerBefore?(bud: Bud) {
    await this.setConnection()
    await this.injectScripts()
  }

  /**
   * {@link BudServer.enabledMiddleware}
   * @readonly
   */
  public get enabledMiddleware(): BudServer['enabledMiddleware'] {
    return this.app.hooks.filter(`dev.middleware.enabled`, [])?.reduce(
      (enabled, key) => ({
        ...enabled,
        [key]: this.availableMiddleware?.[key],
      }),
      {},
    )
  }

  /**
   * {@link BudServer.injectScripts}
   */
  @bind
  public async injectScripts() {
    const injectOn = async (instance: Bud) =>
      inject(
        instance,
        Array.from(this.app.hooks.filter(`dev.client.scripts`)),
      )

    this.app.hasChildren
      ? Object.values(this.app.children).map(injectOn)
      : injectOn(this.app)
  }

  /**
   * {@link BudServer.proxyUrl}
   * @readonly
   */
  public get proxyUrl(): URL {
    return this.app.hooks.filter(`dev.proxyUrl`, new URL(`http://0.0.0.0`))
  }

  /**
   * {@link BudServer.publicProxyUrl}
   * @readonly
   */
  public get publicProxyUrl(): URL {
    return this.app.hooks.filter(`dev.publicProxyUrl`, this.proxyUrl)
  }

  /**
   * {@link BudServer.publicUrl}
   * @readonly
   */
  public get publicUrl(): URL {
    return this.app.hooks.filter(`dev.publicUrl`, this.url)
  }

  /**
   * {@link BudServer.register}
   */
  public override async register?(bud: Bud) {
    if (!bud.isDevelopment) return

    this.availableMiddleware = {
      cookie: `@roots/bud-server/middleware/cookie`,
      dev: `@roots/bud-server/middleware/dev`,
      hot: `@roots/bud-server/middleware/hot`,
      proxy: `@roots/bud-server/middleware/proxy`,
    }

    this.application = await bud.module
      .import(`@roots/bud-support/express`, import.meta.url)
      .then(app => app())

    this.logger.log(
      `server.application`,
      this.application?.constructor.name,
    )

    this.watcher = await import(`@roots/bud-server/server/watcher`).then(
      ({Watcher}) => new Watcher(() => bud),
    )

    this.logger.log(`server.watcher`, this.watcher?.constructor.name)

    bud.hooks.on(
      `dev.client.scripts`,
      await import(`@roots/bud-server/hooks`).then(
        ({devClientScripts}) => devClientScripts.callback,
      ),
    )

    this.application.set(`x-powered-by`, false)
  }

  /**
   * {@link BudServer.run}
   */
  @bind
  public async run() {
    await this.app.hooks.fire(`server.before`, this.app).catch(error => {
      throw error
    })

    if (this.app.context.dry !== true) {
      await this.connection.createServer(this.application)
      await this.connection.listen()
    }

    await this.app.hooks.fire(`server.after`, this.app).catch(error => {
      throw error
    })
  }

  /**
   * {@link BudServer.serverBefore}
   */
  @bind
  public override async serverBefore?(bud: Bud) {
    await this.setConnection()
    await this.injectScripts()
    await bud.compiler.compile(bud)
    await this.applyMiddleware()
    await this.watcher.watch()
  }

  /**
   * {@link BudServer.setConnection}
   */
  @bind
  public async setConnection(connection?: Connection) {
    if (!connection) {
      const isHttps = this.url.protocol === `https:`

      this.connection = await this.app.module
        .import(
          isHttps
            ? `@roots/bud-server/server/https`
            : `@roots/bud-server/server/http`,
          import.meta.url,
        )
        .then(({Server}) => new Server(this.app))
    } else {
      this.connection = connection
    }

    return this.connection
  }

  /**
   * {@link BudServer.url}
   * @readonly
   */
  public get url(): URL {
    const url = this.app.hooks.filter(
      `dev.url`,
      new URL(`http://0.0.0.0:3000`),
    )

    if (this.app.context.port) url.port = this.app.context.port.toString()

    return url
  }
}

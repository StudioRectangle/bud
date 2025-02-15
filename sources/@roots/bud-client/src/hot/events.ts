interface EventSourceFactory {
  new (path: string): EventSource
}

export const injectEvents = (eventSource: EventSourceFactory) => {
  /**
   * EventSource wrapper
   *
   * @remarks
   * wraps EventSource in a function to allow for
   * mocking in tests
   */
  return class Events extends eventSource {
    /**
     * Registered listeners
     */
    public listeners: Set<Listener> = new Set<Listener>()

    /**
     * EventSource `onmessage` handler
     */
    public override onmessage = async function (payload: MessageEvent) {
      if (!payload?.data || payload.data == `\uD83D\uDC93`) {
        return
      }

      try {
        const data = JSON.parse(payload.data)
        if (!data) return

        await Promise.all(
          [...this.listeners].map(async listener => {
            return await listener(data)
          }),
        )
      } catch (ex) {}
    }

    /**
     * EventSource `onopen` handler
     */
    public override onopen = function () {}

    /**
     * Class constructor
     *
     * @remarks
     * Singleton interface, so this is private.
     *
     */
    private constructor(
      public options: Partial<Options> & {name: string; path: string},
    ) {
      super(options.path)

      this.onopen = this.onopen.bind(this)
      this.onmessage = this.onmessage.bind(this)
      this.addListener = this.addListener.bind(this)
    }

    /**
     * Singleton constructor
     *
     */
    public static make(
      options: Partial<Options> & {name: string; path: string},
    ): Events {
      if (typeof window.bud.hmr[options.name] === `undefined`)
        Object.assign(window.bud.hmr, {
          [options.name]: new Events(options),
        })

      return window.bud.hmr[options.name]
    }

    /**
     * EventSource `addMessageListener` handler
     */
    public addListener(listener: Listener): this {
      this.listeners.add(listener)
      return this
    }
  }
}

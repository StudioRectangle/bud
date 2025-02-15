import type {Factory} from './index.js'

export const stats: Factory<`stats`> = async app =>
  app.hooks.filter(
    `build.stats`,
    app.isProduction
      ? {
          all: false,
          assets: true,
          assetsSort: `size`,
          builtAt: false,
          children: false,
          chunks: false,
          entrypoints: true,
          errors: true,
          errorsCount: true,
          hash: true,
          modules: true,
          outputPath: true,
          timings: true,
          warnings: true,
          warningsCount: true,
        }
      : {preset: `none`},
  )

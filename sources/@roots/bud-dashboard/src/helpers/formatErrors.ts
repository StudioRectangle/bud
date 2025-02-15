import type {Bud} from '@roots/bud-framework'
import type {StatsError} from '@roots/bud-framework/config'

export const makeErrorFormatter = (bud: Bud) => (errors?: StatsError[]) =>
  errors
    ?.filter(filterInternalErrors)
    .map(prettifyErrors)
    .map(error => {
      const unhandledModule = `You may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders`

      if (error.message.includes(unhandledModule)) {
        error.message = error.message.replace(unhandledModule, ``)

        const isUnhandledVueModule =
          error.moduleName?.match(bud.hooks.filter(`pattern.vue`)) &&
          !bud.extensions.has(`@roots/bud-vue`)

        if (isUnhandledVueModule) {
          error.message = [
            error.message,
            `You need to install @roots/bud-vue to compile this module.`,
          ].join(`\n\n`)
        }

        const isUnhandledSassModule =
          error.moduleName?.match(bud.hooks.filter(`pattern.sass`)) &&
          !bud.extensions.has(`@roots/bud-sass`)

        if (isUnhandledSassModule) {
          error.message = [
            error.message,
            `You need to install @roots/bud-sass to compile this module.`,
          ].join(`\n\n`)
        }

        const isUnhandledTsModule =
          error.moduleName?.match(bud.hooks.filter(`pattern.ts`)) &&
          !bud.extensions.has(`@roots/bud-typescript`) &&
          !bud.extensions.has(`@roots/bud-esbuild`) &&
          !bud.extensions.has(`@roots/bud-swc`)

        if (isUnhandledTsModule) {
          error.message = [
            error.message,
            `You need to install a TypeScript compatible extension to compile this module.`,
          ].join(`\n\n`)
        }
      }

      return error
    })

/**
 * Filter internal errors
 */
const filterInternalErrors = (error: StatsError) =>
  error.message && !error.message?.includes(`HookWebpackError`)

/**
 * Prettify errors
 */
const prettifyErrors = (error: StatsError) => {
  error.message = error.message
    .replace(`Module parse failed:`, ``)
    .replace(/Module build failed \(.*\):?/, ``)
    .replace(/    at .*?\/(webpack|tapable)\/?.*/gm, ``)
    .trim()
    .split(`Error:`)
    .pop()
    .trim()

  return error
}

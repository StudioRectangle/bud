import {window} from '@roots/wordpress-transforms'
import Webpack, {type WebpackPluginInstance} from 'webpack'

/**
 * {@link WebpackPluginInstance}
 */
export class WordPressExternalsWebpackPlugin
  implements WebpackPluginInstance
{
  /**
   * {@link WebpackPluginInstance.apply}
   */
  public apply(compiler: Webpack.Compiler) {
    new Webpack.ExternalsPlugin(`window`, ({request}, callback) => {
      const lookup = window.transform(request)
      return lookup ? callback(null, lookup) : callback()
    }).apply(compiler)
  }
}

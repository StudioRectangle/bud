import type * as FS from '@roots/filesystem/filesystem'

import {isMainThread} from 'node:worker_threads'

import {BudError} from '@roots/bud-support/errors'
import {paths} from '@roots/bud-support/utilities/paths'
import Filesystem from '@roots/filesystem/filesystem'
import * as json from '@roots/filesystem/json'
import * as yml from '@roots/filesystem/yml'

let filesystem: Filesystem

export const get = (basedir?: string) => {
  if (filesystem) return filesystem

  if (typeof basedir !== `string`)
    throw new BudError(
      `filesystem not initialized. basedir arg required for initialization.`,
    )

  filesystem = new Filesystem(basedir)

  /**
   * change directory to basedir for process.cwd() to work as expected
   *
   * @remarks
   * - no need to do this if the basedir is the same as the cwd
   * - workers don't support process.chdir
   */
  const modifiedBaseDirectory = paths.basedir !== process.cwd()
  if (isMainThread && modifiedBaseDirectory) process.chdir(basedir)

  return filesystem
}

export {filesystem, Filesystem, json, yml}
export type {FS}

import type {Bud} from '@roots/bud-framework'

import {join, parse} from 'node:path'

import type {Signifier} from './types.js'

export async function handlePrimitive(
  bud: Bud,
  value: Array<Signifier> | Signifier,
) {
  const current = bud.hooks.filter(`build.entry`, {})

  const modules = Array.isArray(value) ? value : [value]

  const {dir, name} = parse(modules[0])
  const key = join(dir, name)

  return bud.hooks.on(`build.entry`, {
    ...current,
    [key]: {import: modules},
  })
}

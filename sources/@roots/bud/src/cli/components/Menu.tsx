import figures from '@roots/bud-support/figures'
import {
  Box,
  Text,
  useEffect,
  useInput,
  useState,
} from '@roots/bud-support/ink'

import type BudCommand from '../commands/bud.js'

const options: Array<[string, string, Array<string>]> = [
  [
    `build production`,
    `build application for production`,
    [`build`, `production`],
  ],
  [
    `build development`,
    `start development server`,
    [`build`, `development`],
  ],
  [
    `doctor`,
    `check bud.js configuration for common errors and issues`,
    [`doctor`],
  ],
  [
    `repl`,
    `open a repl to explore bud just prior to compilation`,
    [`repl`],
  ],
  [
    `upgrade`,
    `upgrade bud.js and extensions to the latest stable version`,
    [`upgrade`],
  ],
]

export const Menu = ({cli}: {cli: BudCommand[`cli`]}) => {
  const [selected, setSelected] = useState(0)
  const [running, setRunning] = useState(false)

  useInput((key, input) => {
    if (running) return

    input[`downArrow`] && setSelected(selected + 1)
    input[`upArrow`] && setSelected(selected - 1)

    if (input.escape) {
      // eslint-disable-next-line n/no-process-exit
      process.exit(0)
    }

    if (input.return) {
      setRunning(true)
      cli.run(options[selected][2])
    }
  })

  useEffect(() => {
    if (selected > options.length - 1) setSelected(0)
    if (selected < 0) setSelected(options.length - 1)
  }, [selected])

  return (
    <Box flexDirection="column" marginTop={1}>
      {options.map(([option, description, command], index) => {
        return (
          <Text color={selected === index ? `blue` : `white`} key={index}>
            {selected === index ? figures.radioOn : figures.radioOff}
            {`  `}
            {option}
            <Text color="white" dimColor>
              {` `}
              {description}
            </Text>
          </Text>
        )
      })}
    </Box>
  )
}

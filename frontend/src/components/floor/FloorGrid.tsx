import { TableDefinition } from '../../types'
import { TableCard } from './TableCard'

interface Props {
  tables: TableDefinition[]
  cols: number
  rows: number
}

export function FloorGrid({ tables, cols, rows }: Props) {
  return (
    <div
      className="grid p-1 mx-auto w-max"
      style={{
        gridTemplateColumns: `repeat(${cols}, var(--cell-w, 100px))`,
        gridTemplateRows:    `repeat(${rows}, var(--cell-h, 58px))`,
        gap: 'var(--cell-gap, 3px)',
      }}
    >
      {tables.map((t) => (
        <TableCard key={t.id} table={t} />
      ))}
    </div>
  )
}

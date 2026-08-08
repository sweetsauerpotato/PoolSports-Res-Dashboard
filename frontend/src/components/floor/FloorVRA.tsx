import { VRA_TABLES, FLOOR_GRID_SIZES } from '../../config/tables'
import { Floor } from '../../types'
import { FloorGrid } from './FloorGrid'

export function FloorVRA() {
  const { cols, rows } = FLOOR_GRID_SIZES[Floor.VRA]
  return <FloorGrid tables={VRA_TABLES} cols={cols} rows={rows} />
}

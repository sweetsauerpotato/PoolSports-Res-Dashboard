import { UG_TABLES, FLOOR_GRID_SIZES } from '../../config/tables'
import { Floor } from '../../types'
import { FloorGrid } from './FloorGrid'

export function FloorUG() {
  const { cols, rows } = FLOOR_GRID_SIZES[Floor.UG]
  return <FloorGrid tables={UG_TABLES} cols={cols} rows={rows} />
}

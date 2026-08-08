import { EG_TABLES } from '../../config/tables'
import { FLOOR_GRID_SIZES } from '../../config/tables'
import { Floor } from '../../types'
import { FloorGrid } from './FloorGrid'

export function FloorEG() {
  const { cols, rows } = FLOOR_GRID_SIZES[Floor.EG]
  return <FloorGrid tables={EG_TABLES} cols={cols} rows={rows} />
}

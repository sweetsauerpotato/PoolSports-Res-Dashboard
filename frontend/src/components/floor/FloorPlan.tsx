import { useUiStore } from '../../store/uiStore'
import { Floor } from '../../types'
import { FloorEG } from './FloorEG'
import { FloorUG } from './FloorUG'
import { FloorVRA } from './FloorVRA'
import { FunctionComponent } from 'react'
import { BoardFilters } from './BoardFilters'

const FLOOR_COMPONENTS: Record<Floor, FunctionComponent> = {
  [Floor.EG]: FloorEG,
  [Floor.UG]: FloorUG,
  [Floor.VRA]: FloorVRA,
}

export function FloorPlan() {
  const activeFloor = useUiStore((s) => s.activeFloor)
  const Component = FLOOR_COMPONENTS[activeFloor]
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <BoardFilters />
      <div className="flex-1 overflow-auto bg-gray-800 rounded-b-lg">
        <Component />
      </div>
    </div>
  )
}

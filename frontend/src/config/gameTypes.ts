import { TableType } from '../types'

export const ART_TO_TYPE: Record<string, TableType> = {
  'Billard': TableType.Pool,
  'Pool': TableType.Pool,
  'Snooker': TableType.Snooker,
  'Darts': TableType.Dart,
  'Dart': TableType.Dart,
  'Tischtennis': TableType.TT,
  'TT': TableType.TT,
  'Kicker': TableType.Kicker,
  'Gastro': TableType.Gastro,
  'Lounge': TableType.Lounge,
}

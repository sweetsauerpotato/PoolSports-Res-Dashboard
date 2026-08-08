import { TableType, TableStatus } from '../types'

// PRD v1.1 color spec:
// Frei = type color | Reserviert = #FFD700 yellow | Belegt = type color + #DC143C red border | Defekt = grey + strikethrough

export const TYPE_COLORS: Record<TableType, string> = {
  [TableType.Pool]: '#22C55E',
  [TableType.Snooker]: '#FFD700',
  [TableType.Dart]: '#FF8C00',
  [TableType.TT]: '#4169E1',
  [TableType.Kicker]: '#06B6D4',
  [TableType.Gastro]: '#EC4899',
  [TableType.Tresen]: '#0D9488',
  [TableType.Lounge]: '#9E9E9E',
}

export const TYPE_BG_CLASSES: Record<TableType, string> = {
  [TableType.Pool]: 'bg-[#22C55E]',
  [TableType.Snooker]: 'bg-[#FFD700]', // PRD §3: Snooker = #FFD700 gold
  [TableType.Dart]: 'bg-[#F97316]',
  [TableType.TT]: 'bg-[#3B82F6]',
  [TableType.Kicker]: 'bg-[#06B6D4]',
  [TableType.Gastro]: 'bg-[#EC4899]',
  [TableType.Tresen]: 'bg-[#0D9488]',
  [TableType.Lounge]: 'bg-[#9E9E9E]',
}

// Belegt = type background + crimson ring/border (PRD: #DC143C)
export const STATUS_RING_CLASSES: Record<TableStatus, string> = {
  [TableStatus.Frei]: '',
  [TableStatus.Reserviert]: '',        // Reserviert overrides bg to yellow
  [TableStatus.Belegt]: 'ring-[3px] ring-red-600',
  [TableStatus.Defekt]: '',
}

export const DEFEKT_CLASSES = 'bg-gray-400 opacity-60'

// Art-colored badge in side panel / table view
export const TYPE_BADGE_CLASSES: Record<TableType, string> = {
  [TableType.Pool]: 'bg-green-700 text-green-100',
  [TableType.Snooker]: 'bg-yellow-700 text-yellow-100',
  [TableType.Dart]: 'bg-orange-700 text-orange-100',
  [TableType.TT]: 'bg-blue-700 text-blue-100',
  [TableType.Kicker]: 'bg-cyan-700 text-cyan-100',
  [TableType.Gastro]: 'bg-pink-700 text-pink-100',
  [TableType.Tresen]: 'bg-teal-700 text-teal-100',
  [TableType.Lounge]: 'bg-gray-400 text-gray-100',
}

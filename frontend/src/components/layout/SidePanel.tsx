import { useUiStore } from '../../store/uiStore'
import { useAuthStore } from '../../store/authStore'
import { Role } from '../../types'
import { WartendPanel } from './WartendPanel'
import { AgendaPanel } from './AgendaPanel'

export function SidePanel() {
  const activeSidePanel = useUiStore((s) => s.activeSidePanel)
  const role = useAuthStore((s) => s.role)

  if (activeSidePanel === 'wartend' && role === Role.Admin) {
    return <WartendPanel />
  }

  if (activeSidePanel === 'agenda') {
    return <AgendaPanel />
  }

  return null
}

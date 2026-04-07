/**
 * Terminal Plugin for Desktop App
 *
 * Native terminal plugin that uses Wails bindings for PTY access.
 * Only available in the desktop app (not web).
 */
import { TerminalSquare } from 'lucide-react'
import type { Plugin } from '@cogos/ui-core'
import { Terminal } from '../components/Terminal'

/**
 * Terminal view component
 * Wraps the native Terminal component with proper layout
 */
function TerminalView() {
  return (
    <div className="h-full w-full bg-[#1a1a2e]">
      <Terminal id="main" active={true} />
    </div>
  )
}

/**
 * Terminal plugin definition
 */
export const terminalPlugin: Plugin = {
  id: 'terminal',
  name: 'Terminal',
  icon: TerminalSquare,
  component: TerminalView,
  position: 'primary',
  order: -1, // First in the list
}

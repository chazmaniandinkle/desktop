import {createRoot} from 'react-dom/client'
import './style.css'
import { DesktopApp } from './DesktopApp'

const container = document.getElementById('root')

const root = createRoot(container!)

// Note: StrictMode disabled for xterm.js compatibility
// StrictMode causes double-render in dev mode which breaks xterm state
root.render(<DesktopApp />)

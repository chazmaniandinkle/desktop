import { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import {
  StartTerminal,
  WriteTerminal,
  ResizeTerminal,
  CloseTerminal,
} from '../../wailsjs/go/main/App';
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime';

interface TerminalProps {
  id: string;
  active: boolean;
}

export function Terminal({ id, active }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const initializedRef = useRef(false);
  const lastSizeRef = useRef<{ cols: number; rows: number }>({ cols: 0, rows: 0 });

  // Handle terminal output from backend
  const handleOutput = useCallback((data: { id: string; data: string }) => {
    if (data.id === id && terminalRef.current) {
      terminalRef.current.write(data.data);
    }
  }, [id]);

  // Handle terminal exit
  const handleExit = useCallback((exitId: string) => {
    if (exitId === id && terminalRef.current) {
      terminalRef.current.write('\r\n\x1b[31m[Process exited]\x1b[0m\r\n');
    }
  }, [id]);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const term = new XTerm({
      theme: {
        background: '#1a1a2e',
        foreground: '#e2e8f0',
        cursor: '#a855f7',
        cursorAccent: '#1a1a2e',
        selectionBackground: 'rgba(168, 85, 247, 0.3)',
        black: '#1a1a2e',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e2e8f0',
        brightBlack: '#64748b',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#f8fafc',
      },
      fontFamily: '"MesloLGS NF", "Hack Nerd Font", "FiraCode Nerd Font", Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      allowProposedApi: true,
      scrollback: 10000,
      allowTransparency: false,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(containerRef.current);

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    // Fit the terminal to container
    const doFit = () => {
      if (!fitAddonRef.current) return;
      fitAddonRef.current.fit();
    };

    // Window resize handler
    const handleResize = () => doFit();
    window.addEventListener('resize', handleResize);

    // Use term.onResize to send size to backend (fires after fit completes)
    term.onResize(({ cols, rows }) => {
      if (cols !== lastSizeRef.current.cols || rows !== lastSizeRef.current.rows) {
        lastSizeRef.current = { cols, rows };
        ResizeTerminal(id, cols, rows);
      }
    });

    // Handle user input
    term.onData((data) => {
      WriteTerminal(id, data);
    });

    // Subscribe to backend events
    EventsOn('terminal:output', handleOutput);
    EventsOn('terminal:exit', handleExit);

    // Start the terminal session, then fit
    StartTerminal(id).then(() => {
      // Delay fit to ensure container is laid out
      setTimeout(doFit, 50);
    });

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      EventsOff('terminal:output');
      EventsOff('terminal:exit');
      CloseTerminal(id);
      term.dispose();
    };
  }, [id, handleOutput, handleExit]);

  // Refit when becoming active (tab switch)
  useEffect(() => {
    if (!active || !fitAddonRef.current) return;
    // Delay to ensure container is visible and laid out
    setTimeout(() => {
      fitAddonRef.current?.fit();
    }, 50);
  }, [active]);

  // Focus terminal when active
  useEffect(() => {
    if (active && terminalRef.current) {
      terminalRef.current.focus();
    }
  }, [active]);

  return (
    <div
      ref={containerRef}
      className="terminal-container"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: active ? 'block' : 'none',
        overflow: 'hidden',
      }}
    />
  );
}

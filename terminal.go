package main

import (
	"io"
	"os"
	"os/exec"
	"sync"

	"github.com/creack/pty"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// TerminalSession represents an active terminal session
type TerminalSession struct {
	ID     string
	cmd    *exec.Cmd
	pty    *os.File
	done   chan struct{}
	closed bool
	mu     sync.Mutex
}

// TerminalManager manages terminal sessions
type TerminalManager struct {
	app      *App
	sessions map[string]*TerminalSession
	mu       sync.RWMutex
}

// NewTerminalManager creates a new terminal manager
func NewTerminalManager(app *App) *TerminalManager {
	return &TerminalManager{
		app:      app,
		sessions: make(map[string]*TerminalSession),
	}
}

// StartSession starts a new terminal session
func (tm *TerminalManager) StartSession(id string, shell string, cwd string) error {
	tm.mu.Lock()
	defer tm.mu.Unlock()

	// Default shell
	if shell == "" {
		shell = os.Getenv("SHELL")
		if shell == "" {
			shell = "/bin/zsh"
		}
	}

	// Default working directory
	if cwd == "" {
		cwd = tm.app.workspaceRoot
		if cwd == "" {
			cwd, _ = os.UserHomeDir()
		}
	}

	// Create command
	cmd := exec.Command(shell)
	cmd.Dir = cwd
	cmd.Env = append(os.Environ(),
		"TERM=xterm-256color",
		"COLORTERM=truecolor",
	)

	// Start PTY
	ptmx, err := pty.Start(cmd)
	if err != nil {
		return err
	}

	session := &TerminalSession{
		ID:   id,
		cmd:  cmd,
		pty:  ptmx,
		done: make(chan struct{}),
	}

	tm.sessions[id] = session

	// Read output in goroutine
	go tm.readOutput(session)

	// Wait for process in goroutine
	go func() {
		cmd.Wait()
		session.mu.Lock()
		if !session.closed {
			session.closed = true
			close(session.done)
		}
		session.mu.Unlock()
		runtime.EventsEmit(tm.app.ctx, "terminal:exit", id)
	}()

	return nil
}

// readOutput reads from PTY and emits events
func (tm *TerminalManager) readOutput(session *TerminalSession) {
	buf := make([]byte, 4096)
	for {
		select {
		case <-session.done:
			return
		default:
			n, err := session.pty.Read(buf)
			if err != nil {
				if err != io.EOF {
					// Emit error?
				}
				return
			}
			if n > 0 {
				// Emit output event
				runtime.EventsEmit(tm.app.ctx, "terminal:output", map[string]interface{}{
					"id":   session.ID,
					"data": string(buf[:n]),
				})
			}
		}
	}
}

// WriteToSession writes input to a terminal session
func (tm *TerminalManager) WriteToSession(id string, data string) error {
	tm.mu.RLock()
	session, ok := tm.sessions[id]
	tm.mu.RUnlock()

	if !ok {
		return nil
	}

	_, err := session.pty.WriteString(data)
	return err
}

// ResizeSession resizes the terminal
func (tm *TerminalManager) ResizeSession(id string, cols, rows uint16) error {
	tm.mu.RLock()
	session, ok := tm.sessions[id]
	tm.mu.RUnlock()

	if !ok {
		return nil
	}

	return pty.Setsize(session.pty, &pty.Winsize{
		Cols: cols,
		Rows: rows,
	})
}

// CloseSession closes a terminal session
func (tm *TerminalManager) CloseSession(id string) error {
	tm.mu.Lock()
	session, ok := tm.sessions[id]
	if ok {
		delete(tm.sessions, id)
	}
	tm.mu.Unlock()

	if !ok {
		return nil
	}

	session.mu.Lock()
	if !session.closed {
		session.closed = true
		close(session.done)
	}
	session.mu.Unlock()

	session.pty.Close()
	if session.cmd.Process != nil {
		session.cmd.Process.Kill()
	}

	return nil
}

// CloseAll closes all terminal sessions
func (tm *TerminalManager) CloseAll() {
	tm.mu.Lock()
	ids := make([]string, 0, len(tm.sessions))
	for id := range tm.sessions {
		ids = append(ids, id)
	}
	tm.mu.Unlock()

	for _, id := range ids {
		tm.CloseSession(id)
	}
}

import { useEffect, useMemo, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'
import { MonacoBinding } from 'y-monaco'

declare global {
  interface ImportMetaEnv {
    readonly VITE_YJS_SERVER_URL?: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'
type Collaborator = { name: string; color: string }

const SERVER_URL = import.meta.env.VITE_YJS_SERVER_URL ?? 'ws://localhost:1234'
const STARTER_CODE = `// Welcome to Pairspace\n// Share this room link and start building together.\n\nfunction greet(name: string) {\n  return \`Hello, \${name}!\`\n}\n\nconsole.log(greet('world'))\n`
const languages = ['typescript', 'javascript', 'python', 'html', 'css', 'json', 'markdown']
const colors = ['#f2a65a', '#73c6a2', '#80a7ff', '#e581a8', '#ddc76b']

function getRoomId() {
  const url = new URL(window.location.href)
  let room = url.searchParams.get('room')
  if (!room) {
    room = crypto.randomUUID().slice(0, 8)
    url.searchParams.set('room', room)
    window.history.replaceState({}, '', url)
  }
  return room
}

function App() {
  const [roomId] = useState(getRoomId)
  const [language, setLanguage] = useState('typescript')
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [synced, setSynced] = useState(false)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [copied, setCopied] = useState(false)
  const doc = useMemo(() => new Y.Doc(), [roomId])
  const provider = useMemo(() => new WebsocketProvider(SERVER_URL, roomId, doc), [doc, roomId])

  useEffect(() => {
    const awareness = provider.awareness
    const user = {
      name: `Dev-${String(doc.clientID).slice(-3)}`,
      color: colors[doc.clientID % colors.length],
    }
    awareness.setLocalStateField('user', user)

    const updateCollaborators = () => {
      const users = Array.from(awareness.getStates().values())
        .map((state) => state.user as Collaborator | undefined)
        .filter((value): value is Collaborator => Boolean(value?.name && value.color))
      setCollaborators(users)
    }
    const updateStatus = ({ status: nextStatus }: { status: ConnectionStatus }) => setStatus(nextStatus)
    const updateSync = (isSynced: boolean) => setSynced(isSynced)

    awareness.on('change', updateCollaborators)
    provider.on('status', updateStatus)
    provider.on('sync', updateSync)
    updateCollaborators()

    return () => {
      awareness.off('change', updateCollaborators)
      provider.off('status', updateStatus)
      provider.off('sync', updateSync)
      provider.destroy()
      doc.destroy()
    }
  }, [doc, provider])

  const bindEditor: OnMount = (editor, monaco) => {
    const sharedText = doc.getText('monaco')
    const binding = new MonacoBinding(sharedText, editor.getModel()!, new Set([editor]), provider.awareness)
    const seedStarter = () => {
      window.setTimeout(() => {
        const connectedClientIds = Array.from(provider.awareness.getStates().keys())
        const firstClientId = Math.min(...connectedClientIds)
        if (sharedText.length === 0 && doc.clientID === firstClientId) {
          sharedText.insert(0, STARTER_CODE)
        }
      }, 250)
    }
    if (provider.synced) seedStarter()
    else provider.once('sync', seedStarter)

    monaco.editor.defineTheme('pairspace-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '7f9188', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'efa96b' },
        { token: 'string', foreground: '98c7a9' },
      ],
      colors: {
        'editor.background': '#111714',
        'editorLineNumber.foreground': '#526159',
        'editorLineNumber.activeForeground': '#b5c5bb',
        'editorCursor.foreground': '#f2a65a',
        'editor.selectionBackground': '#35443b',
        'editorLineHighlightBackground': '#171f1a',
      },
    })
    monaco.editor.setTheme('pairspace-dark')
    return () => binding.destroy()
  }

  const shareRoom = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const connectionLabel = status === 'connected' ? (synced ? 'Live' : 'Syncing') : status === 'connecting' ? 'Connecting' : 'Offline'

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href={window.location.pathname} aria-label="Pairspace home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>pairspace</span>
        </a>
        <div className="topbar-divider" />
        <div className="project-name"><span className="file-glyph">TS</span><span>Untitled session</span></div>
        <div className="topbar-actions">
          <div className="presence-stack" aria-label={`${collaborators.length} people in this room`}>
            {collaborators.slice(0, 3).map((person, index) => (
              <span className="avatar" key={`${person.name}-${index}`} style={{ '--avatar-color': person.color } as React.CSSProperties} title={person.name}>
                {person.name.slice(-1)}
              </span>
            ))}
            {collaborators.length > 3 && <span className="avatar overflow-avatar">+{collaborators.length - 3}</span>}
          </div>
          <button className="share-button" onClick={shareRoom} title="Copy room link">
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.3 10.8 12.7 7.6M7.3 9.2l5.4 3.2" /><circle cx="5.5" cy="10" r="2.2" /><circle cx="14.5" cy="6.5" r="2.2" /><circle cx="14.5" cy="13.5" r="2.2" /></svg>
            {copied ? 'Copied' : 'Share room'}
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="rail" aria-label="Workspace navigation">
          <button className="rail-button active" title="Editor" aria-label="Editor">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" /></svg>
          </button>
          <span className="rail-spacer" />
          <button className="rail-button settings-button" title="Settings" aria-label="Settings">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z" /></svg>
          </button>
        </aside>

        <div className="editor-column">
          <div className="file-tab"><span className="file-glyph">TS</span><span>main.ts</span><span className="tab-unsaved" /></div>
          <div className="editor-toolbar">
            <div className="breadcrumbs"><span>workspace</span><span className="crumb-slash">/</span><strong>main.ts</strong></div>
            <div className="toolbar-controls">
              <span className={`connection-state ${status}`}><i />{connectionLabel}</span>
              <span className="toolbar-divider" />
              <label className="language-select-label" htmlFor="language">Language</label>
              <select id="language" value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="Editor language">
                {languages.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </div>
          <div className="editor-frame">
            <Editor
              height="100%"
              language={language}
              theme="pairspace-dark"
              onMount={bindEditor}
              options={{
                minimap: { enabled: false },
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 14,
                lineHeight: 24,
                padding: { top: 20, bottom: 24 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                renderLineHighlight: 'line',
                automaticLayout: true,
                tabSize: 2,
              }}
            />
          </div>
          <footer className="statusbar">
            <div className="status-left"><span className="status-branch"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3v7a3 3 0 0 0 3 3h3M5 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg>room/{roomId}</span><span>{collaborators.length} online</span></div>
            <div className="status-right"><span>UTF-8</span><span>Spaces: 2</span><span>Ln 1, Col 1</span></div>
          </footer>
        </div>

        <aside className="inspector">
          <div className="inspector-heading"><span>SESSION</span><button className="more-button" title="Session details" aria-label="Session details">···</button></div>
          <div className="room-block">
            <span className="eyebrow">ROOM ID</span>
            <div className="room-code">{roomId}<span className="room-pulse" /></div>
          </div>
          <div className="inspector-rule" />
          <div className="people-heading"><span>People</span><span className="people-count">{collaborators.length}</span></div>
          <div className="people-list">
            {collaborators.map((person, index) => (
              <div className="person-row" key={`${person.name}-${index}`}>
                <span className="person-avatar" style={{ '--avatar-color': person.color } as React.CSSProperties}>{person.name.slice(-1)}</span>
                <span className="person-name">{person.name}</span>
                <span className="person-online" title="Online" />
              </div>
            ))}
            {collaborators.length === 0 && <p className="empty-presence">Waiting for someone to join.</p>}
          </div>
          <div className="inspector-rule tips-rule" />
          <div className="activity-heading"><span>Activity</span><span className="live-tag">LIVE</span></div>
          <div className="activity-item"><span className="activity-dot" /><div><strong>{synced ? 'Room synchronized' : 'Connecting to room'}</strong><small>{synced ? 'Changes are shared in real time' : 'Starting collaboration session'}</small></div></div>
          <div className="inspector-bottom"><span className={`server-indicator ${status}`} /><span>{status === 'connected' ? 'Connected to session' : status === 'connecting' ? 'Connecting to server' : 'Server unavailable'}</span></div>
        </aside>
      </section>
    </main>
  )
}

export default App
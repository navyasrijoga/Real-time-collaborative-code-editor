
# Pairspace

A small real-time collaborative code editor built with React, TypeScript, Vite, Monaco, Yjs, and the `y-websocket` provider.

## Run locally

Requirements: Node.js 20 or newer and npm.

```sh
npm install
npm run dev:all
```

Open the Vite URL printed by the dev server, normally `http://localhost:5173`. `dev:all` starts the Vite frontend and the Yjs WebSocket server on port `1234` together. To run them separately, use `npm run dev` and `npm run dev:server` in two terminals.

## Test two browser sessions

1. Open the app in a browser and wait for the connection indicator to show **Live**.
2. Use **Share room** to copy the current URL.
3. Open that URL in a second browser session, such as a private window or another browser. Both sessions must be able to reach the same WebSocket server; for two sessions on one computer, the default local server works.
4. Type in either editor and check that changes and collaborator presence appear in the other session.

The room ID is in the URL's `room` query parameter. Opening the base URL creates a new room. For remote clients, set `VITE_YJS_SERVER_URL` to a WebSocket URL accessible to both browsers, then rebuild/restart the frontend.

## Production build

```sh
npm run build
npm run preview
```

The build only compiles the frontend. The collaboration WebSocket server must also be deployed and run separately for live editing.

## MVP limitations

- Rooms are ephemeral: document content is not persisted after all clients disconnect or the server restarts.
- There is no authentication, authorization, rate limiting, or private-room enforcement. Anyone with a room URL can join.
- The included WebSocket server is for local development and experimentation, not production deployment as-is.
- The language selector changes Monaco syntax highlighting; it does not provide execution or save functionality.

# Real-time-collaborative-code-editor
Developing a browser-based collaborative coding platform using React, TypeScript, Monaco Editor, Yjs, and WebSockets. Aims to enable shared coding rooms and real-time code synchronization between multiple users.
 529fba2eae318a58043bba8ac28f58ba783a4430

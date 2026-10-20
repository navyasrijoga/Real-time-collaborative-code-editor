const http = require('node:http')
const WebSocket = require('ws')
const { setupWSConnection } = require('y-websocket/bin/utils')

const port = Number(process.env.PORT ?? 1234)
const server = http.createServer((request, response) => {
  response.writeHead(200, { 'content-type': 'text/plain' })
  response.end('Pairspace collaboration server is running.\n')
})
const websocketServer = new WebSocket.Server({ server })

websocketServer.on('connection', (socket, request) => {
  setupWSConnection(socket, request)
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Yjs WebSocket server listening on ws://localhost:${port}`)
})
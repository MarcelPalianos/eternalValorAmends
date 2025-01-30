const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const server = new WebSocket.Server({ port: PORT });

let clients = new Set();

server.on('connection', (ws) => {
    clients.add(ws);
    console.log('New player connected! Total players:', clients.size);

    ws.on('message', (message) => {
        console.log('Received:', message);
        // Broadcast message to all connected clients
        clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log('Player disconnected. Players left:', clients.size);
    });
});

console.log(`WebSocket server running on port ${PORT}`);

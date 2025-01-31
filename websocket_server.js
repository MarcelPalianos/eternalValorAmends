const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const server = new WebSocket.Server({ port: PORT });

let waitingPlayer = null;
let matches = new Map();
const gridSize = 8;
const tileTypes = 5;

function createInitialGrid() {
    const grid = [];
    for (let row = 0; row < gridSize; row++) {
        grid[row] = [];
        for (let col = 0; col < gridSize; col++) {
            grid[row][col] = Math.floor(Math.random() * tileTypes);
        }
    }
    return grid;
}

server.on('connection', (ws) => {
    console.log('New player connected.');

    // If there's a waiting player, match them
    if (waitingPlayer) {
        const opponent = waitingPlayer;
        waitingPlayer = null;

        const matchGrid = createInitialGrid();
        matches.set(ws, { opponent, grid: matchGrid, turn: ws });
        matches.set(opponent, { opponent: ws, grid: matchGrid, turn: ws });

        // Send initial grid to both players
        ws.send(JSON.stringify({ type: 'initGrid', grid: matchGrid }));
        opponent.send(JSON.stringify({ type: 'initGrid', grid: matchGrid }));

    } else {
        // No player waiting, set this player as waiting
        waitingPlayer = ws;
        ws.send(JSON.stringify({ type: 'waitingForMatch' }));
    }

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        const match = matches.get(ws);

        if (!match) {
            console.warn("Player sent message, but no match found.");
            return;
        }

        const { opponent, grid } = match;

        if (data.type === 'playerMove') {
            // Update the grid on the server
            const { from, to } = data;
            const temp = grid[from.row][from.col];
            grid[from.row][from.col] = grid[to.row][to.col];
            grid[to.row][to.col] = temp;

            // Broadcast updated grid to both players
            ws.send(JSON.stringify({ type: 'updateGrid', grid }));
            opponent.send(JSON.stringify({ type: 'updateGrid', grid }));

            // Switch turn
            match.turn = opponent;
            matches.get(opponent).turn = opponent;
        }
    });

    ws.on('close', () => {
        const match = matches.get(ws);
        if (match) {
            const { opponent } = match;
            opponent.send(JSON.stringify({ type: 'opponentDisconnected' }));
            matches.delete(opponent);
        }
        matches.delete(ws);
    });
});

console.log(`WebSocket server running on port ${PORT}`);

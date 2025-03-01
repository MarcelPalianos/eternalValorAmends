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
    if (data.type === 'matchesFound') {
        const match = matches.get(ws);
        if (!match) return;
    
        const { grid } = match;
        data.matches.forEach(({ row, col }) => {
            grid[row][col] = -1; // Or another placeholder for empty cells
        });
    
        // Fill empty cells
        for (let col = 0; col < gridSize; col++) {
            let emptySpots = 0;
            for (let row = gridSize - 1; row >= 0; row--) {
                if (grid[row][col] === -1) {
                    emptySpots++;
                } else if (emptySpots > 0) {
                    grid[row + emptySpots][col] = grid[row][col];
                    grid[row][col] = -1;
                }
            }
            for (let row = 0; row < emptySpots; row++) {
                grid[row][col] = Math.floor(Math.random() * tileTypes);
            }
        }
    
        // Send the updated grid to both players
        match.opponent.send(JSON.stringify({ type: 'updateGrid', grid }));
        ws.send(JSON.stringify({ type: 'updateGrid', grid }));
    }
    
    // If there's a waiting player, match them
    if (waitingPlayer) {
        const opponent = waitingPlayer;
        waitingPlayer = null;

        const matchGrid = createInitialGrid();
        matches.set(ws, { opponent, grid: matchGrid, turn: ws });
        matches.set(opponent, { opponent: ws, grid: matchGrid, turn: ws });

        // Send initial grid to both players
        ws.send(JSON.stringify({ type: 'initGrid', grid: matchGrid, role: 'main' }));
        opponent.send(JSON.stringify({ type: 'initGrid', grid: matchGrid, role: 'opponent' }));

        // Notify main player that it’s their turn
        ws.send(JSON.stringify({ type: 'yourTurn' }));
        opponent.send(JSON.stringify({ type: 'opponentTurn' }));
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

        const { opponent, grid, turn } = match;

        if (data.type === 'playerMove') {
            if (turn !== ws) {
                console.warn("Player attempted to move out of turn.");
                return;
            }

            // Update the grid on the server
            const { from, to } = data;
            const temp = grid[from.row][from.col];
            grid[from.row][from.col] = grid[to.row][to.col];
            grid[to.row][to.col] = temp;

            // Broadcast updated grid to both players
            ws.send(JSON.stringify({ type: 'updateGrid', grid }));
            opponent.send(JSON.stringify({ type: 'updateGrid', grid }));

            // Switch turn and notify players
            match.turn = opponent;
            matches.get(opponent).turn = opponent;
            ws.send(JSON.stringify({ type: 'opponentTurn' }));
            opponent.send(JSON.stringify({ type: 'yourTurn' }));
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

const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const server = new WebSocket.Server({ port: PORT });

let waitingPlayer = null; // Tracks the waiting player (if any)
let matches = new Map();  // Holds all current matches (keyed by WebSocket pair)
let playerHealth = new Map(); // Tracks health for all players

server.on('connection', (ws) => {
    console.log('Player connected.');

    // If there's a waiting player, pair them up into a match
    if (waitingPlayer) {
        const match = [waitingPlayer, ws];
        matches.set(match, { currentTurn: waitingPlayer });

        playerHealth.set(waitingPlayer, 100);
        playerHealth.set(ws, 100);

        waitingPlayer.send(JSON.stringify({ type: 'matchFound', turn: true, health: 100 }));
        ws.send(JSON.stringify({ type: 'matchFound', turn: false, health: 100 }));

        waitingPlayer = null;
    } else {
        // No waiting player, so this player waits for someone else to join
        waitingPlayer = ws;
        ws.send(JSON.stringify({ type: 'waitingForMatch' }));
    }

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        // Find which match this player belongs to
        for (let [match, matchData] of matches.entries()) {
            if (match.includes(ws)) {
                // Handle game logic
                const opponent = match[0] === ws ? match[1] : match[0];

                if (data.type === 'playerMove') {
                    // Ensure it's the current player's turn
                    if (matchData.currentTurn !== ws) {
                        ws.send(JSON.stringify({ type: 'notYourTurn' }));
                        return;
                    }

                    // For this example, we'll just randomly deal damage when a move is made
                    const damage = 10; // Example fixed damage
                    const currentHealth = playerHealth.get(opponent) - damage;
                    playerHealth.set(opponent, currentHealth);

                    // Check for game over
                    if (currentHealth <= 0) {
                        ws.send(JSON.stringify({ type: 'youWin' }));
                        opponent.send(JSON.stringify({ type: 'youLose' }));
                        matches.delete(match);
                        return;
                    }

                    // Update both players with the new state
                    ws.send(JSON.stringify({
                        type: 'update',
                        health: playerHealth.get(ws),
                        opponentHealth: currentHealth,
                        turn: false,
                    }));
                    opponent.send(JSON.stringify({
                        type: 'update',
                        health: currentHealth,
                        opponentHealth: playerHealth.get(ws),
                        turn: true,
                    }));

                    // Switch turns
                    matchData.currentTurn = opponent;
                }
            }
        }
    });

    ws.on('close', () => {
        console.log('Player disconnected.');
        if (waitingPlayer === ws) {
            waitingPlayer = null;
        } else {
            // If a player in a match disconnects, end the match
            for (let [match] of matches.entries()) {
                if (match.includes(ws)) {
                    const opponent = match[0] === ws ? match[1] : match[0];
                    opponent.send(JSON.stringify({ type: 'opponentDisconnected' }));
                    matches.delete(match);
                    playerHealth.delete(ws);
                    playerHealth.delete(opponent);
                }
            }
        }
    });
});

console.log(`WebSocket server running on port ${PORT}`);

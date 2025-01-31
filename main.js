// Game board setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const gridSize = 8;
const tileSize = 50;
const tileTypes = 5;
let grid = [];
let selectedTile = null;
let playerRole = "";
let isMyTurn = false;

// WebSocket setup
const socket = new WebSocket("wss://eternalvaloramends.onrender.com");

socket.onopen = () => {
    console.log("Connected to WebSocket server");
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
        case "playerRole":
            playerRole = data.role;
            document.getElementById("roleDisplay").textContent = `Your role: ${playerRole}`;
            break;
        case "initGrid":
        case "updateGrid":
            handleGridUpdate(data.grid);
            break;
        case "yourTurn":
            isMyTurn = true;
            console.log("It's your turn!");
            break;
        case "opponentTurn":
            isMyTurn = false;
            console.log("Waiting for opponent...");
            break;
        default:
            console.warn("Unhandled message type:", data.type);
    }
};

socket.onclose = () => {
    console.log("Disconnected from WebSocket server");
};

// Canvas setup
canvas.width = gridSize * tileSize;
canvas.height = gridSize * tileSize;
canvas.addEventListener("click", handleTileClick);

// Game functions
function handleGridUpdate(newGrid) {
    grid = newGrid;
    drawGrid();
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            ctx.fillStyle = getColor(grid[row][col]);
            ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
            ctx.strokeStyle = "black";
            ctx.strokeRect(col * tileSize, row * tileSize, tileSize, tileSize);
        }
    }
}

function getColor(type) {
    const colors = ["red", "blue", "green", "yellow", "purple"];
    return colors[type] || "gray";
}

function handleTileClick(event) {
    const col = Math.floor(event.offsetX / tileSize);
    const row = Math.floor(event.offsetY / tileSize);

    if (!isMyTurn) {
        console.warn("It's not your turn!");
        return;
    }

    if (!selectedTile) {
        selectedTile = { row, col };
        console.log("Selected tile set to:", selectedTile);
    } else {
        const targetTile = { row, col };

        if (isAdjacent(selectedTile, targetTile)) {
            socket.send(JSON.stringify({
                type: "playerMove",
                role: playerRole,
                from: selectedTile,
                to: targetTile
            }));

            const matches = checkMatches();
            if (matches.length > 0) {
                removeMatches(matches);
            }

            selectedTile = null;
        } else {
            console.warn("Tiles are not adjacent.");
        }
    }
}

function isAdjacent(tile1, tile2) {
    const dx = Math.abs(tile1.col - tile2.col);
    const dy = Math.abs(tile1.row - tile2.row);
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

function checkMatches() {
    let matches = [];
    // Check rows for matches
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize - 2; col++) {
            if (grid[row][col] === grid[row][col + 1] && grid[row][col] === grid[row][col + 2]) {
                matches.push({ row, col }, { row, col: col + 1 }, { row, col: col + 2 });
            }
        }
    }
    // Check columns for matches
    for (let col = 0; col < gridSize; col++) {
        for (let row = 0; row < gridSize - 2; row++) {
            if (grid[row][col] === grid[row + 1][col] && grid[row][col] === grid[row + 2][col]) {
                matches.push({ row, col }, { row: row + 1, col }, { row: row + 2, col });
            }
        }
    }
    return matches;
}

function removeMatches(matches) {
    matches.forEach(({ row, col }) => {
        grid[row][col] = -1;
    });
    drawGrid();
    setTimeout(() => refillGrid(), 500);
}

function refillGrid() {
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
    drawGrid();
}

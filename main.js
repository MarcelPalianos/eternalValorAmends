const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const gridSize = 8;
const tileSize = 50;
const tileTypes = 5;
let grid = [];
let selectedTile = null;
let playerRole = "";

const socket = new WebSocket("wss://eternalvaloramends.onrender.com");


socket.onopen = () => {
    console.log("Connected to WebSocket server");
};

const messageHandlers = {
    playerRole: (data) => {
        playerRole = data.role;
        console.log(`You are ${playerRole}`);},
    initGrid: (data) => handleGridUpdate(data.grid),
    updateGrid: (data) => handleGridUpdate(data.grid),
    yourTurn: () => {
        console.log("It's your turn!");},
    opponentTurn: () => {
        console.log("Waiting for opponent...");
    }
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (messageHandlers[data.type]) {
        messageHandlers[data.type](data);
    } else {
        console.warn("Unhandled message type:", data.type);
    }
};



socket.onclose = () => {
    console.log("Disconnected from WebSocket server");
};

canvas.width = gridSize * tileSize;
canvas.height = gridSize * tileSize;
canvas.addEventListener("click", handleTileClick);

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

function handleGridUpdate(newGrid) {
    grid = newGrid;
    drawGrid();
}

function handleTileClick(event) {
    const col = Math.floor(event.offsetX / tileSize);
    const row = Math.floor(event.offsetY / tileSize);

    if (!selectedTile) {
        // First click: select the initial tile
        selectedTile = { row, col };
        console.log("Selected tile set to:", selectedTile);
    } else {
        // Second click: attempt a move
        if (isAdjacent(selectedTile, { row, col })) {
            // Send the move to the server
            socket.send(JSON.stringify({
                type: "playerMove",
                role: playerRole,
                from: selectedTile,
                to: { row, col }
            }));
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


function swapTiles(tile1, tile2) {
    if (!tile1 || !tile2) {
        console.error("swapTiles called with invalid tiles:", tile1, tile2);
        return;
    }
    const temp = grid[tile1.row][tile1.col];
    grid[tile1.row][tile1.col] = grid[tile2.row][tile2.col];
    grid[tile2.row][tile2.col] = temp;
    drawGrid();
}


function animateTileSwap(tile1, tile2, onComplete) {
    const frameCount = 10;
    const dx = (tile2.col - tile1.col) * tileSize / frameCount;
    const dy = (tile2.row - tile1.row) * tileSize / frameCount;
    let currentFrame = 0;

    function animate() {
        currentFrame++;
        if (currentFrame > frameCount) {
            onComplete();
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                if ((row === tile1.row && col === tile1.col) || (row === tile2.row && col === tile2.col)) {
                    continue;
                }
                ctx.fillStyle = getColor(grid[row][col]);
                ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
                ctx.strokeStyle = "black";
                ctx.strokeRect(col * tileSize, row * tileSize, tileSize, tileSize);
            }
        }

        ctx.fillStyle = getColor(grid[tile1.row][tile1.col]);
        ctx.fillRect((tile1.col * tileSize) + (currentFrame * dx), (tile1.row * tileSize) + (currentFrame * dy), tileSize, tileSize);

        ctx.fillStyle = getColor(grid[tile2.row][tile2.col]);
        ctx.fillRect((tile2.col * tileSize) - (currentFrame * dx), (tile2.row * tileSize) - (currentFrame * dy), tileSize, tileSize);

        requestAnimationFrame(animate);
    }

    animate();
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

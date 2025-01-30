const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const gridSize = 8;
const tileSize = 50;
const tileTypes = 5;
let grid = [];
let selectedTile = null;
let tileSelection = 0;

const socket = new WebSocket("wss://eternalvaloramends.onrender.com");

let messageQueue = [];

socket.onopen = () => {
    console.log("%c[WebSocket] Connected to server!", "color: green; font-weight: bold;");
    socket.ready = true;
    while (messageQueue.length > 0) {
        let msg = messageQueue.shift();
        console.log("%c[WebSocket] Sending queued message:", "color: yellow;", msg);
        socket.send(JSON.stringify(msg));
    }
    sendMessage({ type: "requestGrid" });
};

socket.onerror = (error) => console.error("%c[WebSocket] Error:", "color: red;", error);

socket.onclose = () => {
    console.warn("%c[WebSocket] Disconnected. Attempting to reconnect...", "color: orange;");
    setTimeout(() => reconnectWebSocket(), 1000);
};

function sendMessage(data) {
    if (socket.readyState === WebSocket.OPEN) {
        console.log("%c[WebSocket] Sending:", "color: cyan;", data);
        socket.send(JSON.stringify(data));
    } else {
        console.warn("%c[WebSocket] Not ready. Queuing message...", "color: orange;", data);
        messageQueue.push(data);
        setTimeout(() => sendMessage(data), 500);
    }
}

socket.onmessage = (event) => {
    console.log("%c[WebSocket] Message received:", "color: purple;", event.data);
    const data = JSON.parse(event.data);
    if (data.type === "updateGrid") {
        grid = data.grid;
        console.log("%c[Game] Grid updated from server:", "color: blue;", grid);
        drawGrid();
    }
};

canvas.width = gridSize * tileSize;
canvas.height = gridSize * tileSize;
canvas.addEventListener("click", handleTileClick);

function generateGrid() {
    for (let row = 0; row < gridSize; row++) {
        grid[row] = [];
        for (let col = 0; col < gridSize; col++) {
            grid[row][col] = Math.floor(Math.random() * tileTypes);
        }
    }
    console.log("%c[Game] Grid generated:", "color: green;", grid);
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
    
if (!selectedTile) {
    selectedTile = { row, col };
    console.log("Selected tile set to:", selectedTile);
}
 else {
        if (isAdjacent(selectedTile, { row, col })) {
            animateTileSwap(selectedTile, { row, col }, () => {
                console.log("Before swap: selectedTile=", selectedTile, "currentClick=", { row, col });
                if (!selectedTile) {
    console.warn("selectedTile is null, cannot swap.");
    return;
}


                swapTiles(selectedTile, { row, col });
                sendMessage({ type: "swapTiles", from: selectedTile, to: { row, col } });
                setTimeout(() => checkMatches(), 300);
            });
        }
        selectedTile = null;
    }
}

function isAdjacent(tile1, tile2) {
    const dx = Math.abs(tile1.col - tile2.col);
    const dy = Math.abs(tile1.row - tile2.row);
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

function swapTiles(tile1, tile2) {
    if (!tile1 || !tile2) {
        console.error("swapTiles called with null tiles:", tile1, tile2);
        return;
    }
    let temp = grid[tile1.row][tile1.col];
    grid[tile1.row][tile1.col] = grid[tile2.row][tile2.col];
    grid[tile2.row][tile2.col] = temp;
    drawGrid();
}

function checkMatches() {
    let matches = [];
    
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize - 2; col++) {
            if (grid[row][col] === grid[row][col + 1] && grid[row][col] === grid[row][col + 2]) {
                matches.push({ row, col }, { row, col: col + 1 }, { row, col: col + 2 });
            }
        }
    }
    
    for (let col = 0; col < gridSize; col++) {
        for (let row = 0; row < gridSize - 2; row++) {
            if (grid[row][col] === grid[row + 1][col] && grid[row][col] === grid[row + 2][col]) {
                matches.push({ row, col }, { row: row + 1, col }, { row: row + 2, col });
            }
        }
    }
    
    if (matches.length > 0) {
        console.log("Matches found:", matches);
        removeMatches(matches);
    }
}

function removeMatches(matches) {
    matches.forEach(({ row, col }) => {
        grid[row][col] = -1;
    });
    drawGrid();
    setTimeout(() => refillGrid(), 500);
}

function refillGrid() {
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            if (grid[row][col] === -1) {
                grid[row][col] = Math.floor(Math.random() * tileTypes);
            }
        }
    }
    drawGrid();
}

function animateTileSwap(tile1, tile2, onComplete) {
    const frameCount = 10;
    const dx = (tile2.col - tile1.col) * tileSize / frameCount;
    const dy = (tile2.row - tile1.row) * tileSize / frameCount;

    let currentFrame = 0;

    const animate = () => {
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
    };

    animate();
}

generateGrid();
drawGrid();

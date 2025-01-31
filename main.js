const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const gridSize = 8;
const tileSize = 50;
let grid = [];
let selectedTile = null;

const socket = new WebSocket("wss://eternalvaloramends.onrender.com");

socket.onopen = () => {
    console.log("Connected to WebSocket server");
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "initGrid") {
        // Receive the initial grid from the server
        grid = data.grid;
        drawGrid();
    } else if (data.type === "updateGrid") {
        // Receive updated grid after a move
        grid = data.grid;
        drawGrid();
    } else if (data.type === "youWin") {
        console.log("You win!");
    } else if (data.type === "youLose") {
        console.log("You lose!");
    } else if (data.type === "notYourTurn") {
        console.log("Not your turn yet!");
    } else if (data.type === "opponentDisconnected") {
        console.log("Opponent disconnected. The game has ended.");
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

function handleTileClick(event) {
    const col = Math.floor(event.offsetX / tileSize);
    const row = Math.floor(event.offsetY / tileSize);

    if (!selectedTile) {
        selectedTile = { row, col };
        console.log("Selected tile set to:", selectedTile);
    } else {
        if (isAdjacent(selectedTile, { row, col })) {
            // Send the move to the server
            socket.send(JSON.stringify({
                type: "playerMove",
                from: selectedTile,
                to: { row, col }
            }));
        } else {
            console.warn("Tiles are not adjacent.");
        }
        selectedTile = null;
    }
}

function isAdjacent(tile1, tile2) {
    const dx = Math.abs(tile1.col - tile2.col);
    const dy = Math.abs(tile1.row - tile2.row);
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

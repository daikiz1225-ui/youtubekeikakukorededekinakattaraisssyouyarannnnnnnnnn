/**
 * tetris.js - iPad Touch Optimized
 */
const Tetris = {
    canvas: null,
    ctx: null,
    grid: 25, // マスのサイズ
    cols: 10,
    rows: 20,
    board: [],
    score: 0,
    timer: null,
    currentPiece: null,

    // 7種類のテトリミノ
    shapes: {
        'I': [[1, 1, 1, 1]],
        'O': [[1, 1], [1, 1]],
        'T': [[0, 1, 0], [1, 1, 1]],
        'S': [[0, 1, 1], [1, 1, 0]],
        'Z': [[1, 1, 0], [0, 1, 1]],
        'J': [[1, 0, 0], [1, 1, 1]],
        'L': [[0, 0, 1], [1, 1, 1]]
    },
    colors: { 'I': '#00f0f0', 'O': '#f0f000', 'T': '#a000f0', 'S': '#00f000', 'Z': '#f00000', 'J': '#0000f0', 'L': '#f0a000' },

    init() {
        GameModule.setupGameCanvas("テトリス", "tetris");
        const container = document.getElementById('tetris-container');
        container.innerHTML = `
            <div style="color: white; font-size: 20px; margin-bottom: 5px;">Score: <span id="tetris-score">0</span></div>
            <canvas id="tetris-canvas" width="250" height="500" style="background:#111; border:2px solid #555;"></canvas>
            <div class="tetris-controls" style="display: grid; grid-template-columns: repeat(3, 70px); gap: 10px; margin-top: 20px; justify-content: center;">
                <div></div><button onclick="Tetris.rotate()" class="ctrl-btn">🔄</button><div></div>
                <button onclick="Tetris.move(-1, 0)" class="ctrl-btn">◀</button>
                <button onclick="Tetris.move(0, 1)" class="ctrl-btn">▼</button>
                <button onclick="Tetris.move(1, 0)" class="ctrl-btn">▶</button>
                <div></div><button onclick="Tetris.hardDrop()" class="ctrl-btn" style="background:#f44336;">⏬</button><div></div>
            </div>
            <style>
                .ctrl-btn { width: 70px; height: 70px; font-size: 24px; background: #444; color: white; border: none; border-radius: 50%; touch-action: none; }
                .ctrl-btn:active { background: #666; }
            </style>
        `;

        this.canvas = document.getElementById('tetris-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resetGame();
        this.start();
    },

    resetGame() {
        this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        this.score = 0;
        this.spawnPiece();
    },

    spawnPiece() {
        const types = Object.keys(this.shapes);
        const type = types[Math.floor(Math.random() * types.length)];
        this.currentPiece = {
            type: type,
            shape: this.shapes[type],
            color: this.colors[type],
            x: Math.floor(this.cols / 2) - Math.floor(this.shapes[type][0].length / 2),
            y: 0
        };
        if (this.collide()) {
            alert("GAME OVER! Score: " + this.score);
            this.resetGame();
        }
    },

    collide(offsetX = 0, offsetY = 0, newShape = null) {
        const shape = newShape || this.currentPiece.shape;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    let newX = this.currentPiece.x + c + offsetX;
                    let newY = this.currentPiece.y + r + offsetY;
                    if (newX < 0 || newX >= this.cols || newY >= this.rows || (newY >= 0 && this.board[newY][newX])) {
                        return true;
                    }
                }
            }
        }
        return false;
    },

    move(dx, dy) {
        if (!this.collide(dx, dy)) {
            this.currentPiece.x += dx;
            this.currentPiece.y += dy;
            this.draw();
            return true;
        } else if (dy > 0) {
            this.lockPiece();
        }
        return false;
    },

    rotate() {
        const s = this.currentPiece.shape;
        const rotated = s[0].map((_, i) => s.map(row => row[i]).reverse());
        if (!this.collide(0, 0, rotated)) {
            this.currentPiece.shape = rotated;
            this.draw();
        }
    },

    hardDrop() {
        while (this.move(0, 1));
    },

    lockPiece() {
        this.currentPiece.shape.forEach((row, r) => {
            row.forEach((val, c) => {
                if (val) this.board[this.currentPiece.y + r][this.currentPiece.x + c] = this.currentPiece.color;
            });
        });
        this.clearLines();
        this.spawnPiece();
    },

    clearLines() {
        let linesCleared = 0;
        for (let r = this.rows - 1; r >= 0; r--) {
            if (this.board[r].every(cell => cell !== 0)) {
                this.board.splice(r, 1);
                this.board.unshift(Array(this.cols).fill(0));
                linesCleared++;
                r++;
            }
        }
        if (linesCleared > 0) {
            this.score += [0, 100, 300, 500, 800][linesCleared];
            document.getElementById('tetris-score').innerText = this.score;
        }
    },

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // 盤面の描画
        this.board.forEach((row, r) => {
            row.forEach((color, c) => {
                if (color) this.drawBlock(c, r, color);
            });
        });
        // 現在のピースの描画
        this.currentPiece.shape.forEach((row, r) => {
            row.forEach((val, c) => {
                if (val) this.drawBlock(this.currentPiece.x + c, this.currentPiece.y + r, this.currentPiece.color);
            });
        });
    },

    drawBlock(x, y, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * this.grid, y * this.grid, this.grid - 1, this.grid - 1);
        this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        this.ctx.strokeRect(x * this.grid, y * this.grid, this.grid - 1, this.grid - 1);
    },

    start() {
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => {
            this.move(0, 1);
            this.draw();
        }, 800);
        this.draw();
    }
};

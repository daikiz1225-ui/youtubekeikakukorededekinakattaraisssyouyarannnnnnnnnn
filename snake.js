/**
 * snake.js - iPad Swipe Optimized
 */
const Snake = {
    canvas: null,
    ctx: null,
    gridSize: 20,
    tileCount: 20,
    snake: [{x: 10, y: 10}],
    food: {x: 5, y: 5},
    dx: 0,
    dy: 0,
    nextDx: 0,
    nextDy: 0,
    score: 0,
    gameInterval: null,
    touchStart: {x: 0, y: 0},

    init() {
        GameModule.setupGameCanvas("ヘビゲーム", "snake");
        const container = document.getElementById('snake-container');
        container.innerHTML = `
            <div style="color: white; font-size: 20px; margin-bottom: 10px; font-weight: bold;">SCORE: <span id="snake-score">0</span></div>
            <canvas id="snake-canvas" width="400" height="400" style="background:#111; border:2px solid #555; touch-action:none;"></canvas>
            <p style="color: #aaa; margin-top: 15px;">画面をスワイプしてヘビを操れ！</p>
        `;

        this.canvas = document.getElementById('snake-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resetGame();
        this.setupTouchEvents();
        
        if(this.gameInterval) clearInterval(this.gameInterval);
        this.gameInterval = setInterval(() => this.update(), 150);
    },

    resetGame() {
        this.snake = [{x: 10, y: 10}];
        this.generateFood();
        this.dx = 0; this.dy = 0;
        this.nextDx = 0; this.nextDy = 0;
        this.score = 0;
        document.getElementById('snake-score').innerText = "0";
    },

    generateFood() {
        this.food = {
            x: Math.floor(Math.random() * this.tileCount),
            y: Math.floor(Math.random() * this.tileCount)
        };
        // ヘビの体の上にエサが出ないようにチェック
        if (this.snake.some(s => s.x === this.food.x && s.y === this.food.y)) {
            this.generateFood();
        }
    },

    setupTouchEvents() {
        this.canvas.ontouchstart = (e) => {
            this.touchStart.x = e.touches[0].clientX;
            this.touchStart.y = e.touches[0].clientY;
        };
        this.canvas.ontouchend = (e) => {
            const dx = e.changedTouches[0].clientX - this.touchStart.x;
            const dy = e.changedTouches[0].clientY - this.touchStart.y;
            
            if (Math.abs(dx) > Math.abs(dy)) {
                if (Math.abs(dx) > 20 && this.dx === 0) { // 横移動
                    this.nextDx = dx > 0 ? 1 : -1;
                    this.nextDy = 0;
                }
            } else {
                if (Math.abs(dy) > 20 && this.dy === 0) { // 縦移動
                    this.nextDy = dy > 0 ? 1 : -1;
                    this.nextDx = 0;
                }
            }
        };
    },

    update() {
        // 最初の移動が始まるまで待機
        if (this.nextDx === 0 && this.nextDy === 0) {
            this.draw();
            return;
        }

        this.dx = this.nextDx;
        this.dy = this.nextDy;

        const head = { x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy };

        // 衝突判定（壁）
        if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
            this.gameOver();
            return;
        }

        // 衝突判定（自分）
        if (this.snake.some(s => s.x === head.x && s.y === head.y)) {
            this.gameOver();
            return;
        }

        this.snake.unshift(head);

        // 食事判定
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            document.getElementById('snake-score').innerText = this.score;
            this.generateFood();
        } else {
            this.snake.pop();
        }

        this.draw();
    },

    draw() {
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // エサの描画
        this.ctx.fillStyle = '#ff4444';
        this.ctx.fillRect(this.food.x * this.gridSize, this.food.y * this.gridSize, this.gridSize - 2, this.gridSize - 2);

        // ヘビの描画
        this.snake.forEach((part, index) => {
            this.ctx.fillStyle = (index === 0) ? '#4CAF50' : '#81C784';
            this.ctx.fillRect(part.x * this.gridSize, part.y * this.gridSize, this.gridSize - 2, this.gridSize - 2);
        });
    },

    gameOver() {
        alert("GAME OVER! SCORE: " + this.score);
        this.resetGame();
    }
};

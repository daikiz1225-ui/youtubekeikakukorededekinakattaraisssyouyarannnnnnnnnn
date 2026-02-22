/**
 * game2048.js - iPad Swipe Optimized
 */
const Game2048 = {
    board: [],
    size: 4,
    score: 0,
    touchStart: { x: 0, y: 0 },

    init() {
        GameModule.setupGameCanvas("2048", "g2048");
        this.score = 0;
        this.board = Array(this.size).fill().map(() => Array(this.size).fill(0));
        
        const container = document.getElementById('g2048-container');
        container.innerHTML = `
            <div style="color: white; font-size: 24px; margin-bottom: 10px; font-weight: bold;">SCORE: <span id="2048-score">0</span></div>
            <div id="grid-container" style="
                width: 320px; height: 320px; 
                background: #bbada0; 
                border-radius: 10px; 
                padding: 10px; 
                display: grid; 
                grid-template-columns: repeat(4, 1fr); 
                gap: 10px; 
                touch-action: none;
                margin: 0 auto;
            "></div>
            <p style="color: #aaa; margin-top: 20px;">スワイプして数字を合体させよう！</p>
        `;

        this.addNumber();
        this.addNumber();
        this.render();
        this.setupTouchEvents();
    },

    addNumber() {
        let emptyCells = [];
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.board[r][c] === 0) emptyCells.push({r, c});
            }
        }
        if (emptyCells.length > 0) {
            const {r, c} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.board[r][c] = Math.random() < 0.9 ? 2 : 4;
        }
    },

    render() {
        const grid = document.getElementById('grid-container');
        grid.innerHTML = '';
        this.board.forEach(row => {
            row.forEach(val => {
                const cell = document.createElement('div');
                cell.className = 'cell-2048';
                cell.innerText = val === 0 ? '' : val;
                cell.style.background = this.getTileColor(val);
                cell.style.color = val <= 4 ? '#776e65' : 'white';
                cell.style.fontSize = val >= 1024 ? '20px' : '30px';
                grid.appendChild(cell);
            });
        });
        document.getElementById('2048-score').innerText = this.score;
    },

    getTileColor(val) {
        const colors = {
            0: '#cdc1b4', 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179',
            16: '#f59563', 32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72',
            256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e'
        };
        return colors[val] || '#3c3a32';
    },

    setupTouchEvents() {
        const grid = document.getElementById('grid-container');
        grid.ontouchstart = (e) => {
            this.touchStart.x = e.touches[0].clientX;
            this.touchStart.y = e.touches[0].clientY;
        };
        grid.ontouchend = (e) => {
            const dx = e.changedTouches[0].clientX - this.touchStart.x;
            const dy = e.changedTouches[0].clientY - this.touchStart.y;
            
            if (Math.abs(dx) > Math.abs(dy)) {
                if (Math.abs(dx) > 30) dx > 0 ? this.move('right') : this.move('left');
            } else {
                if (Math.abs(dy) > 30) dy > 0 ? this.move('down') : this.move('up');
            }
        };
    },

    move(dir) {
        let moved = false;
        const rotate = (times) => {
            for (let i = 0; i < times; i++) {
                this.board = this.board[0].map((_, c) => this.board.map(r => r[c]).reverse());
            }
        };

        // すべての移動を「左に寄せる」処理として共通化する回転テクニック
        if (dir === 'up') rotate(3);
        if (dir === 'right') rotate(2);
        if (dir === 'down') rotate(1);

        for (let r = 0; r < this.size; r++) {
            let row = this.board[r].filter(v => v !== 0);
            for (let i = 0; i < row.length - 1; i++) {
                if (row[i] === row[i+1]) {
                    row[i] *= 2;
                    this.score += row[i];
                    row.splice(i+1, 1);
                    moved = true;
                }
            }
            while (row.length < this.size) row.push(0);
            if (JSON.stringify(this.board[r]) !== JSON.stringify(row)) moved = true;
            this.board[r] = row;
        }

        if (dir === 'up') rotate(1);
        if (dir === 'right') rotate(2);
        if (dir === 'down') rotate(3);

        if (moved) {
            this.addNumber();
            this.render();
            if (this.isGameOver()) alert("GAME OVER!");
        }
    },

    isGameOver() {
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.board[r][c] === 0) return false;
                if (c < 3 && this.board[r][c] === this.board[r][c+1]) return false;
                if (r < 3 && this.board[r][c] === this.board[r+1][c]) return false;
            }
        }
        return true;
    }
};

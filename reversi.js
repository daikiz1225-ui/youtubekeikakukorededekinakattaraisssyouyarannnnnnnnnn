/**
 * reversi.js - 2-Player Reversi for iPad
 */
const Reversi = {
    board: [],
    size: 8,
    turn: 1, // 1: 黒, 2: 白
    scores: { 1: 2, 2: 2 },

    init() {
        GameModule.setupGameCanvas("リバーシ", "reversi");
        this.resetGame();
        this.render();
    },

    resetGame() {
        this.board = Array(this.size).fill().map(() => Array(this.size).fill(0));
        this.turn = 1;
        // 初期配置
        this.board[3][3] = 2; this.board[3][4] = 1;
        this.board[4][3] = 1; this.board[4][4] = 2;
        this.updateScore();
    },

    render() {
        const container = document.getElementById('reversi-container');
        container.innerHTML = `
            <div style="text-align:center; color:white;">
                <div style="display:flex; justify-content:center; gap:20px; margin-bottom:15px; font-size:20px; font-weight:bold;">
                    <div style="color:${this.turn === 1 ? '#00ff00' : '#fff'}">⚫ 黒: ${this.scores[1]}</div>
                    <div style="color:${this.turn === 2 ? '#00ff00' : '#fff'}">⚪ 白: ${this.scores[2]}</div>
                </div>
                <div id="rev-board" style="
                    display: grid; grid-template-columns: repeat(8, 40px); 
                    background: #2e7d32; border: 4px solid #1b5e20; padding: 5px; margin: 0 auto;
                ">
                    ${this.renderCells()}
                </div>
                <div style="margin-top:15px;">手番: ${this.turn === 1 ? '⚫ 黒' : '⚪ 白'}</div>
                <button onclick="Reversi.resetGame(); Reversi.render();" style="margin-top:15px; padding:8px 15px;">リセット</button>
            </div>
        `;
    },

    renderCells() {
        let html = '';
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const stone = this.board[r][c];
                const canPlace = this.getFlippableStones(r, c, this.turn).length > 0;
                html += `
                    <div onclick="Reversi.cellClick(${r},${c})" style="
                        width:40px; height:40px; border:0.5px solid #1b5e20; 
                        display:flex; align-items:center; justify-content:center; cursor:pointer;
                        position:relative;
                    ">
                        ${stone ? `<div style="width:34px; height:34px; border-radius:50%; background:${stone === 1 ? '#000' : '#fff'}; box-shadow: 2px 2px 4px rgba(0,0,0,0.3);"></div>` : ''}
                        ${!stone && canPlace ? `<div style="width:10px; height:10px; border-radius:50%; background:rgba(0,0,0,0.1);"></div>` : ''}
                    </div>
                `;
            }
        }
        return html;
    },

    cellClick(r, c) {
        if (this.board[r][c] !== 0) return;

        const flippable = this.getFlippableStones(r, c, this.turn);
        if (flippable.length === 0) return; // 置けない場所

        // 石を置く
        this.board[r][c] = this.turn;
        // ひっくり返す
        flippable.forEach(pos => {
            this.board[pos.r][pos.c] = this.turn;
        });

        this.turn = this.turn === 1 ? 2 : 1;
        
        // パス判定
        if (!this.hasValidMove(this.turn)) {
            this.turn = this.turn === 1 ? 2 : 1;
            if (!this.hasValidMove(this.turn)) {
                this.updateScore();
                this.render();
                alert(`終局！ 黒:${this.scores[1]} 白:${this.scores[2]}`);
                return;
            } else {
                alert("打てる場所がないのでパスします。");
            }
        }

        this.updateScore();
        this.render();
    },

    getFlippableStones(r, c, color) {
        const opponent = color === 1 ? 2 : 1;
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        let allFlippable = [];

        directions.forEach(([dr, dc]) => {
            let row = r + dr;
            let col = c + dc;
            let potential = [];

            while (row >= 0 && row < 8 && col >= 0 && col < 8 && this.board[row][col] === opponent) {
                potential.push({ r: row, c: col });
                row += dr;
                col += dc;
            }

            if (row >= 0 && row < 8 && col >= 0 && col < 8 && this.board[row][col] === color) {
                allFlippable = allFlippable.concat(potential);
            }
        });

        return allFlippable;
    },

    hasValidMove(color) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.board[r][c] === 0 && this.getFlippableStones(r, c, color).length > 0) return true;
            }
        }
        return false;
    },

    updateScore() {
        let b = 0, w = 0;
        this.board.forEach(row => row.forEach(val => {
            if (val === 1) b++;
            if (val === 2) w++;
        }));
        this.scores = { 1: b, 2: w };
    }
};

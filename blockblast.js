/**
 * blockblast.js - Complete Edition
 */
const BlockBlast = {
    board: [],
    boardSize: 8,
    score: 0,
    currentPieces: [],
    draggingElement: null,
    dragData: { x: 0, y: 0, pieceIndex: -1 },

    shapes: [
        { cells: [[1, 1, 1]], color: '#00bcd4' }, // I3
        { cells: [[1, 1], [1, 1]], color: '#ffeb3b' }, // Square
        { cells: [[1, 0], [1, 0], [1, 1]], color: '#ff9800' }, // L
        { cells: [[0, 1], [0, 1], [1, 1]], color: '#2196f3' }, // J
        { cells: [[0, 1, 0], [1, 1, 1]], color: '#9c27b0' }, // T
        { cells: [[1, 1, 0], [0, 1, 1]], color: '#4caf50' }, // S
        { cells: [[1]], color: '#f44336' } // Dot
    ],

    init() {
        GameModule.setupGameCanvas("ブロックブラスト", "blockblast");
        this.score = 0;
        this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(0));
        this.generateNewPieces();
        this.render();
    },

    generateNewPieces() {
        this.currentPieces = [];
        for (let i = 0; i < 3; i++) {
            const shape = this.shapes[Math.floor(Math.random() * this.shapes.length)];
            this.currentPieces.push({ ...shape, id: i, used: false });
        }
    },

    render() {
        const container = document.getElementById('blockblast-container');
        container.innerHTML = `
            <div style="color: white; font-size: 24px; margin-bottom: 10px; font-weight: bold;">SCORE: ${this.score}</div>
            <div id="bb-board" style="display: grid; grid-template-columns: repeat(${this.boardSize}, 40px); gap: 4px; background: #444; padding: 10px; border-radius: 8px; touch-action: none;">
                ${this.renderBoardCells()}
            </div>
            <div id="bb-pieces-area" style="display: flex; justify-content: space-around; align-items: center; margin-top: 30px; min-height: 120px; touch-action: none; background: rgba(255,255,255,0.05); border-radius: 15px;">
                ${this.renderPieces()}
            </div>
        `;
        this.attachDragEvents();
    },

    renderBoardCells() {
        return this.board.map((row, r) => row.map((cell, c) => 
            `<div id="cell-${r}-${c}" style="width: 40px; height: 40px; background: ${cell ? cell : '#222'}; border-radius: 4px; transition: background 0.2s;"></div>`
        ).join('')).join('');
    },

    renderPieces() {
        return this.currentPieces.map((p, idx) => {
            if (p.used) return `<div style="width:100px;"></div>`;
            const gridHTML = p.cells.map(row => row.map(c => 
                `<div style="width:20px; height:20px; background:${c ? p.color : 'transparent'}; border-radius:2px;"></div>`
            ).join('')).join('');
            return `<div class="piece-container" data-idx="${idx}" style="cursor:grab; touch-action:none; display:grid; grid-template-columns:repeat(${p.cells[0].length}, 20px);">${gridHTML}</div>`;
        }).join('');
    },

    attachDragEvents() {
        document.querySelectorAll('.piece-container').forEach(el => {
            el.ontouchstart = (e) => this.dragStart(e, el);
        });
    },

    dragStart(e, el) {
        const touch = e.touches[0];
        this.draggingElement = el;
        this.dragData.pieceIndex = parseInt(el.dataset.idx);
        el.style.position = 'fixed';
        el.style.zIndex = '1000';
        el.style.transform = 'scale(1.8)'; 
        this.updateDragPos(touch.clientX, touch.clientY);

        document.ontouchmove = (ev) => {
            ev.preventDefault();
            this.updateDragPos(ev.touches[0].clientX, ev.touches[0].clientY);
        };
        document.ontouchend = (ev) => this.dragEnd(ev);
    },

    updateDragPos(x, y) {
        // 指に被らないように少し上に表示
        this.draggingElement.style.left = `${x - 40}px`;
        this.draggingElement.style.top = `${y - 120}px`;
    },

    dragEnd(e) {
        if (!this.draggingElement) return;

        const rect = document.getElementById('bb-board').getBoundingClientRect();
        const elRect = this.draggingElement.getBoundingClientRect();
        
        // 盤面上の相対座標から、どのセルにドロップされたか計算
        const col = Math.round((elRect.left - rect.left) / 44);
        const row = Math.round((elRect.top - rect.top) / 44);

        const piece = this.currentPieces[this.dragData.pieceIndex];

        if (this.canPlace(piece, row, col)) {
            this.placePiece(piece, row, col);
            piece.used = true;
            this.checkLines();
            if (this.currentPieces.every(p => p.used)) this.generateNewPieces();
            this.checkGameOver();
        }

        this.draggingElement = null;
        document.ontouchmove = null;
        document.ontouchend = null;
        this.render();
    },

    canPlace(piece, row, col) {
        for (let r = 0; r < piece.cells.length; r++) {
            for (let c = 0; c < piece.cells[r].length; c++) {
                if (piece.cells[r][c]) {
                    const nr = row + r;
                    const nc = col + c;
                    if (nr < 0 || nr >= this.boardSize || nc < 0 || nc >= this.boardSize) return false;
                    if (this.board[nr][nc]) return false;
                }
            }
        }
        return true;
    },

    placePiece(piece, row, col) {
        for (let r = 0; r < piece.cells.length; r++) {
            for (let c = 0; c < piece.cells[r].length; c++) {
                if (piece.cells[r][c]) {
                    this.board[row + r][col + c] = piece.color;
                }
            }
        }
        this.score += 10;
    },

    checkLines() {
        let rowsToClear = [];
        let colsToClear = [];

        for (let i = 0; i < this.boardSize; i++) {
            if (this.board[i].every(cell => cell !== 0)) rowsToClear.push(i);
            if (this.board.every(row => row[i] !== 0)) colsToClear.push(i);
        }

        rowsToClear.forEach(r => this.board[r].fill(0));
        colsToClear.forEach(c => {
            for (let r = 0; r < this.boardSize; r++) this.board[r][c] = 0;
        });

        if (rowsToClear.length > 0 || colsToClear.length > 0) {
            this.score += (rowsToClear.length + colsToClear.length) * 100;
        }
    },

    checkGameOver() {
        const available = this.currentPieces.filter(p => !p.used);
        const canMove = available.some(p => {
            for (let r = 0; r < this.boardSize; r++) {
                for (let c = 0; c < this.boardSize; c++) {
                    if (this.canPlace(p, r, c)) return true;
                }
            }
            return false;
        });

        if (!canMove && available.length > 0) {
            alert("GAME OVER! SCORE: " + this.score);
            this.init();
        }
    }
};

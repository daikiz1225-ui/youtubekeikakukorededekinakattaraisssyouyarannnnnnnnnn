/**
 * blockblast.js - Drag & Random Edition
 */
const BlockBlast = {
    board: [],
    boardSize: 8,
    score: 0,
    currentPieces: [],
    draggingElement: null,
    dragData: { x: 0, y: 0, startX: 0, startY: 0, pieceIndex: -1 },

    // ブロックの形（形状データ）
    shapes: [
        { name: 'I2', cells: [[1, 1]], color: '#00bcd4' },
        { name: 'I3', cells: [[1, 1, 1]], color: '#00bcd4' },
        { name: 'L', cells: [[1, 0], [1, 0], [1, 1]], color: '#ff9800' },
        { name: 'Sq', cells: [[1, 1], [1, 1]], color: '#ffeb3b' },
        { name: 'T', cells: [[0, 1, 0], [1, 1, 1]], color: '#9c27b0' },
        { name: 'S', cells: [[1, 1, 0], [0, 1, 1]], color: '#4caf50' },
        { name: 'Dot', cells: [[1]], color: '#f44336' }
    ],

    init() {
        GameModule.setupGameCanvas("ブロックブラスト", "blockblast");
        this.score = 0;
        this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(0));
        this.generateNewPieces();
        this.render();
    },

    // 3つの新しいピースをランダムに生成
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
            <div style="color: white; font-size: 24px; margin-bottom: 10px;">Score: ${this.score}</div>
            <div id="bb-board" style="display: grid; grid-template-columns: repeat(${this.boardSize}, 40px); gap: 4px; background: #444; padding: 10px; border-radius: 8px; touch-action: none;">
                ${this.renderBoardCells()}
            </div>
            <div id="bb-pieces-area" style="display: flex; justify-content: space-around; margin-top: 30px; min-height: 120px; touch-action: none;">
                ${this.renderPieces()}
            </div>
        `;
        this.attachDragEvents();
    },

    renderBoardCells() {
        return this.board.map(row => row.map(cell => 
            `<div class="cell" style="width: 40px; height: 40px; background: ${cell ? '#666' : '#222'}; border-radius: 4px;"></div>`
        ).join('')).join('');
    },

    renderPieces() {
        return this.currentPieces.map((p, idx) => {
            if (p.used) return `<div style="width:100px;"></div>`;
            const gridHTML = p.cells.map(row => row.map(c => 
                `<div style="width:20px; height:20px; background:${c ? p.color : 'transparent'}; border-radius:2px;"></div>`
            ).join('')).join('');
            
            return `
                <div class="piece-container" data-idx="${idx}" style="cursor:grab; touch-action:none; display:grid; grid-template-columns:repeat(${p.cells[0].length}, 20px);">
                    ${gridHTML}
                </div>
            `;
        }).join('');
    },

    attachDragEvents() {
        const containers = document.querySelectorAll('.piece-container');
        containers.forEach(el => {
            el.ontouchstart = (e) => this.dragStart(e, el);
        });
    },

    dragStart(e, el) {
        const touch = e.touches[0];
        this.draggingElement = el;
        this.dragData.pieceIndex = parseInt(el.dataset.idx);
        this.dragData.startX = touch.clientX;
        this.dragData.startY = touch.clientY;
        
        el.style.position = 'fixed';
        el.style.zIndex = '1000';
        el.style.transform = 'scale(1.5)'; // 掴んでいる間は少し大きく
        this.updateDragPos(touch.clientX, touch.clientY);

        document.ontouchmove = (ev) => this.dragMove(ev);
        document.ontouchend = () => this.dragEnd();
    },

    dragMove(e) {
        if (!this.draggingElement) return;
        const touch = e.touches[0];
        this.updateDragPos(touch.clientX, touch.clientY);
    },

    updateDragPos(x, y) {
        this.draggingElement.style.left = `${x - 40}px`;
        this.draggingElement.style.top = `${y - 100}px`;
    },

    dragEnd() {
        if (!this.draggingElement) return;
        
        // 本来はここで「盤面に置けるか」の判定を入れる
        // 今は練習用に、どこでも指を離したら「使った」ことにする
        const pIdx = this.dragData.pieceIndex;
        this.currentPieces[pIdx].used = true;
        
        // 全部のピースを使い切ったら補充
        if (this.currentPieces.every(p => p.used)) {
            this.generateNewPieces();
        }

        this.draggingElement = null;
        document.ontouchmove = null;
        document.ontouchend = null;
        this.render(); // 再描画
    }
};

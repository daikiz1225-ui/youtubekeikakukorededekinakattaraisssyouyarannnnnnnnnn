/**
 * blockblast.js
 * iPadタッチ操作対応 ブロックブラスト風パズル
 */
const BlockBlast = {
    board: [],
    boardSize: 8,
    score: 0,

    init() {
        GameModule.setupGameCanvas("ブロックブラスト", "blockblast");
        this.score = 0;
        this.initBoard();
        this.render();
    },

    // 盤面をリセット（0は空、1はブロックあり）
    initBoard() {
        this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(0));
    },

    render() {
        const container = document.getElementById('blockblast-container');
        container.innerHTML = `
            <div style="color: white; font-size: 24px; margin-bottom: 10px;">Score: ${this.score}</div>
            <div id="bb-board" style="
                display: grid; 
                grid-template-columns: repeat(${this.boardSize}, 40px); 
                grid-template-rows: repeat(${this.boardSize}, 40px); 
                gap: 4px; 
                background: #444; 
                padding: 10px; 
                border-radius: 8px;
                touch-action: none;
            ">
                ${this.renderBoardCells()}
            </div>
            <div id="bb-pieces" style="
                display: flex; 
                justify-content: space-around; 
                margin-top: 30px; 
                height: 120px;
                touch-action: none;
            ">
                ${this.renderNewPieces()}
            </div>
        `;
    },

    renderBoardCells() {
        let html = '';
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                const filled = this.board[r][c];
                html += `<div style="
                    width: 40px; height: 40px; 
                    background: ${filled ? '#4CAF50' : '#222'}; 
                    border-radius: 4px;"></div>`;
            }
        }
        return html;
    },

    renderNewPieces() {
        // ※まずは見た目だけ。次のステップでドラッグ機能を付けるぞ。
        return `
            <div class="piece-mock" style="width:80px; height:80px; background:#ff9800; border-radius:8px;"></div>
            <div class="piece-mock" style="width:80px; height:80px; background:#2196F3; border-radius:8px;"></div>
            <div class="piece-mock" style="width:80px; height:80px; background:#e91e63; border-radius:8px;"></div>
        `;
    }
};

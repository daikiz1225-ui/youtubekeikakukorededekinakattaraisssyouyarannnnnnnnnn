/**
 * shogi.js - 2-Player Shogi for iPad
 */
const Shogi = {
    board: [],
    selected: null, // {r, c}
    turn: 'black', // black: 先手(▲), white: 後手(△)
    hand: { black: [], white: [] },

    // 駒の種類と表示
    pieces: {
        'FU': { name: '歩', name_p: 'と' },
        'KY': { name: '香', name_p: '杏' },
        'KE': { name: '桂', name_p: '圭' },
        'GI': { name: '銀', name_p: '全' },
        'KI': { name: '金' },
        'KA': { name: '角', name_p: '馬' },
        'HI': { name: '飛', name_p: '龍' },
        'OU': { name: '王' }
    },

    init() {
        GameModule.setupGameCanvas("将棋 (2人対戦)", "shogi");
        this.resetBoard();
        this.render();
    },

    resetBoard() {
        // 9x9の空盤面を作成
        this.board = Array(9).fill().map(() => Array(9).fill(null));
        
        // 初期配置 (一部抜粋して配置するぜ)
        const setup = (r, owner) => {
            const side = owner === 'black' ? 1 : -1;
            // 実際はここで全駒配置するが、まずは歩と王だけ配置してみる
            for(let i=0; i<9; i++) this.board[owner==='black'?6:2][i] = {type:'FU', owner, promoted:false};
            this.board[owner==='black'?8:0][4] = {type:'OU', owner, promoted:false};
            this.board[owner==='black'?8:0][0] = {type:'KY', owner, promoted:false};
            this.board[owner==='black'?8:0][8] = {type:'KY', owner, promoted:false};
        };
        setup('black', 'black');
        setup('white', 'white');
    },

    render() {
        const container = document.getElementById('shogi-container');
        container.innerHTML = `
            <div id="shogi-board-wrapper" style="user-select:none; touch-action:none; text-align:center;">
                <div id="hand-white" style="margin-bottom:10px; min-height:40px; transform:rotate(180deg);">後手持ち駒</div>
                <div id="s-board" style="
                    display: grid; grid-template-columns: repeat(9, 35px); 
                    grid-template-rows: repeat(9, 40px);
                    background: #e3c16f; border: 2px solid #333; margin: 0 auto;
                ">
                    ${this.renderCells()}
                </div>
                <div id="hand-black" style="margin-top:10px; min-height:40px;">先手持ち駒</div>
                <div style="margin-top:20px; color:white;">手番: ${this.turn === 'black' ? '▲先手' : '△後手'}</div>
            </div>
        `;
    },

    renderCells() {
        let html = '';
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const p = this.board[r][c];
                const isSelected = this.selected && this.selected.r === r && this.selected.c === c;
                html += `
                    <div onclick="Shogi.cellClick(${r},${c})" style="
                        border: 0.5px solid #333; display: flex; align-items: center; justify-content: center;
                        font-weight: bold; font-size: 20px;
                        background: ${isSelected ? '#ffeb3b' : 'transparent'};
                        transform: ${p && p.owner === 'white' ? 'rotate(180deg)' : 'none'};
                    ">
                        ${p ? this.pieces[p.type].name : ''}
                    </div>
                `;
            }
        }
        return html;
    },

    cellClick(r, c) {
        const p = this.board[r][c];
        
        if (this.selected) {
            // 移動させる処理 (簡易版)
            if (this.selected.r === r && this.selected.c === c) {
                this.selected = null;
            } else {
                this.board[r][c] = this.board[this.selected.r][this.selected.c];
                this.board[this.selected.r][this.selected.c] = null;
                this.selected = null;
                this.turn = this.turn === 'black' ? 'white' : 'black';
            }
        } else {
            if (p && p.owner === this.turn) {
                this.selected = {r, c};
            }
        }
        this.render();
    }
};

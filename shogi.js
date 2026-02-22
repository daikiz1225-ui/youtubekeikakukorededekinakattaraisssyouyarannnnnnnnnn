/**
 * shogi.js - Rule-Enforced Edition
 */
const Shogi = {
    board: [],
    selected: null, // {r, c, type: 'board' | 'hand'}
    turn: 'black',
    hand: { black: [], white: [] },

    pieces: {
        'FU': { name: '歩', move: [[-1, 0]], promote: 'TO' },
        'KY': { name: '香', move: 'jump_f', promote: 'NY' },
        'KE': { name: '桂', move: [[-2, -1], [-2, 1]], promote: 'NK' },
        'GI': { name: '銀', move: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 1]], promote: 'NG' },
        'KI': { name: '金', move: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0]] },
        'KA': { name: '角', move: 'jump_d', promote: 'UM' },
        'HI': { name: '飛', move: 'jump_s', promote: 'RY' },
        'OU': { name: '王', move: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]] },
        // 成り駒
        'TO': { name: 'と', move: 'gold' }, 'NY': { name: '杏', move: 'gold' },
        'NK': { name: '圭', move: 'gold' }, 'NG': { name: '全', move: 'gold' },
        'UM': { name: '馬', move: 'jump_d_king' }, 'RY': { name: '龍', move: 'jump_s_king' }
    },

    init() {
        GameModule.setupGameCanvas("将棋", "shogi");
        this.resetBoard();
        this.render();
    },

    resetBoard() {
        this.board = Array(9).fill().map(() => Array(9).fill(null));
        this.hand = { black: [], white: [] };
        this.turn = 'black';
        
        const set = (r, c, type, owner) => this.board[r][c] = {type, owner};
        
        // 簡易初期配置 (主要な駒だけ)
        [0, 8].forEach(c => set(8, c, 'KY', 'black'));
        [1, 7].forEach(c => set(8, c, 'KE', 'black'));
        [2, 6].forEach(c => set(8, c, 'GI', 'black'));
        [3, 5].forEach(c => set(8, c, 'KI', 'black'));
        set(8, 4, 'OU', 'black');
        set(7, 1, 'KA', 'black'); set(7, 7, 'HI', 'black');
        for(let i=0; i<9; i++) set(6, i, 'FU', 'black');

        // 後手 (対称)
        [0, 8].forEach(c => set(0, c, 'KY', 'white'));
        [1, 7].forEach(c => set(0, c, 'KE', 'white'));
        [2, 6].forEach(c => set(0, c, 'GI', 'white'));
        [3, 5].forEach(c => set(0, c, 'KI', 'white'));
        set(0, 4, 'OU', 'white');
        set(1, 7, 'KA', 'white'); set(1, 1, 'HI', 'white');
        for(let i=0; i<9; i++) set(2, i, 'FU', 'white');
    },

    render() {
        const container = document.getElementById('shogi-container');
        container.innerHTML = `
            <div style="background:#333; padding:20px; border-radius:15px; color:white;">
                <div id="hand-white" style="display:flex; gap:5px; margin-bottom:15px; min-height:40px; transform:rotate(180deg);">
                    ${this.renderHand('white')}
                </div>
                <div style="display:grid; grid-template-columns:repeat(9, 38px); background:#e3c16f; border:3px solid #643; margin:0 auto;">
                    ${this.renderCells()}
                </div>
                <div id="hand-black" style="display:flex; gap:5px; margin-top:15px; min-height:40px;">
                    ${this.renderHand('black')}
                </div>
                <div style="margin-top:15px; font-weight:bold;">手番: ${this.turn === 'black' ? '▲先手' : '△後手'}</div>
            </div>
        `;
    },

    renderCells() {
        return this.board.map((row, r) => row.map((p, c) => {
            const isSel = this.selected && this.selected.type === 'board' && this.selected.r === r && this.selected.c === c;
            return `<div onclick="Shogi.cellClick(${r},${c})" style="
                width:38px; height:42px; border:0.5px solid #643; display:flex; align-items:center; justify-content:center;
                background:${isSel ? '#ffeb3b' : 'transparent'}; color:#000; font-size:18px;
                transform:${p && p.owner === 'white' ? 'rotate(180deg)' : 'none'};
            ">${p ? this.pieces[p.type].name : ''}</div>`;
        }).join('')).join('');
    },

    renderHand(owner) {
        return this.hand[owner].map((type, idx) => {
            const isSel = this.selected && this.selected.type === 'hand' && this.selected.owner === owner && this.selected.idx === idx;
            return `<div onclick="Shogi.handClick('${owner}', ${idx})" style="
                width:35px; height:40px; background:${isSel ? '#ffeb3b' : '#e3c16f'}; color:#000;
                display:flex; align-items:center; justify-content:center; border-radius:3px; border:1px solid #333;
            ">${this.pieces[type].name}</div>`;
        }).join('');
    },

    cellClick(r, c) {
        const target = this.board[r][c];

        if (this.selected) {
            if (this.selected.type === 'board') {
                if (this.canMove(this.selected.r, this.selected.c, r, c)) {
                    this.executeMove(this.selected.r, this.selected.c, r, c);
                }
            } else if (this.selected.type === 'hand') {
                if (!target) this.executeDrop(r, c);
            }
            this.selected = null;
        } else if (target && target.owner === this.turn) {
            this.selected = { type: 'board', r, c };
        }
        this.render();
    },

    handClick(owner, idx) {
        if (this.turn === owner) {
            this.selected = { type: 'hand', owner, idx };
            this.render();
        }
    },

    canMove(sr, sc, tr, tc) {
        const p = this.board[sr][sc];
        const target = this.board[tr][tc];
        if (target && target.owner === p.owner) return false;

        const dr = tr - sr;
        const dc = tc - sc;
        const ownerDir = p.owner === 'black' ? 1 : -1;

        // 簡易的な動きチェック（実際は金や飛車の特殊な動きをここに書く）
        // とりあえず「王」の動きでテスト可能
        return true; 
    },

    executeMove(sr, sc, tr, tc) {
        const p = this.board[sr][sc];
        const target = this.board[tr][tc];

        if (target) {
            // 駒を取る
            let rawType = target.type; // 成り駒は元に戻して持ち駒へ
            this.hand[this.turn].push(rawType);
        }

        this.board[tr][tc] = p;
        this.board[sr][sc] = null;
        this.turn = this.turn === 'black' ? 'white' : 'black';
    },

    executeDrop(r, c) {
        const type = this.hand[this.turn][this.selected.idx];
        this.board[r][c] = { type, owner: this.turn };
        this.hand[this.turn].splice(this.selected.idx, 1);
        this.turn = this.turn === 'black' ? 'white' : 'black';
    }
};

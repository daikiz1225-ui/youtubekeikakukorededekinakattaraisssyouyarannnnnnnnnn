/**
 * shogi.js - Precision Rule Edition
 */
const Shogi = {
    board: [],
    selected: null,
    turn: 'black',
    hand: { black: [], white: [] },

    // 駒のデータ定義
    pieces: {
        'FU': { name: '歩', promote: 'TO' },
        'KY': { name: '香', promote: 'NY' },
        'KE': { name: '桂', promote: 'NK' },
        'GI': { name: '銀', promote: 'NG' },
        'KI': { name: '金' },
        'KA': { name: '角', promote: 'UM' },
        'HI': { name: '飛', promote: 'RY' },
        'OU': { name: '王' },
        'TO': { name: 'と', base: 'KI' },
        'NY': { name: '杏', base: 'KI' },
        'NK': { name: '圭', base: 'KI' },
        'NG': { name: '全', base: 'KI' },
        'UM': { name: '馬' },
        'RY': { name: '龍' }
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
        const set = (r, c, type, owner) => this.board[r][c] = { type, owner };

        // 本格初期配置
        const layout = ['KY','KE','GI','KI','OU','KI','GI','KE','KY'];
        for(let i=0; i<9; i++) {
            set(8, i, layout[i], 'black');
            set(0, i, layout[i], 'white');
            set(6, i, 'FU', 'black');
            set(2, i, 'FU', 'white');
        }
        set(7, 1, 'KA', 'black'); set(7, 7, 'HI', 'black');
        set(1, 7, 'KA', 'white'); set(1, 1, 'HI', 'white');
    },

    // 駒の動きを判定するコアロジック
    canMove(sr, sc, tr, tc) {
        const p = this.board[sr][sc];
        const target = this.board[tr][tc];
        if (target && target.owner === p.owner) return false;

        const dr = tr - sr;
        const dc = tc - sc;
        const adr = Math.abs(dr);
        const adc = Math.abs(dc);
        const ownerDir = p.owner === 'black' ? -1 : 1; // 先手は上に進む(-1)

        // 共通のスライドチェック関数
        const checkSlide = (rd, cd) => {
            let r = sr + rd, c = sc + cd;
            while (r !== tr || c !== tc) {
                if (this.board[r][c]) return false; // 途中に駒があればNG
                r += rd; c += cd;
            }
            return true;
        };

        const type = p.type;
        
        // 各駒の動き
        if (type === 'FU') return (dr === ownerDir && dc === 0);
        if (type === 'KY') return (dc === 0 && dr * ownerDir > 0 && checkSlide(ownerDir, 0));
        if (type === 'KE') return (dr === ownerDir * 2 && adc === 1);
        if (type === 'GI') return (dr === ownerDir && adc <= 1) || (adr === 1 && adc === 1);
        if (type === 'KI' || ['TO','NY','NK','NG'].includes(type)) {
            return (adr <= 1 && adc <= 1) && !(dr === -ownerDir && adc === 1);
        }
        if (type === 'OU') return (adr <= 1 && adc <= 1);
        
        // 飛車・龍
        if (type === 'HI' || type === 'RY') {
            if (dr === 0 || dc === 0) return checkSlide(Math.sign(dr), Math.sign(dc));
            if (type === 'RY' && adr === 1 && adc === 1) return true;
        }
        // 角・馬
        if (type === 'KA' || type === 'UM') {
            if (adr === adc) return checkSlide(Math.sign(dr), Math.sign(dc));
            if (type === 'UM' && adr <= 1 && adc <= 1) return true;
        }

        return false;
    },

    executeMove(sr, sc, tr, tc) {
        const p = this.board[sr][sc];
        const target = this.board[tr][tc];

        if (target) {
            // 成り駒は元の種類に戻して持ち駒へ
            let baseType = target.type;
            if (['TO','NY','NK','NG'].includes(baseType)) baseType = baseType === 'TO' ? 'FU' : baseType.replace('N','');
            if (baseType === 'UM') baseType = 'KA';
            if (baseType === 'RY') baseType = 'HI';
            this.hand[this.turn].push(baseType);
        }

        // 成り判定
        const isPromotionZone = (this.turn === 'black' && (tr <= 2 || sr <= 2)) || (this.turn === 'white' && (tr >= 6 || sr >= 6));
        if (this.pieces[p.type].promote && isPromotionZone) {
            if (confirm("成りますか？")) {
                p.type = this.pieces[p.type].promote;
            }
        }

        this.board[tr][tc] = p;
        this.board[sr][sc] = null;
        this.turn = this.turn === 'black' ? 'white' : 'black';
    },

    // (render, cellClick, renderHand 等の表示系は前回のコードを維持)
    render() {
        const container = document.getElementById('shogi-container');
        container.innerHTML = `
            <div style="background:#444; padding:15px; border-radius:10px; display:inline-block;">
                <div id="hand-white" style="display:flex; flex-wrap:wrap; gap:3px; width:342px; min-height:40px; margin-bottom:10px; transform:rotate(180deg); background:#555; padding:5px; border-radius:5px;">
                    ${this.renderHand('white')}
                </div>
                <div style="display:grid; grid-template-columns:repeat(9, 38px); background:#e3c16f; border:2px solid #333;">
                    ${this.renderCells()}
                </div>
                <div id="hand-black" style="display:flex; flex-wrap:wrap; gap:3px; width:342px; min-height:40px; margin-top:10px; background:#555; padding:5px; border-radius:5px;">
                    ${this.renderHand('black')}
                </div>
                <div style="margin-top:10px; color:white; font-weight:bold;">手番: ${this.turn === 'black' ? '▲先手' : '△後手'}</div>
            </div>
        `;
    },

    renderCells() {
        return this.board.map((row, r) => row.map((p, c) => {
            const isSel = this.selected && this.selected.type === 'board' && this.selected.r === r && this.selected.c === c;
            return `<div onclick="Shogi.cellClick(${r},${c})" style="
                width:38px; height:42px; border:0.5px solid #643; display:flex; align-items:center; justify-content:center;
                background:${isSel ? '#ffeb3b' : 'transparent'}; color:#000; font-size:18px; cursor:pointer;
                transform:${p && p.owner === 'white' ? 'rotate(180deg)' : 'none'};
            ">${p ? this.pieces[p.type].name : ''}</div>`;
        }).join('')).join('');
    },

    renderHand(owner) {
        return this.hand[owner].map((type, idx) => {
            const isSel = this.selected && this.selected.type === 'hand' && this.selected.owner === owner && this.selected.idx === idx;
            return `<div onclick="Shogi.handClick('${owner}', ${idx})" style="
                width:35px; height:40px; background:${isSel ? '#ffeb3b' : '#e3c16f'}; color:#000;
                display:flex; align-items:center; justify-content:center; border:1px solid #333; cursor:pointer; font-size:16px;
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

    executeDrop(r, c) {
        const type = this.hand[this.turn][this.selected.idx];
        this.board[r][c] = { type, owner: this.turn };
        this.hand[this.turn].splice(this.selected.idx, 1);
        this.turn = this.turn === 'black' ? 'white' : 'black';
    }
};

/**
 * cannon.js - 2-Player Physics Battle
 */
const CannonGame = {
    canvas: null, ctx: null,
    turn: 1, // 1: 左(Blue), 2: 右(Red)
    isDragging: false,
    dragStart: {x: 0, y: 0},
    dragCurrent: {x: 0, y: 0},
    projectiles: [],
    blocks: [],
    castles: [],
    interval: null,

    init() {
        GameModule.setupGameCanvas("大砲バトル", "cannon");
        const container = document.getElementById('cannon-container');
        container.innerHTML = `
            <div style="text-align:center; color:white; margin-bottom:10px; font-weight:bold; font-size:20px;">
                <span id="cannon-status" style="color:${this.turn === 1 ? '#2196F3' : '#F44336'}">
                    ${this.turn === 1 ? '← PLAYER 1' : 'PLAYER 2 →'} のターン
                </span>
            </div>
            <canvas id="cannon-canvas" width="600" height="400" style="background:linear-gradient(#87CEEB, #E0F7FA); border:4px solid #555; touch-action:none;"></canvas>
            <p style="color:#333; margin-top:10px; font-weight:bold;">大砲を後ろに引っ張って撃て！</p>
        `;
        this.canvas = document.getElementById('cannon-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.resetGame();
        this.setupTouchEvents();
        if(this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => this.update(), 1000/60);
    },

    resetGame() {
        this.blocks = [];
        this.projectiles = [];
        // 地面の生成
        this.generateCastle(80, 1); // 左の城
        this.generateCastle(480, 2); // 右の城
        // 中央の障害物
        for(let i=0; i<5; i++) {
            this.blocks.push({x: 280, y: 380 - i*30, w: 40, h: 30, hp: 2});
        }
    },

    generateCastle(startX, p) {
        for(let r=0; r<3; r++) {
            for(let c=0; c<3; c++) {
                this.blocks.push({
                    x: startX + c*25, 
                    y: 370 - r*30, 
                    w: 20, h: 25, 
                    hp: 1,
                    isCastle: true,
                    owner: p
                });
            }
        }
    },

    setupTouchEvents() {
        const getPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches ? e.touches[0] : e;
            return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        };

        this.canvas.onmousedown = this.canvas.ontouchstart = (e) => {
            const pos = getPos(e);
            // 自分の陣地側を触っているかチェック
            if ((this.turn === 1 && pos.x < 300) || (this.turn === 2 && pos.x > 300)) {
                this.isDragging = true;
                this.dragStart = pos;
                this.dragCurrent = pos;
            }
        };

        window.onmousemove = window.ontouchmove = (e) => {
            if (this.isDragging) this.dragCurrent = getPos(e);
        };

        window.onmouseup = window.ontouchend = (e) => {
            if (this.isDragging) {
                this.fire();
                this.isDragging = false;
            }
        };
    },

    fire() {
        const dx = this.dragStart.x - this.dragCurrent.x;
        const dy = this.dragStart.y - this.dragCurrent.y;
        const power = 0.15;

        this.projectiles.push({
            x: this.turn === 1 ? 50 : 550,
            y: 350,
            vx: dx * power,
            vy: dy * power,
            r: 8
        });

        this.turn = this.turn === 1 ? 2 : 1;
        const status = document.getElementById('cannon-status');
        status.innerText = this.turn === 1 ? '← PLAYER 1 のターン' : 'PLAYER 2 → のターン';
        status.style.color = this.turn === 1 ? '#2196F3' : '#F44336';
    },

    update() {
        // 弾の物理計算
        this.projectiles.forEach((p, pIdx) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // 重力

            // ブロックとの衝突判定
            this.blocks.forEach((b, bIdx) => {
                if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) {
                    b.hp--;
                    this.projectiles.splice(pIdx, 1);
                    if (b.hp <= 0) this.blocks.splice(bIdx, 1);
                }
            });

            // 地面・壁判定
            if (p.y > 400 || p.x < 0 || p.x > 600) this.projectiles.splice(pIdx, 1);
        });

        // 勝利判定
        const p1Castle = this.blocks.some(b => b.isCastle && b.owner === 1);
        const p2Castle = this.blocks.some(b => b.isCastle && b.owner === 2);
        if (!p1Castle || !p2Castle) {
            alert(p1Castle ? "PLAYER 1 の勝利！" : "PLAYER 2 の勝利！");
            this.resetGame();
        }

        this.draw();
    },

    draw() {
        this.ctx.clearRect(0, 0, 600, 400);

        // 地面
        this.ctx.fillStyle = "#4CAF50";
        this.ctx.fillRect(0, 380, 600, 20);

        // ブロック・城
        this.blocks.forEach(b => {
            this.ctx.fillStyle = b.isCastle ? (b.owner === 1 ? '#2196F3' : '#F44336') : '#795548';
            this.ctx.fillRect(b.x, b.y, b.w, b.h);
            this.ctx.strokeStyle = "#fff";
            this.ctx.strokeRect(b.x, b.y, b.w, b.h);
        });

        // 弾
        this.ctx.fillStyle = "#333";
        this.projectiles.forEach(p => {
            this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); this.ctx.fill();
        });

        // ガイドライン（ドラッグ中）
        if (this.isDragging) {
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeStyle = "rgba(0,0,0,0.5)";
            this.ctx.beginPath();
            this.ctx.moveTo(this.dragStart.x, this.dragStart.y);
            this.ctx.lineTo(this.dragCurrent.x, this.dragCurrent.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }
};

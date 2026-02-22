/**
 * towerdefense.js - iPad Touch Optimized TD
 */
const TowerDefense = {
    canvas: null, ctx: null,
    money: 100, health: 10, score: 0,
    towers: [], enemies: [], bullets: [],
    path: [{x:0, y:200}, {x:100, y:200}, {x:100, y:100}, {x:300, y:100}, {x:300, y:300}, {x:500, y:300}],
    interval: null, spawnTimer: 0,

    init() {
        GameModule.setupGameCanvas("タワーディフェンス", "td");
        const container = document.getElementById('td-container');
        container.innerHTML = `
            <div style="color: white; font-size: 18px; margin-bottom: 5px; display:flex; justify-content:space-around;">
                <span>💰: <span id="td-money">100</span></span>
                <span>❤️: <span id="td-health">10</span></span>
                <span>Score: <span id="td-score">0</span></span>
            </div>
            <canvas id="td-canvas" width="500" height="400" style="background:#222; border:2px solid #555; touch-action:none;"></canvas>
            <p style="color: #aaa; margin-top: 10px;">盤面をタップしてタワーを設置(コスト:50)</p>
        `;
        this.canvas = document.getElementById('td-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.reset();
        this.canvas.onclick = (e) => this.placeTower(e);
        if(this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => this.update(), 30);
    },

    reset() {
        this.money = 100; this.health = 10; this.score = 0;
        this.towers = []; this.enemies = []; this.bullets = [];
        this.spawnTimer = 0;
    },

    placeTower(e) {
        if (this.money < 50) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        // 道の上には建てられない判定（簡易）
        this.towers.push({x, y, range: 100, cd: 0});
        this.money -= 50;
        this.updateUI();
    },

    update() {
        // 敵の生成
        this.spawnTimer++;
        if (this.spawnTimer > 60) {
            this.enemies.push({pIdx: 0, x: 0, y: 200, hp: 3, speed: 2});
            this.spawnTimer = 0;
        }

        // 敵の移動
        this.enemies.forEach((en, i) => {
            const target = this.path[en.pIdx + 1];
            if (!target) {
                this.health--;
                this.enemies.splice(i, 1);
                this.updateUI();
                if(this.health <= 0) this.gameOver();
                return;
            }
            const dx = target.x - en.x;
            const dy = target.y - en.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 5) en.pIdx++;
            else {
                en.x += (dx/dist) * en.speed;
                en.y += (dy/dist) * en.speed;
            }
        });

        // タワーの攻撃
        this.towers.forEach(t => {
            t.cd--;
            if (t.cd <= 0) {
                const target = this.enemies.find(en => Math.hypot(en.x - t.x, en.y - t.y) < t.range);
                if (target) {
                    this.bullets.push({x: t.x, y: t.y, tx: target.x, ty: target.y, life: 10, target: target});
                    t.cd = 20;
                }
            }
        });

        // 弾の移動と命中
        this.bullets.forEach((b, i) => {
            b.x += (b.tx - b.x) * 0.2;
            b.y += (b.ty - b.y) * 0.2;
            b.life--;
            if (b.life <= 0) {
                b.target.hp--;
                this.bullets.splice(i, 1);
                if (b.target.hp <= 0) {
                    const eIdx = this.enemies.indexOf(b.target);
                    if (eIdx > -1) {
                        this.enemies.splice(eIdx, 1);
                        this.money += 20;
                        this.score += 100;
                        this.updateUI();
                    }
                }
            }
        });

        this.draw();
    },

    draw() {
        this.ctx.clearRect(0, 0, 500, 400);
        // 道の描画
        this.ctx.strokeStyle = "#444"; this.ctx.lineWidth = 30;
        this.ctx.beginPath();
        this.ctx.moveTo(this.path[0].x, this.path[0].y);
        this.path.forEach(p => this.ctx.lineTo(p.x, p.y));
        this.ctx.stroke();

        // タワー
        this.ctx.fillStyle = "#2196F3";
        this.towers.forEach(t => {
            this.ctx.beginPath(); this.ctx.arc(t.x, t.y, 15, 0, Math.PI*2); this.ctx.fill();
        });

        // 敵
        this.ctx.fillStyle = "#F44336";
        this.enemies.forEach(en => {
            this.ctx.fillRect(en.x-10, en.y-10, 20, 20);
        });

        // 弾
        this.ctx.fillStyle = "#FFEB3B";
        this.bullets.forEach(b => {
            this.ctx.beginPath(); this.ctx.arc(b.x, b.y, 4, 0, Math.PI*2); this.ctx.fill();
        });
    },

    updateUI() {
        document.getElementById('td-money').innerText = this.money;
        document.getElementById('td-health').innerText = this.health;
        document.getElementById('td-score').innerText = this.score;
    },

    gameOver() {
        alert("拠点が破壊されました！ Score: " + this.score);
        this.reset();
    }
};

/**
 * towerdefense.js - Enhanced Edition (Multiple Towers & Harder Enemies)
 */
const TowerDefense = {
    canvas: null, ctx: null,
    money: 150, health: 10, score: 0,
    wave: 1,
    selectedTowerType: 'normal',
    towers: [], enemies: [], bullets: [],
    path: [{x:0, y:200}, {x:100, y:200}, {x:100, y:100}, {x:300, y:100}, {x:300, y:300}, {x:500, y:300}],
    interval: null, spawnTimer: 0, enemiesInWave: 0,

    towerDefs: {
        'normal': { name: '連射', color: '#2196F3', cost: 50, range: 100, cd: 15, damage: 1, slow: 1 },
        'sniper': { name: '狙撃', color: '#FFEB3B', cost: 100, range: 200, cd: 50, damage: 3, slow: 1 },
        'freeze': { name: '氷結', color: '#00BCD4', cost: 75, range: 80, cd: 20, damage: 0.2, slow: 0.5 }
    },

    init() {
        GameModule.setupGameCanvas("タワーディフェンス改", "td");
        const container = document.getElementById('td-container');
        container.innerHTML = `
            <div style="color: white; font-size: 16px; margin-bottom: 5px; display:flex; justify-content:space-around; background:#333; padding:5px; border-radius:5px;">
                <span>💰: <span id="td-money">150</span></span>
                <span>❤️: <span id="td-health">10</span></span>
                <span>Wave: <span id="td-wave">1</span></span>
            </div>
            <canvas id="td-canvas" width="500" height="400" style="background:#1a1a1a; border:2px solid #555; touch-action:none;"></canvas>
            
            <div id="td-controls" style="display:flex; justify-content:center; gap:10px; margin-top:10px;">
                <button onclick="TowerDefense.selectTower('normal')" id="btn-normal" class="td-btn active" style="background:#2196F3">連射(50)</button>
                <button onclick="TowerDefense.selectTower('sniper')" id="btn-sniper" class="td-btn" style="background:#FF9800">狙撃(100)</button>
                <button onclick="TowerDefense.selectTower('freeze')" id="btn-freeze" class="td-btn" style="background:#00BCD4">氷結(75)</button>
            </div>

            <style>
                .td-btn { border:2px solid transparent; color:white; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:bold; }
                .td-btn.active { border-color: white; transform: scale(1.1); box-shadow: 0 0 10px rgba(255,255,255,0.5); }
            </style>
        `;
        this.canvas = document.getElementById('td-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.reset();
        this.canvas.onclick = (e) => this.placeTower(e);
        if(this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => this.update(), 30);
    },

    selectTower(type) {
        this.selectedTowerType = type;
        document.querySelectorAll('.td-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('btn-' + type).classList.add('active');
    },

    reset() {
        this.money = 150; this.health = 10; this.score = 0; this.wave = 1;
        this.towers = []; this.enemies = []; this.bullets = [];
        this.spawnTimer = 0; this.enemiesInWave = 0;
        this.updateUI();
    },

    placeTower(e) {
        const def = this.towerDefs[this.selectedTowerType];
        if (this.money < def.cost) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.towers.push({ x, y, ...def, currentCd: 0 });
        this.money -= def.cost;
        this.updateUI();
    },

    update() {
        // 敵の生成（ウェーブ制：ウェーブごとに敵が硬くなる）
        this.spawnTimer++;
        if (this.spawnTimer > 40) {
            const hpBase = 2 + (this.wave * 1.5); // ウェーブごとにHPアップ
            this.enemies.push({
                pIdx: 0, x: 0, y: 200, 
                hp: hpBase, maxHp: hpBase, 
                speed: 1.5 + (this.wave * 0.1), 
                currentSpeed: 1.5,
                reward: 15 + this.wave
            });
            this.spawnTimer = 0;
            this.enemiesInWave++;
            if(this.enemiesInWave > 10) {
                this.wave++;
                this.enemiesInWave = 0;
                this.updateUI();
            }
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
                en.x += (dx/dist) * en.currentSpeed;
                en.y += (dy/dist) * en.currentSpeed;
            }
            // 速度の回復（フリーズ効果の減衰）
            en.currentSpeed = en.speed;
        });

        // タワーの行動
        this.towers.forEach(t => {
            t.currentCd--;
            if (t.currentCd <= 0) {
                // 範囲内の敵を探す
                const target = this.enemies.find(en => Math.hypot(en.x - t.x, en.y - t.y) < t.range);
                if (target) {
                    this.bullets.push({
                        x: t.x, y: t.y, tx: target.x, ty: target.y, 
                        life: 8, target: target, 
                        damage: t.damage, slow: t.slow, color: t.color 
                    });
                    t.currentCd = t.cd;
                }
            }
        });

        // 弾の処理
        this.bullets.forEach((b, i) => {
            b.x += (b.tx - b.x) * 0.3;
            b.y += (b.ty - b.y) * 0.3;
            b.life--;
            if (b.life <= 0) {
                // 命中
                b.target.hp -= b.damage;
                b.target.currentSpeed *= b.slow; // スロー効果適用
                this.bullets.splice(i, 1);
                if (b.target.hp <= 0) {
                    const eIdx = this.enemies.indexOf(b.target);
                    if (eIdx > -1) {
                        this.enemies.splice(eIdx, 1);
                        this.money += b.target.reward;
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
        // 道
        this.ctx.strokeStyle = "#333"; this.ctx.lineWidth = 35;
        this.ctx.lineCap = "round"; this.ctx.lineJoin = "round";
        this.ctx.beginPath();
        this.ctx.moveTo(this.path[0].x, this.path[0].y);
        this.path.forEach(p => this.ctx.lineTo(p.x, p.y));
        this.ctx.stroke();

        // タワー
        this.towers.forEach(t => {
            this.ctx.fillStyle = t.color;
            this.ctx.beginPath(); this.ctx.arc(t.x, t.y, 12, 0, Math.PI*2); this.ctx.fill();
            // 範囲をうっすら描画
            this.ctx.strokeStyle = t.color; this.ctx.lineWidth = 1;
            this.ctx.globalAlpha = 0.1;
            this.ctx.beginPath(); this.ctx.arc(t.x, t.y, t.range, 0, Math.PI*2); this.ctx.stroke();
            this.ctx.globalAlpha = 1.0;
        });

        // 敵
        this.enemies.forEach(en => {
            this.ctx.fillStyle = "#F44336";
            this.ctx.fillRect(en.x-10, en.y-10, 20, 20);
            // HPバー
            this.ctx.fillStyle = "#000"; this.ctx.fillRect(en.x-12, en.y-18, 24, 4);
            this.ctx.fillStyle = "#00ff00"; this.ctx.fillRect(en.x-12, en.y-18, 24 * (en.hp/en.maxHp), 4);
        });

        // 弾
        this.bullets.forEach(b => {
            this.ctx.fillStyle = b.color;
            this.ctx.beginPath(); this.ctx.arc(b.x, b.y, 4, 0, Math.PI*2); this.ctx.fill();
        });
    },

    updateUI() {
        document.getElementById('td-money').innerText = Math.floor(this.money);
        document.getElementById('td-health').innerText = this.health;
        document.getElementById('td-wave').innerText = this.wave;
    },

    gameOver() {
        alert("GAME OVER! Wave: " + this.wave + "\nScore: " + this.score);
        this.reset();
    }
};

/**
 * towerdefense.js - Absolute Zero Edition
 */
const TowerDefense = {
    canvas: null, ctx: null,
    money: 200, health: 10, score: 0, wave: 1,
    selectedTowerType: 'normal',
    towers: [], enemies: [], bullets: [],
    path: [{x:0, y:200}, {x:100, y:200}, {x:100, y:100}, {x:300, y:100}, {x:300, y:300}, {x:500, y:300}],
    interval: null, spawnTimer: 0, enemiesInWave: 0,

    towerDefs: {
        'normal': { name: '標準', color: '#2196F3', cost: 50, range: 100, cd: 15, damage: 1, slow: 1, splash: 0 },
        'gatling': { name: '連射', color: '#4CAF50', cost: 80, range: 120, cd: 4, damage: 0.3, slow: 1, splash: 0 },
        'sniper': { name: '狙撃', color: '#FF9800', cost: 120, range: 250, cd: 60, damage: 5, slow: 1, splash: 0 },
        // 氷結：今の2倍速(cd:0.6) / ダメージ1/6(0.008) / 鈍足(0.3)
        'freeze': { name: '氷結', color: '#00BCD4', cost: 100, range: 100, cd: 0.6, damage: 0.008, slow: 0.3, splash: 0 },
        'bomb': { name: '爆弾', color: '#F44336', cost: 150, range: 110, cd: 45, damage: 2, slow: 1, splash: 50 }
    },

    init() {
        GameModule.setupGameCanvas("究極タワーディフェンス", "td");
        const container = document.getElementById('td-container');
        container.innerHTML = `
            <div style="color: white; font-size: 16px; margin-bottom: 5px; display:flex; justify-content:space-around; background:#333; padding:5px; border-radius:5px;">
                <span>💰: <span id="td-money">200</span></span>
                <span>❤️: <span id="td-health">10</span></span>
                <span>Wave: <span id="td-wave">1</span></span>
            </div>
            <canvas id="td-canvas" width="500" height="400" style="background:#1a1a1a; border:2px solid #555; touch-action:none;"></canvas>
            
            <div id="td-controls" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; margin-top:10px;">
                <button onclick="TowerDefense.selectTower('normal')" id="btn-normal" class="td-btn active" style="background:#2196F3">標準(50)</button>
                <button onclick="TowerDefense.selectTower('gatling')" id="btn-gatling" class="td-btn" style="background:#4CAF50">連射(80)</button>
                <button onclick="TowerDefense.selectTower('sniper')" id="btn-sniper" class="td-btn" style="background:#FF9800">狙撃(120)</button>
                <button onclick="TowerDefense.selectTower('freeze')" id="btn-freeze" class="td-btn" style="background:#00BCD4">氷結(100)</button>
                <button onclick="TowerDefense.selectTower('bomb')" id="btn-bomb" class="td-btn" style="background:#F44336">爆弾(150)</button>
                <button onclick="TowerDefense.reset()" class="td-btn" style="background:#666">リセット</button>
            </div>

            <style>
                .td-btn { border:2px solid transparent; color:white; padding:6px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold; }
                .td-btn.active { border-color: white; transform: scale(1.05); box-shadow: 0 0 8px #fff; }
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
        if(document.getElementById('btn-' + type)) document.getElementById('btn-' + type).classList.add('active');
    },

    reset() {
        this.money = 200; this.health = 10; this.score = 0; this.wave = 1;
        this.towers = []; this.enemies = []; this.bullets = [];
        this.spawnTimer = 0; this.enemiesInWave = 0;
        this.updateUI();
    },

    placeTower(e) {
        const def = this.towerDefs[this.selectedTowerType];
        if (this.money < def.cost) return;
        const rect = this.canvas.getBoundingClientRect();
        this.towers.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, ...def, currentCd: 0 });
        this.money -= def.cost;
        this.updateUI();
    },

    update() {
        this.spawnTimer++;
        if (this.spawnTimer > Math.max(8, 40 - (this.wave * 2))) {
            const hpBase = 3 * Math.pow(1.3, this.wave); // 少し敵を硬く調整
            this.enemies.push({ pIdx: 0, x: 0, y: 200, hp: hpBase, maxHp: hpBase, speed: 1.5 + (this.wave * 0.1), currentSpeed: 1.5, reward: 10 + this.wave });
            this.spawnTimer = 0;
            this.enemiesInWave++;
            if(this.enemiesInWave > 12) { this.wave++; this.enemiesInWave = 0; this.updateUI(); }
        }

        this.enemies.forEach((en, i) => {
            const target = this.path[en.pIdx + 1];
            if (!target) {
                this.health--; this.enemies.splice(i, 1); this.updateUI();
                if(this.health <= 0) this.gameOver(); return;
            }
            const dx = target.x - en.x, dy = target.y - en.y, dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 5) en.pIdx++;
            else { en.x += (dx/dist) * en.currentSpeed; en.y += (dy/dist) * en.currentSpeed; }
            en.currentSpeed = en.speed;
        });

        this.towers.forEach(t => {
            t.currentCd--;
            if (t.currentCd <= 0) {
                const target = this.enemies.find(en => Math.hypot(en.x - t.x, en.y - t.y) < t.range);
                if (target) {
                    this.bullets.push({ x: t.x, y: t.y, tx: target.x, ty: target.y, life: 6, target, damage: t.damage, slow: t.slow, splash: t.splash, color: t.color });
                    t.currentCd = t.cd;
                }
            }
        });

        this.bullets.forEach((b, i) => {
            b.x += (b.tx - b.x) * 0.5; b.y += (b.ty - b.y) * 0.5; b.life--; 
            if (b.life <= 0) {
                if (b.splash > 0) {
                    this.enemies.forEach(en => {
                        if (Math.hypot(en.x - b.tx, en.y - b.ty) < b.splash) en.hp -= b.damage;
                    });
                    this.drawExplosion(b.tx, b.ty, b.splash);
                } else {
                    b.target.hp -= b.damage;
                    if (b.slow < 1) b.target.currentSpeed *= b.slow;
                }
                this.bullets.splice(i, 1);
            }
        });

        this.enemies = this.enemies.filter(en => {
            if (en.hp <= 0) { this.money += en.reward; this.score += 50; this.updateUI(); return false; }
            return true;
        });
        this.draw();
    },

    drawExplosion(x, y, radius) {
        this.ctx.fillStyle = "rgba(255, 165, 0, 0.4)";
        this.ctx.beginPath(); this.ctx.arc(x, y, radius, 0, Math.PI*2); this.ctx.fill();
    },

    draw() {
        this.ctx.clearRect(0, 0, 500, 400);
        this.ctx.strokeStyle = "#333"; this.ctx.lineWidth = 35; this.ctx.lineCap = "round"; this.ctx.beginPath();
        this.ctx.moveTo(this.path[0].x, this.path[0].y); this.path.forEach(p => this.ctx.lineTo(p.x, p.y)); this.ctx.stroke();

        this.towers.forEach(t => {
            this.ctx.fillStyle = t.color;
            this.ctx.globalAlpha = 0.1;
            this.ctx.beginPath(); this.ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2); this.ctx.fill();
            this.ctx.globalAlpha = 1.0;
            this.ctx.beginPath(); this.ctx.arc(t.x, t.y, 12, 0, Math.PI*2); this.ctx.fill();
            this.ctx.strokeStyle = "#fff"; this.ctx.lineWidth = 1; this.ctx.stroke();
        });

        this.enemies.forEach(en => {
            this.ctx.fillStyle = en.currentSpeed < en.speed ? "#00BCD4" : "#F44336";
            this.ctx.fillRect(en.x-10, en.y-10, 20, 20);
            this.ctx.fillStyle = "#000"; this.ctx.fillRect(en.x-12, en.y-18, 24, 4);
            this.ctx.fillStyle = "#00ff00"; this.ctx.fillRect(en.x-12, en.y-18, 24 * (en.hp/en.maxHp), 4);
        });

        this.bullets.forEach(b => {
            this.ctx.fillStyle = b.color;
            this.ctx.beginPath(); this.ctx.arc(b.x, b.y, 3, 0, Math.PI*2); this.ctx.fill();
        });
    },

    updateUI() {
        document.getElementById('td-money').innerText = Math.floor(this.money);
        document.getElementById('td-health').innerText = this.health;
        document.getElementById('td-wave').innerText = this.wave;
    },

    gameOver() {
        alert("GAME OVER!\nWave: " + this.wave);
        this.reset();
    }
};

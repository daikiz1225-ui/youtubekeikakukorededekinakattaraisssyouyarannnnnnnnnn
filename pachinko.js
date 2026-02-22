/**
 * pachinko.js - Triple Fan Fortress Edition
 */
const Pachinko = {
    canvas: null, ctx: null,
    balls: [], pins: [], movingPins: [],
    score: 1000, isRush: false,
    slotSymbols: ["🍒", "🍉", "🔔", "🎰", "7️⃣"],
    currentSlot: ["❓", "❓", "❓"],
    isSlotSpinning: false,
    shootTimer: 0, isPressing: false,
    hue: 0, fanAngle: 0,
    shooterX: 200, shooterDir: 1,
    vZoneTimer: 0, rushTimer: 0,
    // ファンの位置データ
    fans: [
        { x: 200, y: 360, r: 30 }, // 上
        { x: 160, y: 405, r: 25 }, // 左下
        { x: 240, y: 405, r: 25 }  // 右下
    ],
    interval: null,

    init() {
        GameModule.setupGameCanvas("三連ファン・パチンコ", "pachinko");
        const container = document.getElementById('pachinko-container');
        container.innerHTML = `
            <style>
                #pachinko-container, #pk-canvas { -webkit-user-select: none; user-select: none; }
                @keyframes rainbow {
                    0% { border-color: red; box-shadow: 0 0 15px red; }
                    50% { border-color: lime; box-shadow: 0 0 15px lime; }
                    100% { border-color: blue; box-shadow: 0 0 15px blue; }
                }
                .rush-active { animation: rainbow 0.1s linear infinite; border-width: 10px !important; }
            </style>
            <div style="display:flex; justify-content:space-around; color:white; background:#333; padding:10px; border-radius:10px; margin-bottom:10px;">
                <div style="font-size:20px;">玉数: <span id="pk-score">1000</span></div>
                <div id="pk-mode" style="font-size:20px; color:#aaa; font-weight:bold;">通常モード</div>
            </div>
            <div id="pk-slot" style="font-size:40px; text-align:center; background:#111; border:4px solid #ffd700; margin-bottom:10px; padding:10px; border-radius:10px; color:white;">
                ❓ ❓ ❓
            </div>
            <canvas id="pk-canvas" width="400" height="500" style="background:#001f3f; border:4px solid #555; border-radius:10px; touch-action:none;"></canvas>
            <div id="pk-rush-bar" style="width:100%; height:8px; background:#222; margin-top:5px; border-radius:4px; display:none;">
                <div id="pk-rush-fill" style="width:100%; height:100%; background:linear-gradient(to right, red, lime, blue, magenta);"></div>
            </div>
        `;
        this.canvas = document.getElementById('pk-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.setupPins();
        this.setupTouchEvents();
        if(this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => this.update(), 1000/60);
    },

    setupPins() {
        this.pins = []; this.movingPins = [];
        for (let i = 0; i < 70; i++) {
            this.pins.push({ x: 15 + Math.random() * 370, y: 60 + Math.random() * 280, r: 3 });
        }
        for (let i = 0; i < 5; i++) {
            this.movingPins.push({ x: 50 + Math.random() * 300, y: 100 + Math.random() * 150, vx: (Math.random() - 0.5) * 6, r: 5 });
        }
    },

    setupTouchEvents() {
        this.canvas.onmousedown = this.canvas.ontouchstart = (e) => { e.preventDefault(); this.isPressing = true; };
        window.onmouseup = window.ontouchend = (e) => { this.isPressing = false; };
    },

    shoot() {
        if (this.score <= 0) return;
        this.score--; this.updateUI();
        this.balls.push({ x: this.shooterX, y: 35, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, r: 5, passedV: false });
    },

    update() {
        if (this.isPressing && this.shootTimer++ % 6 === 0) this.shoot();
        this.shooterX += 3.5 * this.shooterDir;
        if (this.shooterX < 30 || this.shooterX > 370) this.shooterDir *= -1;

        if (this.isRush) {
            this.rushTimer--;
            document.getElementById('pk-rush-fill').style.width = (this.rushTimer / 240) * 100 + "%";
            if (this.rushTimer <= 0) { this.isRush = false; this.updateUI(); }
        }

        if (!this.isRush && this.vZoneTimer <= 0 && Math.random() < 0.003) this.vZoneTimer = 180;
        else if (this.vZoneTimer > 0) this.vZoneTimer--;

        this.movingPins.forEach(p => { p.x += p.vx; if (p.x < 40 || p.x > 360) p.vx *= -1; });
        this.hue = (this.hue + 12) % 360;
        if (!this.isRush) this.fanAngle += 0.18; else this.fanAngle = 0;

        this.balls.forEach((b, i) => {
            b.x += b.vx; b.y += b.vy; b.vy += 0.35;
            if (b.y < b.r) { b.y = b.r; b.vy *= -0.8; }
            if (b.x < b.r) { b.x = b.r; b.vx *= -0.7; }
            if (b.x > 400 - b.r) { b.x = 400 - b.r; b.vx *= -0.7; }

            this.pins.forEach(p => this.checkCollision(b, p));
            this.movingPins.forEach(p => this.checkCollision(b, p));
            
            // 全てのファンとの衝突判定
            this.fans.forEach((f, idx) => {
                const dx = b.x - f.x, dy = b.y - f.y, dist = Math.hypot(dx, dy);
                if (dist < f.r + b.r) {
                    const angleToBall = Math.atan2(dy, dx);
                    // 上下のファンで回転方向を逆にする
                    const currentAngle = (idx === 0) ? this.fanAngle : -this.fanAngle;
                    const relativeAngle = (angleToBall - currentAngle) % (Math.PI / 2);
                    if (Math.abs(relativeAngle) < 0.25) {
                        const power = this.isRush ? 2 : 12; // 通常時は激しく弾く
                        b.vx = Math.cos(angleToBall) * power;
                        b.vy = Math.sin(angleToBall) * power;
                        if (!this.isRush) b.y -= 5;
                    }
                }
            });

            if (this.vZoneTimer > 0 && b.y > 240 && b.y < 260 && b.x > 195 && b.x < 205 && !b.passedV) {
                b.passedV = true;
                if (Math.random() < 0.5) this.triggerRush();
            }

            if (b.y > 425 && b.y < 460 && b.x > 150 && b.x < 250) { this.startSlot(); this.balls.splice(i, 1); return; }
            if (b.y > 500) this.balls.splice(i, 1);
        });
        this.draw();
    },

    triggerRush() {
        this.isRush = true; this.rushTimer = 240; this.score += 200; this.vZoneTimer = 0; this.updateUI();
    },

    checkCollision(b, p) {
        const dx = b.x - p.x, dy = b.y - p.y, dist = Math.hypot(dx, dy);
        if (dist < b.r + p.r) {
            const angle = Math.atan2(dy, dx), speed = Math.hypot(b.vx, b.vy) * 0.6;
            b.vx = Math.cos(angle) * speed + (Math.random() - 0.5);
            b.vy = Math.sin(angle) * speed;
            b.x = p.x + Math.cos(angle) * (b.r + p.r); b.y = p.y + Math.sin(angle) * (b.r + p.r);
        }
    },

    startSlot() {
        if (this.isSlotSpinning) return;
        this.isSlotSpinning = true;
        let count = 0;
        const spin = setInterval(() => {
            this.currentSlot = [this.slotSymbols[Math.floor(Math.random()*5)],this.slotSymbols[Math.floor(Math.random()*5)],this.slotSymbols[Math.floor(Math.random()*5)]];
            document.getElementById('pk-slot').innerText = this.currentSlot.join(" ");
            if (++count > 20) { clearInterval(spin); this.checkSlotResult(); this.isSlotSpinning = false; }
        }, 40);
    },

    checkSlotResult() {
        if (Math.random() < 0.1) {
            this.currentSlot = ["7️⃣", "7️⃣", "7️⃣"];
            document.getElementById('pk-slot').innerText = this.currentSlot.join(" ");
            this.triggerRush();
        } else if (this.isRush) this.score += 50;
        this.updateUI();
    },

    updateUI() {
        document.getElementById('pk-score').innerText = this.score;
        const mode = document.getElementById('pk-mode'), canvas = document.getElementById('pk-canvas'), bar = document.getElementById('pk-rush-bar');
        if (this.isRush) {
            mode.innerText = "🌈 4秒限定 RUSH! 🌈";
            mode.style.color = `hsl(${this.hue}, 100%, 50%)`;
            canvas.classList.add('rush-active');
            bar.style.display = "block";
        } else {
            mode.innerText = "通常モード (10%)";
            mode.style.color = "#aaa";
            canvas.classList.remove('rush-active');
            bar.style.display = "none";
        }
    },

    draw() {
        this.ctx.clearRect(0, 0, 400, 500);

        // シューター
        this.ctx.fillStyle = "#fff";
        this.ctx.beginPath(); this.ctx.moveTo(this.shooterX-15,0); this.ctx.lineTo(this.shooterX+15,0); this.ctx.lineTo(this.shooterX+10,30); this.ctx.lineTo(this.shooterX-10,30); this.ctx.fill();

        // 3つのファン描画
        this.fans.forEach((f, idx) => {
            this.ctx.save();
            this.ctx.translate(f.x, f.y);
            const currentAngle = (idx === 0) ? this.fanAngle : -this.fanAngle;
            this.ctx.rotate(currentAngle);
            this.ctx.strokeStyle = this.isRush ? `hsl(${this.hue}, 100%, 50%)` : (idx === 0 ? "#ff4444" : "#ffaa00");
            this.ctx.lineWidth = 5;
            for (let i = 0; i < 4; i++) {
                this.ctx.rotate(Math.PI / 2);
                this.ctx.beginPath(); this.ctx.moveTo(0, 0); this.ctx.lineTo(0, f.r); this.ctx.stroke();
            }
            this.ctx.restore();
        });

        // Vゾーン
        if (this.vZoneTimer > 0) {
            this.ctx.strokeStyle = (Math.floor(Date.now()/100)%2) ? "#00ffff" : "#fff";
            this.ctx.lineWidth = 3; this.ctx.strokeRect(190, 240, 20, 20);
        }

        // 釘と玉
        this.ctx.fillStyle = "#ffd700";
        this.pins.forEach(p => { this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); this.ctx.fill(); });
        this.movingPins.forEach(p => {
            this.ctx.fillStyle = this.isRush ? `hsl(${this.hue}, 100%, 50%)` : "#ff0000";
            this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); this.ctx.fill();
        });

        this.ctx.fillStyle = this.isRush ? `hsla(${this.hue}, 100%, 50%, 0.3)` : "rgba(255, 215, 0, 0.2)";
        this.ctx.fillRect(150, 420, 100, 40);
        this.ctx.strokeStyle = this.isRush ? `hsl(${this.hue}, 100%, 50%)` : "#ffd700";
        this.ctx.strokeRect(150, 420, 100, 40);

        this.balls.forEach(b => {
            this.ctx.fillStyle = b.passedV ? "#00ffff" : "#ccc";
            if (this.isRush) this.ctx.shadowBlur = 10, this.ctx.shadowColor = `hsl(${this.hue}, 100%, 50%)`;
            this.ctx.beginPath(); this.ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });
    }
};

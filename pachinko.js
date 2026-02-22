/**
 * pachinko.js - Pins & 10-Fan Chaos Hybrid Edition
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
    fans: [
        { x: 200, y: 360, r: 25, speed: 1.0 }, { x: 165, y: 400, r: 22, speed: -1.2 },
        { x: 235, y: 400, r: 22, speed: -1.2 }, { x: 60,  y: 150, r: 20, speed: 1.5 },
        { x: 340, y: 150, r: 20, speed: -1.5 }, { x: 100, y: 250, r: 25, speed: -0.8 },
        { x: 300, y: 250, r: 25, speed: 0.8 },  { x: 200, y: 120, r: 18, speed: 2.0 },
        { x: 50,  y: 380, r: 20, speed: 1.1 },  { x: 350, y: 380, r: 20, speed: -1.1 }
    ],
    interval: null,

    init() {
        GameModule.setupGameCanvas("究極・釘ファンパチンコ", "pachinko");
        const container = document.getElementById('pachinko-container');
        container.innerHTML = `
            <style>
                #pachinko-container, #pk-canvas { -webkit-user-select: none; user-select: none; }
                @keyframes flash { 0%, 100% { border-color: #fff; } 50% { border-color: #f0f; } }
                .rush-active { animation: flash 0.1s linear infinite; border-width: 12px !important; }
            </style>
            <div style="display:flex; justify-content:space-around; color:white; background:#333; padding:10px; border-radius:10px; margin-bottom:10px;">
                <div style="font-size:20px;">玉数: <span id="pk-score">1000</span></div>
                <div id="pk-mode" style="font-size:18px; color:#aaa; font-weight:bold;">通常モード</div>
            </div>
            <div id="pk-slot" style="font-size:40px; text-align:center; background:#111; border:4px solid #ffd700; margin-bottom:10px; padding:10px; border-radius:10px; color:white;">❓ ❓ ❓</div>
            <canvas id="pk-canvas" width="400" height="500" style="background:#000d1a; border:4px solid #555; border-radius:10px; touch-action:none;"></canvas>
            <div id="pk-rush-bar" style="width:100%; height:12px; background:#222; margin-top:5px; border-radius:6px; display:none; overflow:hidden;">
                <div id="pk-rush-fill" style="width:100%; height:100%; background:linear-gradient(90deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f);"></div>
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
        this.pins = [];
        // 釘をしっかり配置（ファンの位置を避けつつ全体に）
        for (let i = 0; i < 80; i++) {
            this.pins.push({ x: 10 + Math.random() * 380, y: 50 + Math.random() * 400, r: 2.5 });
        }
    },

    setupTouchEvents() {
        this.canvas.onmousedown = this.canvas.ontouchstart = (e) => { e.preventDefault(); this.isPressing = true; };
        window.onmouseup = window.ontouchend = (e) => { this.isPressing = false; };
    },

    shoot() {
        if (this.score <= 0) return;
        this.score--; this.updateUI();
        this.balls.push({ x: this.shooterX, y: 35, vx: (Math.random() - 0.5) * 4, vy: 3, r: 5, passedV: false });
    },

    update() {
        if (this.isPressing && this.shootTimer++ % 6 === 0) this.shoot();
        this.shooterX += 3 * this.shooterDir;
        if (this.shooterX < 40 || this.shooterX > 360) this.shooterDir *= -1;

        if (this.isRush) {
            this.rushTimer--;
            document.getElementById('pk-rush-fill').style.width = (this.rushTimer / 240) * 100 + "%";
            if (this.rushTimer <= 0) { this.isRush = false; this.updateUI(); }
        }

        if (!this.isRush && this.vZoneTimer <= 0 && Math.random() < 0.003) this.vZoneTimer = 180;
        else if (this.vZoneTimer > 0) this.vZoneTimer--;

        this.hue = (this.hue + 12) % 360;
        if (!this.isRush) this.fanAngle += 0.22; else this.fanAngle = 0;

        this.balls.forEach((b, i) => {
            b.x += b.vx; b.y += b.vy; b.vy += 0.35;
            if (b.y < b.r) { b.y = b.r; b.vy *= -0.8; }
            if (b.x < b.r || b.x > 400 - b.r) { b.vx *= -0.8; b.x = b.x < b.r ? b.r : 400 - b.r; }

            // 釘との衝突判定（しっかり残したぜ！）
            this.pins.forEach(p => this.checkCollision(b, p));
            
            // ファンとの衝突判定
            this.fans.forEach((f) => {
                const dx = b.x - f.x, dy = b.y - f.y, dist = Math.hypot(dx, dy);
                if (dist < f.r + b.r) {
                    const angleToBall = Math.atan2(dy, dx);
                    const currentFanAngle = this.fanAngle * f.speed;
                    const relativeAngle = (angleToBall - currentFanAngle) % (Math.PI / 2);
                    if (Math.abs(relativeAngle) < 0.25) {
                        const power = this.isRush ? 3 : 14; 
                        b.vx = Math.cos(angleToBall) * power;
                        b.vy = Math.sin(angleToBall) * power;
                        if (!this.isRush) { b.x += b.vx; b.y += b.vy; }
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
        } else if (this.isRush) this.score += 80;
        this.updateUI();
    },

    updateUI() {
        document.getElementById('pk-score').innerText = this.score;
        const mode = document.getElementById('pk-mode'), canvas = document.getElementById('pk-canvas'), bar = document.getElementById('pk-rush-bar');
        if (this.isRush) {
            mode.innerText = "🔥 ULTIMATE RUSH 🔥";
            mode.style.color = `hsl(${this.hue}, 100%, 50%)`;
            canvas.classList.add('rush-active');
            bar.style.display = "block";
        } else {
            mode.innerText = "通常モード (カオス釘)";
            mode.style.color = "#aaa";
            canvas.classList.remove('rush-active');
            bar.style.display = "none";
        }
    },

    draw() {
        this.ctx.clearRect(0, 0, 400, 500);

        // シューター
        this.ctx.fillStyle = "#fff";
        this.ctx.fillRect(this.shooterX - 15, 0, 30, 20);

        // 釘（黄金に輝く釘もしっかり描画！）
        this.ctx.fillStyle = "#ffd700";
        this.pins.forEach(p => { this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); this.ctx.fill(); });

        // 10連ファン
        this.fans.forEach((f) => {
            this.ctx.save();
            this.ctx.translate(f.x, f.y);
            this.ctx.rotate(this.isRush ? 0 : this.fanAngle * f.speed);
            this.ctx.strokeStyle = this.isRush ? `hsl(${this.hue}, 100%, 50%)` : `hsl(${(this.hue + f.x) % 360}, 70%, 50%)`;
            this.ctx.lineWidth = 4;
            for (let i = 0; i < 4; i++) {
                this.ctx.rotate(Math.PI / 2);
                this.ctx.beginPath(); this.ctx.moveTo(0, 0); this.ctx.lineTo(0, f.r); this.ctx.stroke();
            }
            this.ctx.restore();
        });

        // Vゾーン / ヘソ / 玉 (省略なし)
        if (this.vZoneTimer > 0) {
            this.ctx.strokeStyle = "#0ff"; this.ctx.lineWidth = 3; this.ctx.strokeRect(190, 240, 20, 20);
        }
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.1)"; this.ctx.fillRect(150, 420, 100, 40);
        this.ctx.strokeStyle = this.isRush ? `hsl(${this.hue}, 100%, 50%)` : "#ffd700"; this.ctx.strokeRect(150, 420, 100, 40);
        this.balls.forEach(b => {
            this.ctx.fillStyle = b.passedV ? "#0ff" : "#ddd";
            if (this.isRush) { this.ctx.shadowBlur = 10; this.ctx.shadowColor = `hsl(${this.hue}, 100%, 50%)`; }
            this.ctx.beginPath(); this.ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });
    }
};

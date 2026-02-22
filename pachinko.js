/**
 * pachinko.js - Top Moving Shooter Edition
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
    shooterX: 200, // 発射台のX座標
    shooterDir: 1, // 移動方向
    interval: null,

    init() {
        GameModule.setupGameCanvas("天井移動パチンコ", "pachinko");
        const container = document.getElementById('pachinko-container');
        container.innerHTML = `
            <style>
                #pachinko-container, #pk-canvas { -webkit-user-select: none; user-select: none; }
                @keyframes rainbow {
                    0% { border-color: red; box-shadow: 0 0 15px red; }
                    50% { border-color: lime; box-shadow: 0 0 15px lime; }
                    100% { border-color: blue; box-shadow: 0 0 15px blue; }
                }
                .rush-active { animation: rainbow 0.3s linear infinite; border-width: 8px !important; }
            </style>
            <div style="display:flex; justify-content:space-around; color:white; background:#333; padding:10px; border-radius:10px; margin-bottom:10px;">
                <div style="font-size:20px;">玉数: <span id="pk-score">1000</span></div>
                <div id="pk-mode" style="font-size:20px; color:#aaa;">通常モード</div>
            </div>
            <div id="pk-slot" style="font-size:40px; text-align:center; background:#111; border:4px solid #ffd700; margin-bottom:10px; padding:10px; border-radius:10px; color:white;">
                ❓ ❓ ❓
            </div>
            <canvas id="pk-canvas" width="400" height="500" style="background:#001f3f; border:4px solid #555; border-radius:10px; touch-action:none;"></canvas>
            <p style="color:#333; font-weight:bold; margin-top:10px; text-align:center;">動く発射台からタイミングよく落とせ！</p>
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
        // 釘を上部からしっかり配置
        for (let i = 0; i < 75; i++) {
            this.pins.push({ x: 20 + Math.random() * 360, y: 60 + Math.random() * 340, r: 3 });
        }
        for (let i = 0; i < 5; i++) {
            this.movingPins.push({ x: 50 + Math.random() * 300, y: 120 + Math.random() * 200, vx: (Math.random() - 0.5) * 5, r: 5 });
        }
    },

    setupTouchEvents() {
        this.canvas.onmousedown = this.canvas.ontouchstart = (e) => { e.preventDefault(); this.isPressing = true; };
        window.onmouseup = window.ontouchend = (e) => { this.isPressing = false; };
    },

    shoot() {
        if (this.score <= 0) return;
        this.score--; this.updateUI();
        // 天井の発射台から射出！
        this.balls.push({ 
            x: this.shooterX, 
            y: 35, 
            vx: (Math.random() - 0.5) * 2, // わずかに左右に散らす
            vy: 2 + Math.random() * 3, 
            r: 5, 
            passedV: false 
        });
    },

    update() {
        if (this.isPressing && this.shootTimer++ % 7 === 0) this.shoot();
        
        // 発射台の移動ロジック
        this.shooterX += 3 * this.shooterDir;
        if (this.shooterX < 30 || this.shooterX > 370) this.shooterDir *= -1;

        // 動く釘
        this.movingPins.forEach(p => { p.x += p.vx; if (p.x < 40 || p.x > 360) p.vx *= -1; });
        this.hue = (this.hue + 5) % 360;

        // 扇風機
        if (!this.isRush) this.fanAngle += 0.15; else this.fanAngle = 0;

        this.balls.forEach((b, i) => {
            b.x += b.vx; b.y += b.vy; b.vy += 0.35;
            
            // 天井・壁反射
            if (b.y < b.r) { b.y = b.r; b.vy *= -0.8; }
            if (b.x < b.r) { b.x = b.r; b.vx *= -0.7; }
            if (b.x > 400 - b.r) { b.x = 400 - b.r; b.vx *= -0.7; }

            // 衝突判定
            this.pins.forEach(p => this.checkCollision(b, p));
            this.movingPins.forEach(p => this.checkCollision(b, p));
            this.checkFanCollision(b);

            // Vゾーン
            if (b.y > 240 && b.y < 260 && b.x > 195 && b.x < 205 && !b.passedV) {
                b.passedV = true;
                if (Math.random() < 0.5) { this.isRush = true; this.score += 100; this.updateUI(); }
            }

            // ヘソ
            if (b.y > 420 && b.y < 460 && b.x > 150 && b.x < 250) { this.startSlot(); this.balls.splice(i, 1); return; }
            if (b.y > 500) this.balls.splice(i, 1);
        });
        this.draw();
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

    checkFanCollision(b) {
        const fanX = 200, fanY = 400;
        const dx = b.x - fanX, dy = b.y - fanY, dist = Math.hypot(dx, dy);
        if (dist < 40) {
            const angleToBall = Math.atan2(dy, dx);
            const relativeAngle = (angleToBall - this.fanAngle) % (Math.PI / 2);
            if (Math.abs(relativeAngle) < 0.2) {
                b.vx = Math.cos(angleToBall) * 10;
                b.vy = -Math.abs(Math.sin(angleToBall) * 10);
            }
        }
    },

    startSlot() {
        if (this.isSlotSpinning) return;
        this.isSlotSpinning = true;
        let count = 0;
        const spin = setInterval(() => {
            this.currentSlot = [
                this.slotSymbols[Math.floor(Math.random() * this.slotSymbols.length)],
                this.slotSymbols[Math.floor(Math.random() * this.slotSymbols.length)],
                this.slotSymbols[Math.floor(Math.random() * this.slotSymbols.length)]
            ];
            document.getElementById('pk-slot').innerText = this.currentSlot.join(" ");
            if (++count > 20) { clearInterval(spin); this.checkSlotResult(); this.isSlotSpinning = false; }
        }, 40);
    },

    checkSlotResult() {
        if (Math.random() < 0.1) {
            this.currentSlot = ["7️⃣", "7️⃣", "7️⃣"];
            document.getElementById('pk-slot').innerText = this.currentSlot.join(" ");
            this.isRush = true; this.score += 500;
        } else if (this.isRush) { this.score += 20; }
        this.updateUI();
    },

    updateUI() {
        document.getElementById('pk-score').innerText = this.score;
        const mode = document.getElementById('pk-mode'), canvas = document.getElementById('pk-canvas');
        if (this.isRush) {
            mode.innerText = "🌈 RAINBOW RUSH 🌈";
            mode.style.color = `hsl(${this.hue}, 100%, 50%)`;
            canvas.classList.add('rush-active');
        } else {
            mode.innerText = "通常モード (10%)";
            mode.style.color = "#aaa";
            canvas.classList.remove('rush-active');
        }
    },

    draw() {
        this.ctx.clearRect(0, 0, 400, 500);

        // 天井の発射台 (シューター)
        this.ctx.fillStyle = "#fff";
        this.ctx.beginPath();
        this.ctx.moveTo(this.shooterX - 15, 0);
        this.ctx.lineTo(this.shooterX + 15, 0);
        this.ctx.lineTo(this.shooterX + 10, 30);
        this.ctx.lineTo(this.shooterX - 10, 30);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.strokeStyle = "#ffd700";
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // 扇風機役物
        this.ctx.save();
        this.ctx.translate(200, 400);
        this.ctx.rotate(this.fanAngle);
        this.ctx.strokeStyle = this.isRush ? "#00ff00" : "#ffaa00";
        this.ctx.lineWidth = 4;
        for (let i = 0; i < 4; i++) {
            this.ctx.rotate(Math.PI / 2);
            this.ctx.beginPath(); this.ctx.moveTo(0, 0); this.ctx.lineTo(0, 35); this.ctx.stroke();
        }
        this.ctx.restore();

        // 釘
        this.ctx.fillStyle = "#ffd700";
        this.pins.forEach(p => { this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); this.ctx.fill(); });
        this.movingPins.forEach(p => {
            this.ctx.fillStyle = this.isRush ? `hsl(${this.hue}, 100%, 50%)` : "#ff0000";
            this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); this.ctx.fill();
        });

        // Vゾーン
        this.ctx.strokeStyle = "#00ffff"; this.ctx.lineWidth = 2; this.ctx.strokeRect(190, 240, 20, 20);

        // ヘソ
        this.ctx.fillStyle = this.isRush ? `hsla(${this.hue}, 100%, 50%, 0.3)` : "rgba(255, 215, 0, 0.2)";
        this.ctx.fillRect(150, 420, 100, 40);
        this.ctx.strokeStyle = this.isRush ? `hsl(${this.hue}, 100%, 50%)` : "#ffd700";
        this.ctx.strokeRect(150, 420, 100, 40);

        // 玉
        this.balls.forEach(b => {
            this.ctx.fillStyle = b.passedV ? "#00ffff" : "#ccc";
            if (this.isRush) this.ctx.shadowBlur = 8, this.ctx.shadowColor = `hsl(${this.hue}, 100%, 50%)`;
            this.ctx.beginPath(); this.ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });
    }
};

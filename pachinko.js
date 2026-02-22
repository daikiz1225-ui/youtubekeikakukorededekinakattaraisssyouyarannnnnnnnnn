/**
 * pachinko.js - Pachinko Slot with Rush Mode
 */
const Pachinko = {
    canvas: null, ctx: null,
    balls: [], pins: [], 
    score: 100, // 持ち玉
    isRush: false, // 確変モード
    slotSymbols: ["🍒", "🍉", "🔔", "🎰", "7️⃣"],
    currentSlot: ["❓", "❓", "❓"],
    isSlotSpinning: false,
    interval: null,

    init() {
        GameModule.setupGameCanvas("パチンコスロット", "pachinko");
        const container = document.getElementById('pachinko-container');
        container.innerHTML = `
            <div style="display:flex; justify-content:space-around; color:white; background:#333; padding:10px; border-radius:10px; margin-bottom:10px;">
                <div style="font-size:20px;">玉数: <span id="pk-score">100</span></div>
                <div id="pk-mode" style="font-size:20px; color:#aaa;">通常モード</div>
            </div>
            <div id="pk-slot" style="font-size:40px; text-align:center; background:#111; border:4px solid #ffd700; margin-bottom:10px; padding:10px; border-radius:10px;">
                ❓ ❓ ❓
            </div>
            <canvas id="pk-canvas" width="400" height="500" style="background:#001f3f; border:4px solid #555; border-radius:10px; touch-action:none;"></canvas>
            <p style="color:#333; font-weight:bold; margin-top:10px;">画面を長押しして玉を打ち出せ！</p>
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
        for (let y = 100; y < 450; y += 50) {
            let count = (y / 50) % 2 === 0 ? 7 : 8;
            for (let x = 0; x < count; x++) {
                this.pins.push({
                    x: (400 / (count + 1)) * (x + 1),
                    y: y,
                    r: 4
                });
            }
        }
    },

    setupTouchEvents() {
        let charge = 0;
        let chargeInterval;
        this.canvas.onmousedown = this.canvas.ontouchstart = (e) => {
            if (this.score <= 0) return;
            charge = 0;
            chargeInterval = setInterval(() => { charge = Math.min(charge + 0.5, 15); }, 50);
        };
        this.canvas.onmouseup = this.canvas.ontouchend = (e) => {
            clearInterval(chargeInterval);
            this.shoot(charge);
        };
    },

    shoot(power) {
        this.score--;
        this.updateUI();
        this.balls.push({
            x: 380, y: 480,
            vx: -power * 0.8, vy: -power * 1.5,
            r: 6
        });
    },

    update() {
        this.balls.forEach((b, i) => {
            b.x += b.vx; b.y += b.vy;
            b.vy += 0.25; // 重力
            b.vx *= 0.99; // 空気抵抗

            // 壁反射
            if (b.x < b.r || b.x > 400 - b.r) b.vx *= -0.6;
            if (b.y < b.r) b.vy *= -0.6;

            // 釘との衝突
            this.pins.forEach(p => {
                const dx = b.x - p.x;
                const dy = b.y - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist < b.r + p.r) {
                    const angle = Math.atan2(dy, dx);
                    const speed = Math.hypot(b.vx, b.vy) * 0.6;
                    b.vx = Math.cos(angle) * speed + (Math.random() - 0.5);
                    b.vy = Math.sin(angle) * speed;
                }
            });

            // 入賞口（ヘソ）判定
            if (b.y > 420 && b.y < 450 && b.x > 180 && b.x < 220) {
                this.startSlot();
                this.balls.splice(i, 1);
                return;
            }

            // アウト
            if (b.y > 500) this.balls.splice(i, 1);
        });

        this.draw();
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
            count++;
            if (count > 20) {
                clearInterval(spin);
                this.checkSlotResult();
                this.isSlotSpinning = false;
            }
        }, 50);
    },

    checkSlotResult() {
        const [s1, s2, s3] = this.currentSlot;
        if (s1 === s2 && s2 === s3) {
            if (s1 === "7️⃣") {
                this.isRush = true;
                this.score += 50;
                alert("超絶確変ラッシュ突入！！");
            } else {
                this.score += 20;
                alert("当たり！20玉ゲット！");
            }
        } else if (this.isRush && Math.random() < 0.3) { // 確変中はハズレでもたまに増える
            this.score += 5;
        }
        this.updateUI();
    },

    updateUI() {
        document.getElementById('pk-score').innerText = this.score;
        const mode = document.getElementById('pk-mode');
        if (this.isRush) {
            mode.innerText = "💥 確変モード 💥";
            mode.style.color = "#ff4500";
            mode.style.fontWeight = "bold";
        } else {
            mode.innerText = "通常モード";
            mode.style.color = "#aaa";
        }
    },

    draw() {
        this.ctx.clearRect(0, 0, 400, 500);

        // 釘
        this.ctx.fillStyle = "#ffd700";
        this.pins.forEach(p => {
            this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); this.ctx.fill();
        });

        // 入賞口（ヘソ）
        this.ctx.fillStyle = "#ff00ff";
        this.ctx.fillRect(180, 430, 40, 10);
        this.ctx.strokeStyle = "#fff";
        this.ctx.strokeRect(180, 430, 40, 10);

        // 玉
        this.ctx.fillStyle = "#ddd";
        this.balls.forEach(b => {
            this.ctx.beginPath(); this.ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); this.ctx.fill();
            // 光沢
            this.ctx.fillStyle = "#fff";
            this.ctx.beginPath(); this.ctx.arc(b.x - 2, b.y - 2, 2, 0, Math.PI*2); this.ctx.fill();
            this.ctx.fillStyle = "#ddd";
        });
    }
};

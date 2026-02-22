/**
 * pachinko.js - Moving Pins & V-Zone Edition
 */
const Pachinko = {
    canvas: null, ctx: null,
    balls: [], pins: [], movingPins: [],
    score: 1000, isRush: false,
    slotSymbols: ["🍒", "🍉", "🔔", "🎰", "7️⃣"],
    currentSlot: ["❓", "❓", "❓"],
    isSlotSpinning: false,
    shootTimer: 0, isPressing: false,
    interval: null,

    init() {
        GameModule.setupGameCanvas("激アツパチンコ", "pachinko");
        const container = document.getElementById('pachinko-container');
        container.innerHTML = `
            <style>
                #pachinko-container, #pk-canvas {
                    -webkit-user-select: none;
                    user-select: none;
                }
            </style>
            <div style="display:flex; justify-content:space-around; color:white; background:#333; padding:10px; border-radius:10px; margin-bottom:10px;">
                <div style="font-size:20px;">玉数: <span id="pk-score">1000</span></div>
                <div id="pk-mode" style="font-size:20px; color:#aaa;">通常モード</div>
            </div>
            <div id="pk-slot" style="font-size:40px; text-align:center; background:#111; border:4px solid #ffd700; margin-bottom:10px; padding:10px; border-radius:10px; color:white;">
                ❓ ❓ ❓
            </div>
            <canvas id="pk-canvas" width="400" height="500" style="background:#001f3f; border:4px solid #555; border-radius:10px; touch-action:none;"></canvas>
            <p style="color:#333; font-weight:bold; margin-top:10px; text-align:center;">長押しで連射！中央の「V」を通せば1/2で確変！</p>
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
        this.movingPins = [];
        // 全域（上から下まで）に釘を配置
        for (let i = 0; i < 80; i++) {
            this.pins.push({
                x: 20 + Math.random() * 340,
                y: 50 + Math.random() * 350,
                r: 3
            });
        }
        // 動く釘を5本作成
        for (let i = 0; i < 5; i++) {
            this.movingPins.push({
                x: 50 + Math.random() * 300,
                y: 150 + Math.random() * 200,
                vx: (Math.random() - 0.5) * 4,
                r: 5
            });
        }
    },

    setupTouchEvents() {
        this.canvas.onmousedown = this.canvas.ontouchstart = (e) => {
            e.preventDefault();
            this.isPressing = true;
        };
        window.onmouseup = window.ontouchend = (e) => {
            this.isPressing = false;
        };
    },

    shoot() {
        if (this.score <= 0) return;
        this.score--;
        this.updateUI();
        this.balls.push({
            x: 385, y: 480,
            vx: 0, vy: -18 - (Math.random() * 3),
            r: 5, inRail: true
        });
    },

    update() {
        if (this.isPressing && this.shootTimer++ % 6 === 0) this.shoot();

        // 動く釘の更新
        this.movingPins.forEach(p => {
            p.x += p.vx;
            if (p.x < 50 || p.x > 330) p.vx *= -1;
        });

        this.balls.forEach((b, i) => {
            b.x += b.vx; b.y += b.vy;
            b.vy += 0.35; // 重力

            // 天井・壁バグ修正版 (反射を確実にする)
            if (b.y < b.r) { b.y = b.r; b.vy *= -0.8; } 
            if (b.x < b.r) { b.x = b.r; b.vx *= -0.7; }
            if (b.x > 400 - b.r) { b.x = 400 - b.r; b.vx *= -0.7; }

            if (b.inRail) {
                if (b.y < 60) { b.vx = -6 - (Math.random() * 4); b.inRail = false; }
                if (b.x < 370) b.x = 380;
            } else {
                // 固定釘
                this.pins.forEach(p => this.checkCollision(b, p));
                // 動く釘
                this.movingPins.forEach(p => this.checkCollision(b, p));
            }

            // 【新設】中央Vゾーン (すり抜け)
            if (b.y > 240 && b.y < 260 && b.x > 195 && b.x < 205) {
                if (!b.passedV) {
                    b.passedV = true;
                    if (Math.random() < 0.5) {
                        this.isRush = true;
                        this.score += 100;
                        alert("🎉 V通過！ 確変ラッシュ突入 🎉");
                    }
                }
            }

            // ど真ん中の巨大ヘソ
            if (b.y > 420 && b.y < 460 && b.x > 150 && b.x < 250) {
                this.startSlot();
                this.balls.splice(i, 1);
                return;
            }

            if (b.y > 500) this.balls.splice(i, 1);
        });
        this.draw();
    },

    checkCollision(b, p) {
        const dx = b.x - p.x, dy = b.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < b.r + p.r) {
            const angle = Math.atan2(dy, dx);
            const speed = Math.hypot(b.vx, b.vy) * 0.6;
            b.vx = Math.cos(angle) * speed + (Math.random() - 0.5);
            b.vy = Math.sin(angle) * speed;
            // めり込み防止
            b.x = p.x + Math.cos(angle) * (b.r + p.r);
            b.y = p.y + Math.sin(angle) * (b.r + p.r);
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
            count++;
            if (count > 20) {
                clearInterval(spin);
                this.checkSlotResult();
                this.isSlotSpinning = false;
            }
        }, 40);
    },

    checkSlotResult() {
        const [s1, s2, s3] = this.currentSlot;
        if (s1 === s2 && s2 === s3) {
            if (s1 === "7️⃣") {
                this.isRush = true;
                this.score += 500;
                alert("777 確変突入！");
            } else {
                this.score += 100;
            }
        } else if (this.isRush) {
            this.score += 10;
        }
        this.updateUI();
    },

    updateUI() {
        document.getElementById('pk-score').innerText = this.score;
        const mode = document.getElementById('pk-mode');
        if (this.isRush) {
            mode.innerText = "🔥 RUSH中 🔥";
            mode.style.color = "#ff0000";
        }
    },

    draw() {
        this.ctx.clearRect(0, 0, 400, 500);

        // レール
        this.ctx.strokeStyle = "#555";
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(375, 80, 20, 420);

        // 固定釘
        this.ctx.fillStyle = "#ffd700";
        this.pins.forEach(p => {
            this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); this.ctx.fill();
        });

        // 動く釘 (赤色)
        this.ctx.fillStyle = "#ff0000";
        this.movingPins.forEach(p => {
            this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); this.ctx.fill();
            this.ctx.strokeStyle = "#fff"; this.ctx.stroke();
        });

        // Vゾーン (中央のすり抜け)
        this.ctx.strokeStyle = "#00ffff";
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(190, 240, 20, 20);
        this.ctx.fillStyle = "#00ffff";
        this.ctx.font = "bold 12px Arial";
        this.ctx.fillText("V", 195, 255);

        // ヘソ
        this.ctx.fillStyle = "rgba(255, 215, 0, 0.2)";
        this.ctx.fillRect(150, 420, 100, 40);
        this.ctx.strokeStyle = "#ffd700";
        this.ctx.strokeRect(150, 420, 100, 40);

        // 玉
        this.balls.forEach(b => {
            this.ctx.fillStyle = b.passedV ? "#00ffff" : "#ccc";
            this.ctx.beginPath(); this.ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); this.ctx.fill();
        });
    }
};

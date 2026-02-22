/**
 * pachinko.js - Full-Auto Rapid Fire Edition
 */
const Pachinko = {
    canvas: null, ctx: null,
    balls: [], pins: [], 
    score: 1000, // 連射するので初期玉数を増やしたぜ！
    isRush: false,
    slotSymbols: ["🍒", "🍉", "🔔", "🎰", "7️⃣"],
    currentSlot: ["❓", "❓", "❓"],
    isSlotSpinning: false,
    shootTimer: 0,
    isPressing: false,
    interval: null,

    init() {
        GameModule.setupGameCanvas("爆裂パチンコ", "pachinko");
        const container = document.getElementById('pachinko-container');
        container.innerHTML = `
            <style>
                #pachinko-container, #pk-canvas {
                    -webkit-user-select: none;
                    -webkit-touch-callout: none;
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
            <p style="color:#333; font-weight:bold; margin-top:10px; text-align:center;">画面を長押しで【超連射】開始！</p>
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
        // 釘をランダムに配置して動きを予測不能にする
        for (let i = 0; i < 60; i++) {
            this.pins.push({
                x: 30 + Math.random() * 320,
                y: 100 + Math.random() * 300,
                r: 3
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
        // 右打ちレールに乗る絶妙なパワーで発射
        this.balls.push({
            x: 385, y: 480,
            vx: 0, vy: -18 - (Math.random() * 2), // わずかにバラつかせる
            r: 5,
            inRail: true
        });
    },

    update() {
        // 連射処理 (10フレームに1回発射)
        if (this.isPressing) {
            this.shootTimer++;
            if (this.shootTimer % 6 === 0) { // 数値を下げるとさらに速くなるぞ
                this.shoot();
            }
        }

        this.balls.forEach((b, i) => {
            b.x += b.vx; b.y += b.vy;
            b.vy += 0.35; // 重力

            if (b.inRail) {
                if (b.y < 60) {
                    b.vx = -7 - (Math.random() * 3);
                    b.inRail = false;
                }
                if (b.x < 370) b.x = 380;
            } else {
                if (b.x < b.r || b.x > 400 - b.r) b.vx *= -0.6;
                if (b.y < b.r) b.vy *= -0.6;

                this.pins.forEach(p => {
                    const dx = b.x - p.x, dy = b.y - p.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < b.r + p.r) {
                        const angle = Math.atan2(dy, dx);
                        const speed = Math.hypot(b.vx, b.vy) * 0.5;
                        b.vx = Math.cos(angle) * speed + (Math.random() - 0.2);
                        b.vy = Math.sin(angle) * speed;
                    }
                });
            }

            // 真ん中の巨大ヘソ (入賞口) 判定
            if (b.y > 420 && b.y < 460 && b.x > 150 && b.x < 250) {
                this.startSlot();
                this.balls.splice(i, 1);
                return;
            }

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
        }, 40);
    },

    checkSlotResult() {
        const [s1, s2, s3] = this.currentSlot;
        if (s1 === s2 && s2 === s3) {
            if (s1 === "7️⃣") {
                this.isRush = true;
                this.score += 500;
                alert("🎊 超 確 変 R U S H 突 入 🎊\n500玉獲得！");
            } else {
                this.score += 100;
                alert("当たり！100玉獲得！");
            }
        } else if (this.isRush) {
            this.score += 10; // 確変中はハズレでもモリモリ増える
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

        // 釘
        this.ctx.fillStyle = "#ffd700";
        this.pins.forEach(p => {
            this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); this.ctx.fill();
        });

        // ど真ん中の巨大ヘソ
        this.ctx.fillStyle = "rgba(255, 215, 0, 0.2)";
        this.ctx.fillRect(150, 420, 100, 40);
        this.ctx.strokeStyle = "#ffd700";
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(150, 420, 100, 40);
        this.ctx.fillStyle = "#fff";
        this.ctx.font = "bold 14px Arial";
        this.ctx.fillText("V-CHANCE", 168, 445);

        // 玉
        this.balls.forEach(b => {
            this.ctx.fillStyle = "#ccc";
            this.ctx.beginPath(); this.ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); this.ctx.fill();
            this.ctx.fillStyle = "#fff";
            this.ctx.beginPath(); this.ctx.arc(b.x - 2, b.y - 2, 2, 0, Math.PI*2); this.ctx.fill();
        });
    }
};

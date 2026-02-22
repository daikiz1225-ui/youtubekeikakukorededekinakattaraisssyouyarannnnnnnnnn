/**
 * pachinko.js - Right-Side Shooter & Huge Goal Edition
 */
const Pachinko = {
    canvas: null, ctx: null,
    balls: [], pins: [], 
    score: 100, isRush: false,
    slotSymbols: ["🍒", "🍉", "🔔", "🎰", "7️⃣"],
    currentSlot: ["❓", "❓", "❓"],
    isSlotSpinning: false,
    interval: null,

    init() {
        GameModule.setupGameCanvas("パチンコスロット", "pachinko");
        const container = document.getElementById('pachinko-container');
        container.innerHTML = `
            <style>
                /* 長押しで青い選択が出ないようにする魔法のコード */
                #pachinko-container, #pk-canvas {
                    -webkit-user-select: none;
                    -webkit-touch-callout: none;
                    user-select: none;
                }
            </style>
            <div style="display:flex; justify-content:space-around; color:white; background:#333; padding:10px; border-radius:10px; margin-bottom:10px;">
                <div style="font-size:20px;">玉数: <span id="pk-score">100</span></div>
                <div id="pk-mode" style="font-size:20px; color:#aaa;">通常モード</div>
            </div>
            <div id="pk-slot" style="font-size:40px; text-align:center; background:#111; border:4px solid #ffd700; margin-bottom:10px; padding:10px; border-radius:10px; color:white;">
                ❓ ❓ ❓
            </div>
            <canvas id="pk-canvas" width="400" height="500" style="background:#001f3f; border:4px solid #555; border-radius:10px; touch-action:none;"></canvas>
            <div id="charge-bar" style="width:100%; height:10px; background:#444; margin-top:5px; border-radius:5px; overflow:hidden;">
                <div id="charge-fill" style="width:0%; height:100%; background:#00ff00;"></div>
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
        // 中央付近にランダムに釘を配置
        for (let y = 120; y < 400; y += 45) {
            let offset = (y / 45) % 2 === 0 ? 30 : 50;
            for (let x = offset; x < 350; x += 50) {
                this.pins.push({ x: x, y: y, r: 3 });
            }
        }
    },

    setupTouchEvents() {
        let charge = 0;
        let chargeInterval;
        this.canvas.onmousedown = this.canvas.ontouchstart = (e) => {
            e.preventDefault();
            if (this.score <= 0) return;
            charge = 0;
            chargeInterval = setInterval(() => { 
                charge = Math.min(charge + 0.4, 25); // パワー上限アップ
                document.getElementById('charge-fill').style.width = (charge/25)*100 + "%";
            }, 30);
        };
        this.canvas.onmouseup = this.canvas.ontouchend = (e) => {
            clearInterval(chargeInterval);
            this.shoot(charge);
            document.getElementById('charge-fill').style.width = "0%";
        };
    },

    shoot(power) {
        if (power < 5) return; // 弱すぎると打たない
        this.score--;
        this.updateUI();
        this.balls.push({
            x: 385, y: 480,
            vx: 0, vy: -power, // 真上に打ち出す！
            r: 6,
            inRail: true // 右のレールの中にいるフラグ
        });
    },

    update() {
        this.balls.forEach((b, i) => {
            b.x += b.vx; b.y += b.vy;
            b.vy += 0.35; // 重力を少し強くしてスピード感を出す

            // 右の打ち出しレール
            if (b.inRail) {
                if (b.y < 60) { // 一番上まで到達
                    b.vx = -8; // 左に向かって飛び出す
                    b.inRail = false;
                }
                if (b.x < 370) b.x = 380; // レールからはみ出さない
            } else {
                // 通常の反射
                if (b.x < b.r || b.x > 400 - b.r) b.vx *= -0.7;
                if (b.y < b.r) b.vy *= -0.7;

                // 釘との衝突
                this.pins.forEach(p => {
                    const dx = b.x - p.x, dy = b.y - p.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < b.r + p.r) {
                        const angle = Math.atan2(dy, dx);
                        const speed = Math.hypot(b.vx, b.vy) * 0.5;
                        b.vx = Math.cos(angle) * speed + (Math.random() - 0.5);
                        b.vy = Math.sin(angle) * speed;
                    }
                });
            }

            // 巨大ヘソ（入賞口）判定
            if (b.y > 400 && b.y < 440 && b.x > 150 && b.x < 250) {
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
            if (count > 25) {
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
                this.score += 77;
                alert("🎊 超 確 変 突 入 🎊");
            } else {
                this.score += 30;
                alert("当たり！30玉ゲット！");
            }
        } else if (this.isRush) {
            // 確変中はハズレでも玉が増える
            this.score += 3;
        }
        this.updateUI();
    },

    updateUI() {
        document.getElementById('pk-score').innerText = this.score;
        const mode = document.getElementById('pk-mode');
        if (this.isRush) {
            mode.innerText = "🔥 RUSH中 🔥";
            mode.style.color = "#ff0000";
        } else {
            mode.innerText = "通常モード";
            mode.style.color = "#aaa";
        }
    },

    draw() {
        this.ctx.clearRect(0, 0, 400, 500);

        // レールの描画
        this.ctx.strokeStyle = "#555";
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(370, 500);
        this.ctx.lineTo(370, 80);
        this.ctx.quadraticCurveTo(370, 30, 320, 30);
        this.ctx.stroke();

        // 釘
        this.ctx.fillStyle = "#ffd700";
        this.pins.forEach(p => {
            this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); this.ctx.fill();
        });

        // 巨大ヘソ（入賞口）
        this.ctx.fillStyle = "rgba(255, 0, 255, 0.3)";
        this.ctx.fillRect(150, 410, 100, 30);
        this.ctx.strokeStyle = "#ff00ff";
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(150, 410, 100, 30);
        this.ctx.fillStyle = "#fff";
        this.ctx.fillText("CHANCE", 175, 430);

        // 玉
        this.balls.forEach(b => {
            this.ctx.fillStyle = "#ddd";
            this.ctx.beginPath(); this.ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); this.ctx.fill();
            this.ctx.fillStyle = "#fff";
            this.ctx.beginPath(); this.ctx.arc(b.x - 2, b.y - 2, 2, 0, Math.PI*2); this.ctx.fill();
        });
    }
};

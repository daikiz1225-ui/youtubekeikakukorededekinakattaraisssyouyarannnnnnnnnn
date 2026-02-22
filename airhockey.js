/**
 * airhockey.js - iPad 2-Player Versus
 */
const AirHockey = {
    canvas: null, ctx: null,
    p1: { x: 200, y: 350, r: 25, score: 0, color: '#2196F3' }, // 下側
    p2: { x: 200, y: 50, r: 25, score: 0, color: '#F44336' },  // 上側
    puck: { x: 200, y: 200, vx: 0, vy: 0, r: 15, color: '#fff' },
    friction: 0.985, // 摩擦
    interval: null,

    init() {
        GameModule.setupGameCanvas("エアホッケー", "airhockey");
        const container = document.getElementById('airhockey-container');
        container.innerHTML = `
            <div style="text-align:center; color:white; margin-bottom:10px; font-weight:bold; font-size:20px;">
                <span style="color:#F44336">P2: ${this.p2.score}</span> vs <span style="color:#2196F3">P1: ${this.p1.score}</span>
            </div>
            <canvas id="ah-canvas" width="400" height="600" style="background:#222; border:4px solid #555; touch-action:none;"></canvas>
            <p style="color:#aaa; margin-top:10px;">上下に分かれて自分の円を指で動かそう！</p>
        `;
        this.canvas = document.getElementById('ah-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.setupTouchEvents();
        if(this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => this.update(), 1000/60);
    },

    setupTouchEvents() {
        const handleTouch = (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                const tx = touch.clientX - rect.left;
                const ty = touch.clientY - rect.top;

                // 自分の陣地内であればマレットを移動
                if (ty > this.canvas.height / 2) {
                    this.p1.x = tx;
                    this.p1.y = Math.max(this.canvas.height / 2 + this.p1.r, Math.min(this.canvas.height - this.p1.r, ty));
                } else {
                    this.p2.x = tx;
                    this.p2.y = Math.max(this.p2.r, Math.min(this.canvas.height / 2 - this.p2.r, ty));
                }
            }
        };
        this.canvas.addEventListener('touchstart', handleTouch);
        this.canvas.addEventListener('touchmove', handleTouch);
    },

    update() {
        // パックの移動と摩擦
        this.puck.x += this.puck.vx;
        this.puck.y += this.puck.vy;
        this.puck.vx *= this.friction;
        this.puck.vy *= this.friction;

        // 壁との衝突
        if (this.puck.x < this.puck.r || this.puck.x > this.canvas.width - this.puck.r) {
            this.puck.vx *= -1;
            this.puck.x = this.puck.x < this.puck.r ? this.puck.r : this.canvas.width - this.puck.r;
        }

        // ゴール判定
        if (this.puck.y < 0) {
            this.p1.score++;
            this.resetPuck();
        } else if (this.puck.y > this.canvas.height) {
            this.p2.score++;
            this.resetPuck();
        } else {
            // 上下の壁での跳ね返り（ゴールの場所以外）
            if ((this.puck.y < this.puck.r || this.puck.y > this.canvas.height - this.puck.r)) {
                if (this.puck.x < 120 || this.puck.x > 280) { // ゴール幅以外
                    this.puck.vy *= -1;
                }
            }
        }

        // マレットとの衝突
        this.checkCollision(this.p1);
        this.checkCollision(this.p2);

        this.draw();
    },

    checkCollision(p) {
        const dx = this.puck.x - p.x;
        const dy = this.puck.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = this.puck.r + p.r;

        if (dist < minDist) {
            // ベクトル反射計算
            const angle = Math.atan2(dy, dx);
            const speed = Math.sqrt(this.puck.vx * this.puck.vx + this.puck.vy * this.puck.vy);
            
            // 叩いた時の勢いを乗せる
            const push = 5;
            this.puck.vx = Math.cos(angle) * (speed + push);
            this.puck.vy = Math.sin(angle) * (speed + push);
            
            // パックがマレットにめり込まないように位置調整
            this.puck.x = p.x + Math.cos(angle) * minDist;
            this.puck.y = p.y + Math.sin(angle) * minDist;
        }
    },

    resetPuck() {
        this.puck.x = this.canvas.width / 2;
        this.puck.y = this.canvas.height / 2;
        this.puck.vx = 0;
        this.puck.vy = 0;
        this.init(); // スコア表示更新のため
    },

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // コートの線
        this.ctx.strokeStyle = "rgba(255,255,255,0.2)";
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height/2);
        this.ctx.lineTo(this.canvas.width, this.canvas.height/2);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width/2, this.canvas.height/2, 50, 0, Math.PI*2);
        this.ctx.stroke();

        // ゴールエリア
        this.ctx.strokeStyle = "#555";
        this.ctx.lineWidth = 8;
        this.ctx.beginPath(); this.ctx.moveTo(120, 0); this.ctx.lineTo(280, 0); this.ctx.stroke();
        this.ctx.beginPath(); this.ctx.moveTo(120, this.canvas.height); this.ctx.lineTo(280, this.canvas.height); this.ctx.stroke();

        // パック
        this.ctx.fillStyle = this.puck.color;
        this.ctx.shadowBlur = 10; this.ctx.shadowColor = "#fff";
        this.ctx.beginPath(); this.ctx.arc(this.puck.x, this.puck.y, this.puck.r, 0, Math.PI*2); this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // マレット
        this.drawMallet(this.p1);
        this.drawMallet(this.p2);
    },

    drawMallet(p) {
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); this.ctx.fill();
        this.ctx.strokeStyle = "#fff";
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
    }
};

/**
 * proxy.js (進捗診断機能付き)
 */
const ProxyModule = {
    init() {
        if (typeof GameModule !== 'undefined') {
            GameModule.setupGameCanvas('隠密診断モード', 'proxy');
            this.render();
        }
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;
        
        container.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:999999; background:#fff; overflow:hidden;";

        container.innerHTML = `
            <div style="display:flex; flex-direction:column; height:100%; width:100%; background:#f0f0f2; font-family:monospace;">
                <div style="padding:15px; background:#1a1a1a; display:flex; gap:10px;">
                    <button id="p-exit" style="background:none; border:none; color:#ff453a; font-size:24px;">✕</button>
                    <input type="text" id="p-url" placeholder="攻略URL" style="flex:1; height:40px; border-radius:10px; border:none; background:#333; color:#fff; padding:0 15px;">
                    <button id="p-go" style="padding:0 20px; background:#007AFF; color:#fff; border-radius:10px; border:none; font-weight:bold;">Go</button>
                </div>
                
                <div id="p-monitor" style="flex:1; padding:30px; overflow-y:auto;">
                    <div id="p-diag-box" style="background:#fff; border-radius:15px; padding:20px; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
                        <h3 style="margin-top:0; color:#333;">📡 通信診断ステータス</h3>
                        <div id="step-1" style="margin:10px 0; color:#999;">○ サーバーへの接続</div>
                        <div id="step-2" style="margin:10px 0; color:#999;">○ データ受信状況 (0%)</div>
                        <div style="width:100%; height:8px; background:#eee; border-radius:4px; overflow:hidden; margin:5px 0;">
                            <div id="p-bar" style="width:0%; height:100%; background:#34c759; transition:width 0.3s;"></div>
                        </div>
                        <div id="step-3" style="margin:10px 0; color:#999;">○ パズルの解読</div>
                        <div id="step-4" style="margin:10px 0; color:#999;">○ レイアウトの構築</div>
                        <hr style="border:0; border-top:1px solid #eee; margin:20px 0;">
                        <div id="p-error-log" style="color:red; font-size:12px;"></div>
                    </div>
                    <div id="p-final-view" style="display:none; background:#fff; margin-top:20px;"></div>
                </div>
            </div>
        `;
        this.bind();
    },

    bind() {
        const input = document.getElementById('p-url');
        const btn = document.getElementById('p-go');
        const bar = document.getElementById('p-bar');
        const log = (id, txt, color) => { 
            const el = document.getElementById(id);
            el.innerHTML = `● ${txt}`;
            el.style.color = color;
        };

        const execute = async () => {
            let url = input.value.trim();
            if(!url) return;
            if(!url.startsWith('http')) url = 'https://' + url;

            // リセット
            bar.style.width = "0%";
            log('step-1', 'サーバーへリクエスト送信中...', '#007AFF');
            log('step-2', '受信準備中...', '#999');
            log('step-3', '解読待機', '#999');
            log('step-4', '描画待機', '#999');

            const secret = btoa(unescape(encodeURIComponent(url))).split('').reverse().join('');
            
            try {
                const res = await fetch(`/api/proxy?q=${secret}`);
                if(!res.ok) throw new Error("サーバー側で拒否されました");
                
                log('step-1', 'サーバー接続成功', '#34c759');
                
                const rawData = await res.text();
                const [sizeInfo, packed] = rawData.split(":::SPLIT:::");
                
                // 受信完了のシミュレート（Fetch APIでは通常一括ですが、計算は可能です）
                bar.style.width = "100%";
                log('step-2', `受信完了 (${packed.length} 文字)`, '#34c759');

                log('step-3', 'パズル解読中...', '#007AFF');
                // 🌟 解読処理
                let restored = packed.replace(/TITIUNKO/g, '').replace(/«/g, '<').replace(/»/g, '>');
                log('step-3', '解読成功', '#34c759');

                log('step-4', 'レイアウト構築中...', '#007AFF');
                const view = document.getElementById('p-final-view');
                view.style.display = "block";
                view.innerHTML = `
                    <style>
                        .note { padding:20px; font-family:sans-serif; line-height:1.7; color:#333; }
                        .note img { max-width:100%; border-radius:10px; }
                        .note table { width:100%; border-collapse:collapse; }
                        .note td { border:1px solid #eee; padding:8px; }
                    </style>
                    <div class="note">${restored}</div>
                `;
                log('step-4', '表示完了', '#34c759');
                document.getElementById('p-diag-box').style.display = "none"; // 成功したら診断箱を消す

            } catch (e) {
                document.getElementById('p-error-log').innerText = "エラー詳細: " + e.message;
                log('step-1', '失敗', 'red');
            }
        };

        btn.onclick = execute;
        input.onkeydown = (e) => { if(e.key === 'Enter') execute(); };
        document.getElementById('p-exit').onclick = () => location.reload();
    }
};

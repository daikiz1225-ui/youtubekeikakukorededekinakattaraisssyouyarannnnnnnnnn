/**
 * proxy.js (デバッグログ・高速復元版)
 */
const ProxyModule = {
    init() {
        if (typeof GameModule !== 'undefined') {
            GameModule.setupGameCanvas('隠密ブラウザv2', 'proxy');
            this.render();
        }
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;
        container.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:999999; background:#000;";

        container.innerHTML = `
            <div style="display:flex; flex-direction:column; height:100%; width:100%; font-family:sans-serif;">
                <div style="padding:15px; background:#1a1a1a; display:flex; gap:10px; flex-shrink:0;">
                    <button id="p-back" style="background:none; border:none; color:#ff453a; font-size:20px;">✕</button>
                    <input type="text" id="p-url" placeholder="URLをペースト" style="flex:1; height:40px; border-radius:12px; border:none; background:#333; color:#fff; padding:0 15px;">
                    <button id="p-btn" style="height:40px; padding:0 20px; background:#007AFF; color:#fff; border-radius:12px; border:none; font-weight:bold;">抽出</button>
                </div>
                <div id="p-screen" style="flex:1; background:#fff; overflow-y:auto; -webkit-overflow-scrolling:touch;">
                    <div id="p-log" style="padding:40px; color:#555; line-height:2; font-size:14px;">
                        <div id="s-1">○ 待機中</div>
                        <div id="s-2">○ 通信未開始</div>
                        <div id="s-3">○ データ未受信</div>
                    </div>
                </div>
            </div>
        `;
        this.bind();
    },

    bind() {
        const input = document.getElementById('p-url');
        const btn = document.getElementById('p-btn');
        const screen = document.getElementById('p-screen');
        const log = (id, txt) => { document.getElementById(id).innerHTML = `● ${txt}`; };

        const startFetch = async () => {
            let url = input.value.trim();
            if(!url) return;
            if(!url.startsWith('http')) url = 'https://' + url;

            log('s-1', '通信準備中...');
            const secret = btoa(unescape(encodeURIComponent(url))).split('').reverse().join('');
            
            try {
                log('s-2', 'サーバーへリクエスト送信...');
                const res = await fetch(`/api/proxy?q=${secret}`);
                if(!res.ok) throw new Error("HTTP_"+res.status);
                
                const raw = await res.text();
                log('s-3', `受信完了 (${raw.length} bytes)`);

                // 🌟 高速復元
                let step1 = raw.split('').reverse().join('');
                let step2 = step1.split('†').join(''); // ノイズ除去
                let finalHtml = step2
                    .replace(/§D1/g, '<div')
                    .replace(/§D2/g, '</div>')
                    .replace(/§IM/g, '<img')
                    .replace(/§S=/g, 'src="');

                screen.innerHTML = `
                    <style>body{padding:20px; line-height:1.6;} img{max-width:100%; border-radius:8px;}</style>
                    <div class="content">${finalHtml}</div>
                `;
            } catch (e) {
                log('s-2', `<span style="color:red;">エラー: ${e.message}</span>`);
            }
        };

        btn.onclick = startFetch;
        input.onkeydown = (e) => { if(e.key === 'Enter') startFetch(); };
        document.getElementById('p-back').onclick = () => location.reload();
    }
};

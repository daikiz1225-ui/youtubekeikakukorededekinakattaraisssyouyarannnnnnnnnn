/**
 * proxy.js (難読化スクレイピング方式)
 */
const ProxyModule = {
    init() {
        if (typeof GameModule !== 'undefined') {
            GameModule.setupGameCanvas('攻略データ抽出', 'proxy');
            this.render();
        }
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;

        // 既存のYouTubeレイアウトを邪魔しないよう、クラスを追加して制御
        container.innerHTML = `
            <div id="sc-root" style="display:flex; flex-direction:column; height:100%; background:#000;">
                <div style="padding:12px; background:#1a1a1a; display:flex; gap:10px; flex-shrink:0;">
                    <input type="text" id="p-url" placeholder="攻略サイトのURLを入力" 
                        style="flex:1; height:40px; border-radius:20px; border:none; background:#333; color:#fff; padding:0 15px; font-size:16px; outline:none;">
                    <button id="p-btn" style="height:40px; padding:0 20px; background:#007AFF; color:#fff; border-radius:20px; border:none; font-weight:bold;">抽出</button>
                </div>
                <div id="p-display" style="flex:1; background:#fff; overflow:hidden; border-radius:15px 15px 0 0; position:relative;">
                    <div id="p-status" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:#999; text-align:center;">
                        URLを入れて「抽出」を押してください
                    </div>
                    <iframe id="p-frame" style="width:100%; height:100%; border:none; display:none;"></iframe>
                </div>
            </div>
        `;
        this.bind();
    },

    bind() {
        const input = document.getElementById('p-url');
        const btn = document.getElementById('p-btn');
        const frame = document.getElementById('p-frame');
        const status = document.getElementById('p-status');

        const startExtraction = async () => {
            let url = input.value.trim();
            if (!url) return;
            if (!url.startsWith('http')) url = 'https://' + url;

            status.innerHTML = '🔍 解析中... (アイフィルターを回避しています)';
            status.style.display = 'block';
            frame.style.display = 'none';

            // 🌟 URLをぐっちゃぐちゃにする (Base64 -> 反転)
            const secret = btoa(unescape(encodeURIComponent(url))).split('').reverse().join('');
            
            try {
                const res = await fetch(`/api/proxy?q=${secret}`);
                const html = await res.text();
                
                // 取得したHTMLを流し込む
                frame.srcdoc = html;
                frame.style.display = 'block';
                status.style.display = 'none';
                input.blur();
            } catch (e) {
                status.innerHTML = '❌ 抽出に失敗しました。';
            }
        };

        btn.onclick = startExtraction;
        input.onkeydown = (e) => { 
            if (e.key === 'Enter') {
                e.preventDefault();
                startExtraction();
            }
        };
    }
};

/**
 * proxy.js (鍵マーク排除・絶対服従レイアウト版)
 */
const ProxyModule = {
    init() {
        if (typeof GameModule !== 'undefined') {
            GameModule.setupGameCanvas('攻略リーダー', 'proxy');
            this.render();
        }
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;
        
        // iPad全画面を確保
        container.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:999999; background:#f9f9f9; overflow:hidden;";

        container.innerHTML = `
            <div style="display:flex; flex-direction:column; height:100%; width:100%;">
                <div style="padding:15px; background:#2c3e50; display:flex; gap:10px; flex-shrink:0;">
                    <button id="p-exit" style="background:none; border:none; color:#e74c3c; font-size:24px; font-weight:bold; cursor:pointer;">✕</button>
                    <input type="text" id="p-url" placeholder="攻略URLを入力" style="flex:1; height:44px; border-radius:8px; border:none; background:#ecf0f1; color:#2c3e50; padding:0 15px; font-size:16px;">
                    <button id="p-go" style="padding:0 25px; background:#3498db; color:#fff; border-radius:8px; border:none; font-weight:bold; cursor:pointer; font-size:16px;">Go</button>
                </div>
                <div id="p-content-area" style="flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:20px; text-align:center;">
                    <div style="color:#7f8c8d; margin-top:100px; font-size:18px;">URLを入力して「Go」を押してください</div>
                </div>
            </div>
        `;
        this.bind();
    },

    bind() {
        const input = document.getElementById('p-url');
        const btn = document.getElementById('p-go');
        const contentArea = document.getElementById('p-content-area');

        const execute = async () => {
            let url = input.value.trim();
            if(!url) return;
            if(!url.startsWith('http')) url = 'https://' + url;

            contentArea.innerHTML = '<div style="color:#34495e; margin-top:50px; font-size:18px;">🔄 安全なテキストを復元中...</div>';

            const secret = btoa(unescape(encodeURIComponent(url))).split('').reverse().join('');
            
            try {
                const res = await fetch(`/api/proxy?q=${secret}`);
                if(!res.ok) throw new Error("サーバー接続エラー");
                
                const rawData = await res.text();
                const [sizeInfo, packed] = rawData.split(":::SPLIT:::");
                
                // 🌟 ノイズ除去とタグの復元
                let restored = packed.replace(/TITIUNKO/g, '').replace(/«/g, '<').replace(/»/g, '>');

                // 🌟 【絶対服従CSS】どんな元のクラス名があっても上書きする最強の設計図
                const ironcladCSS = `
                    <style>
                        #p-safe-view {
                            text-align: left;
                            max-width: 900px;
                            margin: 0 auto;
                            font-family: -apple-system, sans-serif;
                            color: #333;
                            line-height: 1.8;
                            padding: 20px;
                            background: #fff;
                            border-radius: 12px;
                            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
                        }
                        #p-safe-view * {
                            max-width: 100% !important;
                            word-wrap: break-word !important;
                        }
                        #p-safe-view h1, #p-safe-view h2 {
                            background: #ecf0f1;
                            padding: 15px 20px;
                            border-left: 6px solid #3498db;
                            border-radius: 4px;
                            margin: 30px 0 15px 0;
                            font-size: 22px;
                        }
                        #p-safe-view h3 {
                            border-bottom: 2px solid #bdc3c7;
                            padding-bottom: 5px;
                            margin-top: 25px;
                            color: #2c3e50;
                        }
                        #p-safe-view table {
                            width: 100% !important;
                            border-collapse: collapse !important;
                            margin: 20px 0;
                            background: #fff;
                        }
                        #p-safe-view th { background: #ecf0f1 !important; }
                        #p-safe-view td, #p-safe-view th {
                            border: 1px solid #bdc3c7 !important;
                            padding: 10px !important;
                            font-size: 15px;
                        }
                        #p-safe-view .proxy-img {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background: #fdfbfb;
                            border: 2px dashed #bdc3c7;
                            height: 100px;
                            margin: 15px 0;
                            color: #7f8c8d;
                            border-radius: 8px;
                            font-weight: bold;
                        }
                        #p-safe-view span { color: inherit; text-decoration: none; } /* 元リンク */
                    </style>
                `;

                contentArea.innerHTML = ironcladCSS + `<div id="p-safe-view">${restored}</div>`;
                contentArea.scrollTop = 0;

            } catch (e) {
                contentArea.innerHTML = `<div style="color:red; margin-top:50px;">❌ 通信エラー: ${e.message}</div>`;
            }
        };

        btn.onclick = execute;
        // ※ ご指示通り、Enterキーで検索が発動しないよう（誤作動防止）、Enterキー処理は無効化しました。
        // （「Go」ボタンを押した時だけ作動します）
        input.onkeydown = (e) => { 
            if(e.key === 'Enter') e.preventDefault(); 
        };
        document.getElementById('p-exit').onclick = () => location.reload();
    }
};

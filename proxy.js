/**
 * proxy.js (スクレイピング・データ抽出版)
 */
const ProxyModule = {
    init() {
        GameModule.setupGameCanvas('Gameデータ抽出', 'proxy');
        this.render();
    },

    render() {
        const container = document.getElementById('proxy-container');
        container.innerHTML = `
            <div style="padding: 10px; color: white;">
                <input type="text" id="target-url" placeholder="解析したいURL" style="width:70%; height:44px;">
                <button id="extract-btn" style="height:44px;">情報を抽出</button>
                <div id="result-display" style="margin-top:20px; background:#fff; color:#000; padding:15px; border-radius:8px; min-height:200px;">
                    ここに抽出した結果が表示されます
                </div>
            </div>
        `;
        this.bindEvents();
    },

    async bindEvents() {
        const btn = document.getElementById('extract-btn');
        btn.addEventListener('click', async () => {
            const url = document.getElementById('target-url').value;
            const display = document.getElementById('result-display');
            display.innerText = "読み込み中...";

            try {
                // 1. 外部サービス経由でHTMLを取得
                const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
                const data = await response.json();
                
                // 2. HTMLを解析
                const parser = new DOMParser();
                const doc = parser.parseFromString(data.contents, 'text/html');

                // 3. 必要な情報を「バラバラにして」抜き出す
                // 例：記事のタイトルとメイン画像だけ抜く
                const title = doc.querySelector('h1')?.innerText || "タイトルなし";
                const firstImg = doc.querySelector('img')?.src;

                // 4. 自作サイトの形に合わせて作成
                display.innerHTML = `
                    <h2 style="color: #333;">${title}</h2>
                    ${firstImg ? `<img src="${firstImg}" style="max-width:100%;">` : ''}
                    <p>元サイトから必要な情報だけを抽出しました。</p>
                `;

            } catch (e) {
                display.innerText = "エラーが発生しました。";
            }
        });
    }
};

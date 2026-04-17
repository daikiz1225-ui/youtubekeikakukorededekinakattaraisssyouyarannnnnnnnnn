/**
 * backup.js - データのバックアップ（保存）と復元（読み込み）機能
 */
const DataManager = {
    // 1. エクスポート（保存）
    export() {
        try {
            const data = {
                yt_subs: JSON.parse(localStorage.getItem('yt_subs') || '[]'),
                yt_history: JSON.parse(localStorage.getItem('yt_history') || '[]').slice(0, 10), // 履歴は直近10件
                yt_my_playlists: JSON.parse(localStorage.getItem('yt_my_playlists') || '{}'),
                exportedAt: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `googlo_data_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert("保存に失敗しました。");
        }
    },

    // 2. インポート（復元）
    import() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);
                    
                    // データのバリデーション（簡易チェック）
                    if (!importedData.yt_subs && !importedData.yt_my_playlists) {
                        throw new Error("無効なファイル形式です");
                    }

                    // localStorageへ書き込み
                    if (importedData.yt_subs) localStorage.setItem('yt_subs', JSON.stringify(importedData.yt_subs));
                    if (importedData.yt_history) localStorage.setItem('yt_history', JSON.stringify(importedData.yt_history));
                    if (importedData.yt_my_playlists) localStorage.setItem('yt_my_playlists', JSON.stringify(importedData.yt_my_playlists));

                    alert("データを復元しました。ページを再読み込みします。");
                    location.reload();
                } catch (err) {
                    alert("復元に失敗しました。正しいファイルを選択してください。");
                }
            };
            reader.readAsText(file);
        };
        input.click();
    },

    // 3. サイドバーに操作ボタンを追加
    injectUI() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        const container = document.createElement('div');
        container.style.borderTop = "1px solid #333";
        container.style.marginTop = "10px";
        container.style.paddingTop = "10px";

        // 保存ボタン
        const expBtn = document.createElement('div');
        expBtn.className = 'nav-item';
        expBtn.innerHTML = `📤<span style="font-size:12px;">データ保存</span>`;
        expBtn.onclick = () => this.export();

        // 復元ボタン
        const impBtn = document.createElement('div');
        impBtn.className = 'nav-item';
        impBtn.innerHTML = `📥<span style="font-size:12px;">データ復元</span>`;
        impBtn.onclick = () => this.import();

        container.appendChild(expBtn);
        container.appendChild(impBtn);
        sidebar.appendChild(container);
    }
};

// 起動
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => DataManager.injectUI(), 500);
});

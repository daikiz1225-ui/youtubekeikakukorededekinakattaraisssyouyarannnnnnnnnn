/**
 * backup.js - データのバックアップ（保存）と復元（読み込み）機能
 * 対応項目: チャンネル登録、履歴(50件)、プレイリスト、後で見る、続きから
 */
const DataManager = {
    // 1. エクスポート（保存）
    export() {
        try {
            const data = {
                yt_subs: JSON.parse(localStorage.getItem('yt_subs') || '[]'),
                // 履歴を直近50件まで保存できるように拡張
                yt_history: JSON.parse(localStorage.getItem('yt_history') || '[]').slice(0, 500),
                yt_my_playlists: JSON.parse(localStorage.getItem('yt_my_playlists') || '{}'),
                // 新規追加: 「後で見る」と「続きから見る」をバックアップ対象に含める
                yt_watchlater: JSON.parse(localStorage.getItem('yt_watchlater') || '[]'),
                yt_resume_list: JSON.parse(localStorage.getItem('yt_resume_list') || '[]'),
                exportedAt: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `googlo_full_data_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            alert("データの書き出しに失敗しました。");
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
                    
                    // データのバリデーション（最低限のチェック）
                    if (!importedData.yt_subs && !importedData.yt_my_playlists && !importedData.yt_watchlater) {
                        throw new Error("無効なファイル形式です");
                    }

                    // localStorageへ各データを復元
                    if (importedData.yt_subs) localStorage.setItem('yt_subs', JSON.stringify(importedData.yt_subs));
                    if (importedData.yt_history) localStorage.setItem('yt_history', JSON.stringify(importedData.yt_history));
                    if (importedData.yt_my_playlists) localStorage.setItem('yt_my_playlists', JSON.stringify(importedData.yt_my_playlists));
                    
                    // 新規追加分の復元処理
                    if (importedData.yt_watchlater) localStorage.setItem('yt_watchlater', JSON.stringify(importedData.yt_watchlater));
                    if (importedData.yt_resume_list) localStorage.setItem('yt_resume_list', JSON.stringify(importedData.yt_resume_list));

                    alert("すべてのデータを復元しました。ページを再読み込みします。");
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
        container.id = 'backup-manager-ui';
        container.style.borderTop = "1px solid #333";
        container.style.marginTop = "10px";
        container.style.paddingTop = "10px";

        // 保存ボタン
        const expBtn = document.createElement('div');
        expBtn.className = 'nav-item';
        expBtn.style.color = "#4CAF50"; // 保存は緑っぽく
        expBtn.innerHTML = `📤<span style="font-size:12px;">データ保存(フル)</span>`;
        expBtn.onclick = () => this.export();

        // 復元ボタン
        const impBtn = document.createElement('div');
        impBtn.className = 'nav-item';
        impBtn.style.color = "#2196F3"; // 復元は青っぽく
        impBtn.innerHTML = `📥<span style="font-size:12px;">データ復元</span>`;
        impBtn.onclick = () => this.import();

        container.appendChild(expBtn);
        container.appendChild(impBtn);
        sidebar.appendChild(container);
    }
};

// 起動（重複注入防止のためIDチェック付き）
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if(!document.getElementById('backup-manager-ui')) {
            DataManager.injectUI();
        }
    }, 500);
});

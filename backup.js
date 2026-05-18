/**
 * backup.js - クラウド専用・データバックアップ＆同期機能
 * 画面上の「アカウント」ボタンの下に保存・復元ボタンをまとめ、ファイル保存機能を完全除去
 */
const DataManager = {
    // データ一括取得（履歴500件制限を維持）
    getLocalData() {
        return {
            yt_subs: JSON.parse(localStorage.getItem('yt_subs') || '[]'), //
            yt_history: JSON.parse(localStorage.getItem('yt_history') || '[]').slice(0, 500), // 直近500件制限
            yt_my_playlists: JSON.parse(localStorage.getItem('yt_my_playlists') || '{}'), //
            yt_watchlater: JSON.parse(localStorage.getItem('yt_watchlater') || '[]'), //
            yt_resume_list: JSON.parse(localStorage.getItem('yt_resume_list') || '[]'), //
            exportedAt: new Date().toISOString() //
        };
    },

    // ローカルストレージへデータを上書き反映
    applyDataToLocal(data) {
        if (!data.yt_subs && !data.yt_my_playlists && !data.yt_watchlater) throw new Error("無効なデータ構造"); //
        if (data.yt_subs) localStorage.setItem('yt_subs', JSON.stringify(data.yt_subs)); //
        if (data.yt_history) localStorage.setItem('yt_history', JSON.stringify(data.yt_history)); //
        if (data.yt_my_playlists) localStorage.setItem('yt_my_playlists', JSON.stringify(data.yt_my_playlists)); //
        if (data.yt_watchlater) localStorage.setItem('yt_watchlater', JSON.stringify(data.yt_watchlater)); //
        if (data.yt_resume_list) localStorage.setItem('yt_resume_list', JSON.stringify(data.yt_resume_list)); //
    },

    // 🛡️ バックエンド経由：アカウント認証（サインアップ・ログイン）
    async authenticate(action, username, password) {
        if (!username || !password) return alert("ユーザー名とパスワードを入力してください");
        try {
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, username, password })
            });
            const data = await response.json();
            if (data.success) {
                alert(data.message || "ログインに成功しました！");
                if (action === 'login') {
                    localStorage.setItem('googlo_logged_in_user', username);
                    location.reload();
                }
            } else {
                alert("エラー: " + data.error);
            }
        } catch (e) {
            alert("通信エラーが発生しました");
        }
    },

    // 🛡️ バックエンド経由：クラウドへデータを同期保存
    async cloudSave() {
        const username = localStorage.getItem('googlo_logged_in_user');
        if (!username) return alert("保存するにはログインが必要です");

        try {
            const backupData = this.getLocalData();
            const response = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, action: 'save', backupData })
            });
            const resData = await response.json();
            alert(resData.message || "オンライン保存が完了しました！");
        } catch (e) {
            alert("クラウドへの保存中にエラーが発生しました");
        }
    },

    // 🛡️ バックエンド経由：クラウドからデータを復元
    async cloudLoad(isAuto = false) {
        const username = localStorage.getItem('googlo_logged_in_user');
        if (!username) return;

        try {
            const response = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, action: 'load' })
            });
            const resData = await response.json();
            if (resData.success) {
                this.applyDataToLocal(resData.data);
                if (!isAuto) {
                    alert("クラウドからデータを復元しました！再読み込みします。");
                    location.reload();
                } else {
                    console.log("googlo: オンラインデータを自動ロードしました");
                }
            } else if (!isAuto) {
                alert("エラー: " + resData.error);
            }
        } catch (e) {
            if (!isAuto) alert("クラウドからの読み込み中にエラーが発生しました");
        }
    },

    // 画面中央ポップアップ（モーダル）の表示制御
    toggleModal(show) {
        let modal = document.getElementById('googlo-auth-modal');
        if (!modal && show) {
            modal = document.createElement('div');
            modal.id = 'googlo-auth-modal';
            modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:9999;";
            const currentUser = localStorage.getItem('googlo_logged_in_user');
            
            modal.innerHTML = `
                <div style="background:#1a1a1a; padding:25px; border-radius:8px; border:1px solid #333; width:320px; color:#fff; position:relative; box-shadow:0 4px 20px rgba(0,0,0,0.5);">
                    <div id="modal-close-btn" style="position:absolute; top:10px; right:15px; cursor:pointer; color:#aaa; font-size:18px;">&times;</div>
                    ${!currentUser ? `
                        <h3 style="margin:0 0 15px 0; font-size:16px; border-bottom:1px solid #333; padding-bottom:5px;">💻 アカウント設定</h3>
                        <input type="text" id="modal-user" placeholder="ユーザー名" style="width:100%; margin-bottom:10px; background:#2a2a2a; color:#fff; border:1px solid #444; padding:8px; border-radius:4px; box-sizing:border-box;">
                        <input type="password" id="modal-pass" placeholder="パスワード" style="width:100%; margin-bottom:15px; background:#2a2a2a; color:#fff; border:1px solid #444; padding:8px; border-radius:4px; box-sizing:border-box;">
                        <button id="modal-btn-submit" style="width:100%; background:#4CAF50; color:white; border:none; padding:8px; border-radius:4px; font-weight:bold; cursor:pointer; margin-bottom:8px;">ログイン</button>
                        <button id="modal-btn-switch" style="width:100%; background:#555; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer;">新規登録画面へ切り替え</button>
                    ` : `
                        <h3 style="margin:0 0 15px 0; color:#4CAF50; font-size:16px;">✅ ログイン中</h3>
                        <p style="font-size:14px;">ユーザー名: <strong>${currentUser}</strong></p>
                        <button id="modal-btn-logout" style="width:100%; background:#f44336; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-weight:bold; margin-top:10px;">ログアウト</button>
                    `}
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('modal-close-btn').onclick = () => this.toggleModal(false);

            if (!currentUser) {
                let isSignUp = false;
                const swBtn = document.getElementById('modal-btn-switch');
                const subBtn = document.getElementById('modal-btn-submit');
                const title = modal.querySelector('h3');
                swBtn.onclick = () => {
                    isSignUp = !isSignUp;
                    title.innerText = isSignUp ? "💻 アカウント新規登録" : "💻 アカウントログイン";
                    subBtn.innerText = isSignUp ? "新規アカウント作成" : "ログイン";
                    subBtn.style.backgroundColor = isSignUp ? "#2196F3" : "#4CAF50";
                    swBtn.innerText = isSignUp ? "ログイン画面へ切り替え" : "新規登録画面へ切り替え";
                };
                subBtn.onclick = () => {
                    this.authenticate(isSignUp ? 'signup' : 'login', document.getElementById('modal-user').value, document.getElementById('modal-pass').value);
                };
            } else {
                document.getElementById('modal-btn-logout').onclick = () => {
                    localStorage.removeItem('googlo_logged_in_user');
                    location.reload();
                };
            }
        } else if (modal && !show) {
            modal.remove();
        }
    },

    // サイドバーへ全UIを集約して挿入する処理
    injectUI() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar || document.getElementById('backup-manager-ui')) return;

        const container = document.createElement('div');
        container.id = 'backup-manager-ui';
        container.style = "border-top:1px solid #333; margin-top:15px; padding-top:15px;";

        const currentUser = localStorage.getItem('googlo_logged_in_user');

        // 1. メインのアカウントログイン・管理ボタン
        const accountBtn = document.createElement('div');
        accountBtn.className = 'nav-item';
        accountBtn.style = "color:#fff; cursor:pointer; margin-bottom:8px;";
        if (currentUser) {
            accountBtn.innerHTML = `💻 <span style="font-size:12px; font-weight:bold; color:#4CAF50;">アカウント (${currentUser})</span>`;
        } else {
            accountBtn.innerHTML = `💻 <span style="font-size:12px; font-weight:bold;">アカウント設定</span>`;
        }
        accountBtn.onclick = () => this.toggleModal(true);
        container.appendChild(accountBtn);

        // 2. クラウド同期ボタン（ログイン中のみ綺麗に並べて表示）
        if (currentUser) {
            // オンラインに保存ボタン
            const saveBtn = document.createElement('div');
            saveBtn.className = 'nav-item';
            saveBtn.style = "color:#4CAF50; cursor:pointer; margin-bottom:8px; padding-left:5px;";
            saveBtn.innerHTML = `☁️ <span style="font-size:12px; font-weight:bold;">オンラインに保存</span>`;
            saveBtn.onclick = () => this.cloudSave();
            container.appendChild(saveBtn);

            // クラウドから復元ボタン
            const loadBtn = document.createElement('div');
            loadBtn.className = 'nav-item';
            loadBtn.style = "color:#2196F3; cursor:pointer; padding-left:5px;";
            loadBtn.innerHTML = `🔄 <span style="font-size:12px; font-weight:bold;">クラウドから復元</span>`;
            loadBtn.onclick = () => this.cloudLoad(false);
            container.appendChild(loadBtn);
        } else {
            // 未ログイン時は案内テキストを優しく表示
            const infoText = document.createElement('div');
            infoText.style = "color:#555; font-size:11px; padding:4px 5px; line-height:1.3;";
            infoText.innerText = "※ログインするとここにオンライン保存・復元ボタンが出現します。";
            container.appendChild(infoText);
        }

        sidebar.appendChild(container);
    }
};

// ページ読み込み完了時の自動トリガー処理
window.addEventListener('DOMContentLoaded', () => {
    // すでにログインしている人は入った瞬間にクラウドから自動ロード
    if (localStorage.getItem('googlo_logged_in_user')) {
        DataManager.cloudLoad(true);
    }
    // サイドバーのDOMが生成されるのを見計らってUIをインジェクト
    setTimeout(() => { DataManager.injectUI(); }, 500);
});

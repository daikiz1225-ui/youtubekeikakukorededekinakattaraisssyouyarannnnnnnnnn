/**
 * backup.js - Google風マルチアカウント対応版
 * ログインなしの一瞬切り替え ＆ 個別ログアウト（アカウント削除）機能搭載
 */
const DataManager = {
    // データ一括取得（履歴500件制限を維持）
    getLocalData() {
        return {
            yt_subs: JSON.parse(localStorage.getItem('yt_subs') || '[]'),
            yt_history: JSON.parse(localStorage.getItem('yt_history') || '[]').slice(0, 500),
            yt_my_playlists: JSON.parse(localStorage.getItem('yt_my_playlists') || '{}'),
            yt_watchlater: JSON.parse(localStorage.getItem('yt_watchlater') || '[]'),
            yt_resume_list: JSON.parse(localStorage.getItem('yt_resume_list') || '[]'),
            exportedAt: new Date().toISOString()
        };
    },

    // ローカルストレージへデータを上書き反映
    applyDataToLocal(data) {
        if (!data.yt_subs && !data.yt_my_playlists && !data.yt_watchlater) throw new Error("無効なデータ構造");
        if (data.yt_subs) localStorage.setItem('yt_subs', JSON.stringify(data.yt_subs));
        if (data.yt_history) localStorage.setItem('yt_history', JSON.stringify(data.yt_history));
        if (data.yt_my_playlists) localStorage.setItem('yt_my_playlists', JSON.stringify(data.yt_my_playlists));
        if (data.yt_watchlater) localStorage.setItem('yt_watchlater', JSON.stringify(data.yt_watchlater));
        if (data.yt_resume_list) localStorage.setItem('yt_resume_list', JSON.stringify(data.yt_resume_list));
    },

    // 🛡️ アカウント認証（サインアップ・ログイン）
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
                
                // 現在のアクティブユーザーに設定
                localStorage.setItem('googlo_logged_in_user', username);
                
                // マルチアカウントリストに保存（重複除去）
                let list = JSON.parse(localStorage.getItem('googlo_account_list') || '[]');
                if (!list.includes(username)) {
                    list.push(username);
                    localStorage.setItem('googlo_account_list', JSON.stringify(list));
                }
                
                location.reload();
            } else {
                alert("エラー: " + data.error);
            }
        } catch (e) {
            alert("通信エラーが発生しました");
        }
    },

    // 🔄 アカウントをタップして一瞬で切り替える機能（Google風）
    switchAccount(username) {
        localStorage.setItem('googlo_logged_in_user', username);
        alert(`${username} に切り替えました。データを同期します。`);
        location.reload();
    },

    // ❌ 特定のアカウントだけを個別ログアウト（リストから削除）
    logoutIndividual(username, e) {
        if(e) e.stopPropagation(); // 切り替え処理が同時に動くのを防ぐ
        
        if (!confirm(`${username} をログアウト（端末から削除）しますか？`)) return;

        let list = JSON.parse(localStorage.getItem('googlo_account_list') || '[]');
        list = list.filter(user => user !== username);
        localStorage.setItem('googlo_account_list', JSON.stringify(list));

        const currentUser = localStorage.getItem('googlo_logged_in_user');
        
        // もし今使っているアカウントをログアウトした場合は、次のアカウントに切り替えるか初期化する
        if (currentUser === username) {
            if (list.length > 0) {
                localStorage.setItem('googlo_logged_in_user', list[0]);
            } else {
                localStorage.removeItem('googlo_logged_in_user');
            }
        }
        
        alert("ログアウトしました");
        location.reload();
    },

    // 🛡️ クラウドへデータを同期保存
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

    // 🛡️ クラウドからデータを復元
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
                }
            } else if (!isAuto) {
                alert("エラー: " + resData.error);
            }
        } catch (e) {}
    },

    // 画面中央ポップアップ（Google風マルチアカウント仕様）
    toggleModal(show, showAddForm = false) {
        let modal = document.getElementById('googlo-auth-modal');
        if (!modal && show) {
            modal = document.createElement('div');
            modal.id = 'googlo-auth-modal';
            modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:9999;";
            
            const currentUser = localStorage.getItem('googlo_logged_in_user');
            const accountList = JSON.parse(localStorage.getItem('googlo_account_list') || '[]');

            // アカウントのフォームを表示する場合、またはまだ誰もログインしていない場合
            if (showAddForm || accountList.length === 0) {
                modal.innerHTML = `
                    <div style="background:#1a1a1a; padding:25px; border-radius:8px; border:1px solid #333; width:320px; color:#fff; position:relative; box-shadow:0 4px 20px rgba(0,0,0,0.5);">
                        <div id="modal-close-btn" style="position:absolute; top:10px; right:15px; cursor:pointer; color:#aaa; font-size:18px;">&times;</div>
                        <h3 style="margin:0 0 15px 0; font-size:16px; border-bottom:1px solid #333; padding-bottom:5px;">💻 アカウントを追加</h3>
                        <input type="text" id="modal-user" placeholder="ユーザー名" style="width:100%; margin-bottom:10px; background:#2a2a2a; color:#fff; border:1px solid #444; padding:8px; border-radius:4px; box-sizing:border-box;">
                        <input type="password" id="modal-pass" placeholder="パスワード" style="width:100%; margin-bottom:15px; background:#2a2a2a; color:#fff; border:1px solid #444; padding:8px; border-radius:4px; box-sizing:border-box;">
                        <button id="modal-btn-submit" style="width:100%; background:#4CAF50; color:white; border:none; padding:8px; border-radius:4px; font-weight:bold; cursor:pointer; margin-bottom:8px;">ログイン</button>
                        <button id="modal-btn-switch" style="width:100%; background:#555; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; margin-bottom:8px;">新規登録画面へ切り替え</button>
                        ${accountList.length > 0 ? `<button id="modal-btn-back" style="width:100%; background:#333; color:white; border:1px solid #555; padding:8px; border-radius:4px; cursor:pointer;">アカウント一覧に戻る</button>` : ''}
                    </div>
                `;
                document.body.appendChild(modal);
                document.getElementById('modal-close-btn').onclick = () => this.toggleModal(false);
                if(document.getElementById('modal-btn-back')) {
                    document.getElementById('modal-btn-back').onclick = () => { modal.remove(); this.toggleModal(true, false); };
                }

                let isSignUp = false;
                const swBtn = document.getElementById('modal-btn-switch');
                const subBtn = document.getElementById('modal-btn-submit');
                const title = modal.querySelector('h3');
                
                swBtn.onclick = () => {
                    isSignUp = !isSignUp;
                    title.innerText = isSignUp ? "💻 アカウント新規登録" : "💻 アカウントを追加";
                    subBtn.innerText = isSignUp ? "新規アカウント作成" : "ログイン";
                    subBtn.style.backgroundColor = isSignUp ? "#2196F3" : "#4CAF50";
                    swBtn.innerText = isSignUp ? "ログイン画面へ切り替え" : "新規登録画面へ切り替え";
                };
                subBtn.onclick = () => {
                    this.authenticate(isSignUp ? 'signup' : 'login', document.getElementById('modal-user').value, document.getElementById('modal-pass').value);
                };
            } else {
                // Google風アカウントリスト画面
                let listHTML = "";
                accountList.forEach(user => {
                    const isActive = (user === currentUser);
                    listHTML += `
                        <div class="account-item-row" data-user="${user}" style="display:flex; justify-content:between; align-items:center; padding:10px; margin-bottom:8px; background:${isActive ? '#2e3d30' : '#222'}; border:1px solid ${isActive ? '#4CAF50' : '#444'}; border-radius:6px; cursor:pointer; transition:background 0.2s;">
                            <div style="flex-grow:1; font-size:14px; display:flex; align-items:center; color:#fff;">
                                <span style="margin-right:8px; font-size:16px;">${isActive ? '🟢' : '👤'}</span>
                                <strong>${user}</strong> ${isActive ? '<span style="font-size:11px; color:#4CAF50; margin-left:5px;">(使用中)</span>' : ''}
                            </div>
                            <button class="individual-logout-btn" data-user="${user}" style="background:transparent; color:#ff5252; border:none; font-size:12px; cursor:pointer; padding:5px 8px; border-radius:4px; font-weight:bold;">ログアウト</button>
                        </div>
                    `;
                });

                modal.innerHTML = `
                    <div style="background:#1a1a1a; padding:25px; border-radius:8px; border:1px solid #333; width:340px; color:#fff; position:relative; box-shadow:0 4px 20px rgba(0,0,0,0.5);">
                        <div id="modal-close-btn" style="position:absolute; top:10px; right:15px; cursor:pointer; color:#aaa; font-size:18px;">&times;</div>
                        <h3 style="margin:0 0 15px 0; font-size:16px; border-bottom:1px solid #333; padding-bottom:5px;">💻 アカウントの切り替え</h3>
                        
                        <div style="max-height:220px; overflow-y:auto; margin-bottom:15px;">
                            ${listHTML}
                        </div>
                        
                        <button id="modal-btn-go-add" style="width:100%; background:#2196F3; color:white; border:none; padding:10px; border-radius:4px; font-weight:bold; cursor:pointer;">➕ 別のアカウントを追加する</button>
                    </div>
                `;
                document.body.appendChild(modal);
                document.getElementById('modal-close-btn').onclick = () => this.toggleModal(false);
                document.getElementById('modal-btn-go-add').onclick = () => { modal.remove(); this.toggleModal(true, true); };

                // リスト内の行クリックで切り替え、ログアウトボタンで個別削除
                modal.querySelectorAll('.account-item-row').forEach(row => {
                    row.onclick = () => this.switchAccount(row.getAttribute('data-user'));
                });
                modal.querySelectorAll('.individual-logout-btn').forEach(btn => {
                    btn.onclick = (e) => this.logoutIndividual(btn.getAttribute('data-user'), e);
                });
            }
        } else if (modal && !show) {
            modal.remove();
        }
    },

    // サイドバーへUIを挿入
    injectUI() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar || document.getElementById('backup-manager-ui')) return;

        const container = document.createElement('div');
        container.id = 'backup-manager-ui';
        container.style = "border-top:1px solid #333; margin-top:15px; padding-top:15px;";

        const currentUser = localStorage.getItem('googlo_logged_in_user');

        // 1. メインのアカウント切り替え・管理ボタン
        const accountBtn = document.createElement('div');
        accountBtn.className = 'nav-item';
        accountBtn.style = "color:#fff; cursor:pointer; margin-bottom:8px;";
        if (currentUser) {
            accountBtn.innerHTML = `💻 <span style="font-size:12px; font-weight:bold; color:#4CAF50;">アカウント (${currentUser})</span>`;
        } else {
            accountBtn.innerHTML = `💻 <span style="font-size:12px; font-weight:bold;">アカウント設定</span>`;
        }
        accountBtn.onclick = () => this.toggleModal(true, false);
        container.appendChild(accountBtn);

        // 2. クラウド同期ボタン
        if (currentUser) {
            const saveBtn = document.createElement('div');
            saveBtn.className = 'nav-item';
            saveBtn.style = "color:#4CAF50; cursor:pointer; margin-bottom:8px; padding-left:5px;";
            saveBtn.innerHTML = `☁️ <span style="font-size:12px; font-weight:bold;">オンラインに保存</span>`;
            saveBtn.onclick = () => this.cloudSave();
            container.appendChild(saveBtn);

            const loadBtn = document.createElement('div');
            loadBtn.className = 'nav-item';
            loadBtn.style = "color:#2196F3; cursor:pointer; padding-left:5px;";
            loadBtn.innerHTML = `🔄 <span style="font-size:12px; font-weight:bold;">クラウドから復元</span>`;
            loadBtn.onclick = () => this.cloudLoad(false);
            container.appendChild(loadBtn);
        } else {
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
    if (localStorage.getItem('googlo_logged_in_user')) {
        DataManager.cloudLoad(true);
    }
    setTimeout(() => { DataManager.injectUI(); }, 500);
});

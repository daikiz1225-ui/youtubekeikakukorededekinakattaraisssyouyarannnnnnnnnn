/**
 * APIキーの保存・取得を管理する（1ファイル1機能：データ管理）
 */
export const ApiManager = {
    getKeys() {
        const saved = localStorage.getItem('kick_tube_keys');
        const keys = saved ? JSON.parse(saved) : ["", "", "", "", ""];
        console.log("取得されたキー一覧:", keys); // デバッグ用
        return keys;
    },

    saveKeys(keysArray) {
        localStorage.setItem('kick_tube_keys', JSON.stringify(keysArray));
        console.log("キーを保存しました:", keysArray);
    },

    getCurrentIndex() {
        return parseInt(localStorage.getItem('kick_tube_active_index') || "0");
    },

    setCurrentIndex(index) {
        localStorage.setItem('kick_tube_active_index', index.toString());
        console.log("使用するキーの番号を切り替えました:", index);
    },

    getActiveKey() {
        const keys = this.getKeys();
        const index = this.getCurrentIndex();
        const activeKey = keys[index];
        console.log(`現在使用中のキー (Index: ${index}):`, activeKey ? "あり" : "なし(空です)");
        return activeKey;
    }
};

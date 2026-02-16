/**
 * APIキーの保存・取得・選択を管理するモジュール
 */
export const ApiManager = {
    // 保存されている5つのキーを取得（なければ空配列）
    getKeys() {
        const saved = localStorage.getItem('kick_tube_keys');
        return saved ? JSON.parse(saved) : ["", "", "", "", ""];
    },

    // 5つのキーを保存
    saveKeys(keysArray) {
        localStorage.setItem('kick_tube_keys', JSON.stringify(keysArray));
    },

    // 現在選択されているキーの番号（0〜4）を取得
    getCurrentIndex() {
        return parseInt(localStorage.getItem('kick_tube_active_index') || "0");
    },

    // 使うキーを切り替える
    setCurrentIndex(index) {
        localStorage.setItem('kick_tube_active_index', index.toString());
    },

    // 今すぐ使えるキーを1本返す
    getActiveKey() {
        const keys = this.getKeys();
        return keys[this.getCurrentIndex()];
    }
};

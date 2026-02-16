import { InstanceManager } from './instance-manager.js';

/**
 * 設定画面の表示・保存を管理する（1ファイル1機能）
 */
const SettingsManager = {
    modal: null,
    trigger: null,
    saveBtn: null,

    init() {
        this.modal = document.getElementById('settings-modal');
        this.trigger = document.getElementById('settings-trigger');
        this.saveBtn = document.getElementById('save-settings-btn');

        if (this.trigger) {
            this.trigger.addEventListener('click', () => this.open());
            console.log("設定ボタンの監視を開始したぜ");
        }
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => this.save());
        }
    },

    open() {
        const apiInputsContainer = document.getElementById('api-inputs');
        const currentDomain = InstanceManager.getDomain();

        apiInputsContainer.innerHTML = `
            <div style="margin-bottom: 15px; background: #333; padding: 15px; border-radius: 8px;">
                <label style="font-size: 12px; color: #aaa; display: block; margin-bottom: 8px;">Piped インスタンスドメイン</label>
                <input type="text" id="piped-domain" value="${currentDomain}" 
                       placeholder="例: pipedapi.kavin.rocks" 
                       style="width: 100%; background: transparent; border: none; border-bottom: 2px solid #ff0000; color: white; outline: none; padding: 5px 0; font-size: 16px;">
            </div>
        `;
        this.modal.style.display = 'flex';
    },

    save() {
        const domainInput = document.getElementById('piped-domain');
        if (domainInput) {
            InstanceManager.saveDomain(domainInput.value.trim());
            this.modal.style.display = 'none';
            alert("設定を保存したぜ！");
        }
    }
};

// 画面が準備できたら初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SettingsManager.init());
} else {
    SettingsManager.init();
}

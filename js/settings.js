import { InstanceManager } from './instance-manager.js';

const SettingsManager = {
    modal: null,
    trigger: null,
    saveBtn: null,

    init() {
        this.modal = document.getElementById('settings-modal');
        this.trigger = document.getElementById('settings-trigger');
        this.saveBtn = document.getElementById('save-settings-btn');

        if (this.trigger) {
            this.trigger.addEventListener('click', (e) => {
                e.preventDefault();
                this.open();
            });
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
        // クラスを追加して強制的に表示させる
        this.modal.classList.add('active');
        console.log("Modal opened with 'active' class");
    },

    save() {
        const domainInput = document.getElementById('piped-domain');
        if (domainInput) {
            InstanceManager.saveDomain(domainInput.value.trim());
            // クラスを消して隠す
            this.modal.classList.remove('active');
            alert("設定を保存したぜ！");
        }
    }
};

document.addEventListener('DOMContentLoaded', () => SettingsManager.init());

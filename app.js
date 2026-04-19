class App {
    constructor() {
        this.state = {
            ohsa: [], opt: [], medical: [], exercises: [], admins: [], history: [],
            selectedPhase: null, selectedOhsa: [], selectedDiseases: [], draggedItem: null
        };
        document.addEventListener('DOMContentLoaded', () => this.init());
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('phase-select').addEventListener('change', (e) => {
            this.state.selectedPhase = e.target.value;
            // 只要選項改變就重置工作區
            document.getElementById('workspace-area').classList.add('hidden');
            document.getElementById('phase-tip').classList.add('hidden');
        });

        const updateSeletedArrays = () => {
            const ohsaInputs = document.querySelectorAll('#ohsa-options input:checked');
            this.state.selectedOhsa = Array.from(ohsaInputs).map(i => i.value);
            const medInputs = document.querySelectorAll('#medical-options input:checked');
            this.state.selectedDiseases = Array.from(medInputs).map(i => i.value);
            this.applyRecommendationsAndWarnings();
        };

        document.getElementById('ohsa-options').addEventListener('change', updateSeletedArrays);
        document.getElementById('medical-options').addEventListener('change', updateSeletedArrays);

        // 開始點菜
        document.getElementById('start-order-btn').addEventListener('click', () => {
            if (!this.state.selectedPhase) return this.showToast('請先選擇一個 OPT 階段', 'error');
            this.handlePhaseChange();
            document.getElementById('workspace-area').classList.remove('hidden');
            // Hide menu output
            document.getElementById('menu-output-area').classList.add('hidden');
        });

        document.getElementById('clear-menu-btn').addEventListener('click', () => this.handlePhaseChange());

        // Modal: Admin Add
        document.getElementById('admin-add-btn')?.addEventListener('click', () => this.openAdminModal());
        document.getElementById('close-modal-btn')?.addEventListener('click', () => this.closeAdminModal());
        document.getElementById('add-element').addEventListener('change', (e) => {
            const patternSelect = document.getElementById('add-pattern');
            if (e.target.value === '6.阻力') {
                patternSelect.disabled = false; patternSelect.required = true;
            } else {
                patternSelect.disabled = true; patternSelect.required = false; patternSelect.value = 'N/A';
            }
            this.updatePreviewId();
        });
        document.getElementById('add-pattern').addEventListener('change', () => this.updatePreviewId());
        document.getElementById('add-exercise-form').addEventListener('submit', (e) => this.submitNewExercise(e));

        // 確認菜單、儲存與複製
        document.getElementById('confirm-order-btn').addEventListener('click', () => this.generateAndShowMenu());
        document.getElementById('copy-menu-btn').addEventListener('click', () => this.copyMenuText());
        document.getElementById('save-menu-btn').addEventListener('click', () => this.saveMenuToHistory());

        // 歷史紀錄 Modal
        document.getElementById('history-btn').addEventListener('click', () => this.openHistoryModal());
        document.getElementById('close-history-btn').addEventListener('click', () => this.closeHistoryModal());

        this.initDropZones();
    }

    async loadAppData() {
        try {
            const data = await api.fetchAllData();
            this.state = { ...this.state, ...data };
            this.showToast('資料庫同步完成！', 'success');
        } catch (e) {
            this.showToast(`資料載入失敗: ${e.message}`, 'error');
        }
    }

    // --- Phase & Drop Zone ---
    handlePhaseChange() {
        const phase = this.state.selectedPhase;
        if (!phase || this.state.exercises.length === 0) return;
        
        const phaseTip = document.getElementById('phase-tip');
        phaseTip.classList.remove('hidden');
        phaseTip.innerHTML = `準備就緒！針對 <strong>Phase ${phase}</strong> 過濾食材。`;

        this.renderExercisePool();
        this.rebuildResistanceZone();
        this.clearAllDropZones();
        this.updatePoolSelection();
        this.applyRecommendationsAndWarnings();
    }

    rebuildResistanceZone() {
        const phase = parseInt(this.state.selectedPhase);
        const container = document.getElementById('dz-resistance-container');
        const badge = document.getElementById('superset-badge');
        
        container.innerHTML = '';
        if (phase === 2 || phase === 5) {
            badge.classList.remove('hidden');
            container.classList.add('superset');
            this.appendSupersetPair(container, phase);
        } else {
            badge.classList.add('hidden');
            container.classList.remove('superset');
            container.innerHTML = `<div class="drop-zone single-res-zone" data-element="6.阻力"></div>`;
        }
        this.initDropZones();
    }
    
    appendSupersetPair(container, phase) {
        const mod2 = phase === 2 ? '不穩定' : '爆發';
        const index = container.querySelectorAll('.superset-pair').length + 1;
        const pairHTML = `
            <div class="superset-pair" data-pair-idx="${index}">
                <div class="superset-pair-label">超級組 #${index}</div>
                <div class="superset-slot">
                    <span class="slot-label">動作 1 (力量)</span>
                    <div class="drop-zone" data-element="6.阻力" data-slot="1"></div>
                </div>
                <div class="superset-slot">
                    <span class="slot-label">動作 2 (${mod2}) <small>需與上方模式相同</small></span>
                    <div class="drop-zone" data-element="6.阻力" data-slot="2"></div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', pairHTML);
        this.initDropZones();
    }

    clearAllDropZones() {
        document.querySelectorAll('.drop-zone').forEach(zone => zone.innerHTML = '');
        this.updatePoolSelection();
    }

    // --- Renderer ---
    renderExercisePool() {
        const phase = this.state.selectedPhase;
        const container = document.getElementById('accordion-container');
        const phaseDesc = {
            1: "<strong>【此階段的訓練重點】</strong><br>調整動力學鏈恢復基本運動模式，增加協調性，核心肌肉組織活化，脊柱和骨盆小肌肉對齊。在不穩定但可控的環境訓練，逐漸過渡到自由重量或站立訓練。",
            2: "<strong>【此階段的訓練重點】</strong><br>此階段為由穩定進階到力量之間的橋梁。<br>請評估後再開始此階段。<br>可改善肌肉力量、預防II糖尿病、改善胰島素敏感性、改善骨密度、增加新陳代謝、降低血壓和體脂<br><br>建議進行2-6周",
            3: "<strong>【此階段的訓練重點】</strong><br>適應最大肌肉生長，高水平的訓練總量和強度迫使肌肉整理增加<br><br>建議進行 2-6 周",
            4: "<strong>【此階段的訓練重點】</strong><br>著重於增加重量和組數、提高對身體施加的負荷、改善肌節的募集和生產率<br><br>適合具備良好運動基礎、長期訓練、沒有嚴重關節炎發作且血壓控制非常穩定的「進階/活躍型銀髮族」，才能在教練嚴密監控下進行此階段。",
            5: "<strong>【此階段的訓練重點】</strong><br>提高肌肉收縮的速度、增加活化肌節的數量<br>爆發力是隨著年齡增長流失最快的能力，甚至比純肌力的流失還要快！<br>對於銀髮族來說，爆發力訓練的目的為了絆倒後的穩定身體反應。<br>只有在前四個階段打下堅實基礎的「活躍型長者」才能進行。"
        };
        document.getElementById('pool-status-text').innerHTML = phaseDesc[phase] || `顯示 Phase ${phase} 的合適動作`;
        container.innerHTML = '';
        
        const filtered = this.state.exercises.filter(ex => {
            if (!ex['適用階段']) return false;
            return ex['適用階段'].split(',').map(s => s.trim()).includes(phase);
        });

        const groups = {};
        filtered.forEach(ex => {
            // 支援 1.暖身/7.緩和 同時出現在兩個分類
            const elements = ex['訓練元素'].split('/').map(e => e.trim());
            elements.forEach(element => {
                if (element === '6.阻力') {
                    const pattern = ex['阻力模式'];
                    const modality = ex['動作形式'];
                    const key1 = `6.阻力 - ${pattern}`;
                    if (!groups[key1]) groups[key1] = { isSubGroups: true, sub: {} };
                    if (!groups[key1].sub[modality]) groups[key1].sub[modality] = [];
                    groups[key1].sub[modality].push(ex);
                } else {
                    if (!groups[element]) groups[element] = { isSubGroups: false, items: [] };
                    groups[element].items.push(ex);
                }
            });
        });

        Object.keys(groups).sort().forEach(key => {
            let bodyHTML = '';
            if (groups[key].isSubGroups) {
                for (let mod in groups[key].sub) {
                    bodyHTML += `<div style="margin: 8px 0; padding-left: 8px; border-left: 2px solid var(--border-color);">
                        <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 4px;">動作形式：${mod}</div>`;
                    groups[key].sub[mod].forEach(ex => bodyHTML += this.createCardHTML(ex));
                    bodyHTML += `</div>`;
                }
            } else {
                groups[key].items.forEach(ex => bodyHTML += this.createCardHTML(ex));
            }
            this.createAccordionItem(container, key, bodyHTML);
        });

        this.bindDragEventsToCards();
        this.bindAddButtons();
    }

    createCardHTML(ex) {
        const strObj = encodeURIComponent(JSON.stringify(ex));
        return `
            <div class="exercise-card" draggable="true" data-ex="${strObj}" id="card-${ex['動作ID']}">
                <div class="exercise-info">
                    <div class="card-title">
                        <span>${ex['動作名稱']}</span>
                        <span class="recommend-star hidden" title="AI推薦"><i class="fa-solid fa-star star-recommended"></i></span>
                    </div>
                    <span class="card-desc">ID: ${ex['動作ID']} | 目標: ${ex['目標肌群']}</span>
                    <div class="card-warnings hidden"></div>
                </div>
                <!-- 針對跨裝置友善的點擊按鈕 -->
                <button class="add-to-menu-btn" title="快送入菜"><i class="fa-solid fa-plus"></i></button>
            </div>
        `;
    }

    createAccordionItem(container, title, bodyHTML) {
        const item = document.createElement('div');
        item.className = 'accordion-item';
        item.innerHTML = `
            <div class="accordion-header"><span>${title}</span> <i class="fa-solid fa-chevron-down"></i></div>
            <div class="accordion-body">${bodyHTML}</div>
        `;
        item.querySelector('.accordion-header').addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            container.querySelectorAll('.accordion-item').forEach(el => el.classList.remove('active'));
            if (!isActive) item.classList.add('active');
        });
        container.appendChild(item);
    }

    // --- Recommendations ---
    applyRecommendationsAndWarnings() {
        if (!this.state.selectedPhase) return;
        let overactive = new Set();
        let underactive = new Set();
        this.state.selectedOhsa.forEach(rule => {
            const logic = this.state.ohsa.find(o => o['觀察現象'] === rule);
            if (logic) {
                logic['過度活躍肌肉'].split(',').forEach(m => overactive.add(m.trim()));
                logic['活動不足肌肉'].split(',').forEach(m => underactive.add(m.trim()));
            }
        });

        let activeRules = this.state.selectedDiseases.map(dis => this.state.medical.find(m => m['慢性病名稱'] === dis)).filter(Boolean);

        document.querySelectorAll('.exercise-card').forEach(card => {
            if(!card.getAttribute('data-ex')) return;
            const exData = JSON.parse(decodeURIComponent(card.getAttribute('data-ex')));
            const targetMuscles = exData['目標肌群'];
            const element = exData['訓練元素'];
            
            let recommended = false;
            if (element.includes('暖身') || element.includes('緩和')) {
                if (Array.from(overactive).some(m => targetMuscles.includes(m))) recommended = true;
            } else if (element.includes('核心') || element.includes('平衡')) {
                if (Array.from(underactive).some(m => targetMuscles.includes(m))) recommended = true;
            }
            
            const star = card.querySelector('.recommend-star');
            if (recommended) {
                star.classList.remove('hidden');
                card.style.borderLeftColor = "var(--secondary-color)"; card.style.background = "#fffdf7";
            } else {
                star.classList.add('hidden');
                card.style.borderLeftColor = "var(--primary-color)"; card.style.background = "#fff";
            }

            const tagsField = exData['疾病禁忌標籤'] || '';
            const warningContainer = card.querySelector('.card-warnings');
            warningContainer.innerHTML = ''; warningContainer.classList.add('hidden');
            
            activeRules.forEach(rule => {
                if (tagsField.includes(`[${rule['慢性病名稱']}]`) || tagsField.includes(`[骨鬆]`)) {
                    if (rule['慢性病名稱'] === '骨質疏鬆' && !tagsField.includes('骨質疏鬆') && !tagsField.includes('骨鬆')) return;
                    warningContainer.insertAdjacentHTML('beforeend', `<div class="medical-warning"><i class="fa-solid fa-triangle-exclamation"></i> <span><b>${rule['慢性病名稱']}禁忌：</b><br>${rule['嚴禁行為']}<br><i>建議: ${rule['修改建議']}</i></span></div>`);
                    warningContainer.classList.remove('hidden');
                }
            });
        });
    }

    // --- Drag & Drop ---
    bindDragEventsToCards() {
        document.querySelectorAll('.exercise-card:not(.dropped)').forEach(card => {
            card.addEventListener('dragstart', (e) => {
                this.state.draggedItem = e.currentTarget;
                setTimeout(() => e.currentTarget.style.opacity = '0.5', 0);
            });
            card.addEventListener('dragend', (e) => {
                this.state.draggedItem = null;
                e.currentTarget.style.opacity = '1';
                document.querySelectorAll('.drop-zone-wrapper').forEach(z => z.classList.remove('drag-over'));
            });
        });
    }
    
    bindAddButtons() {
        document.querySelectorAll('.add-to-menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = e.currentTarget.closest('.exercise-card');
                const exData = JSON.parse(decodeURIComponent(card.getAttribute('data-ex')));
                this.smartAddExercise(exData);
            });
        });
    }

    initDropZones() {
        document.querySelectorAll('.drop-zone:not(.bound)').forEach(zone => {
            zone.classList.add('bound');
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.closest('.drop-zone-wrapper').classList.add('drag-over');
            });
            zone.addEventListener('dragleave', (e) => {
                zone.closest('.drop-zone-wrapper').classList.remove('drag-over');
            });
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.closest('.drop-zone-wrapper').classList.remove('drag-over');
                if (!this.state.draggedItem) return;
                const exData = JSON.parse(decodeURIComponent(this.state.draggedItem.getAttribute('data-ex')));
                this.handleDrop(zone, exData);
            });
        });
    }

    smartAddExercise(ex) {
        const expectedElement = ex['訓練元素']; // e.g. "1.暖身/7.緩和" or "6.阻力"
        
        // Find possible zones where this exercise belongs
        let possibleZones = [];
        document.querySelectorAll('.drop-zone').forEach(z => {
            let zoneEle = z.getAttribute('data-element');
            if (expectedElement.includes(zoneEle)) possibleZones.push(z);
        });
        
        if (possibleZones.length === 0) return this.showToast('無法找到這個階段的適合區塊', 'error');
        
        let targetZone = possibleZones[0];
        
        // For supersets finding an empty slot
        if (expectedElement.includes('6.阻力')) {
             const phase = parseInt(this.state.selectedPhase);
             if (phase === 2 || phase === 5) {
                 const emptyZone = possibleZones.find(z => z.innerHTML.trim() === '');
                 if (emptyZone) targetZone = emptyZone;
                 else targetZone = possibleZones[possibleZones.length - 1]; // Let handleDrop spawn a new pair if full
             }
        }
        
        this.handleDrop(targetZone, ex);
    }

    handleDrop(zone, exData) {
        const expectedElement = zone.getAttribute('data-element');
        const actualElement = exData['訓練元素'];

        // Dual item (like 暖身/緩和) logic parsing
        if (!actualElement.includes(expectedElement)) {
            return this.showToast(`錯誤：此處僅接受 ${expectedElement} 的動作！`, 'error');
        }

        // Check if the exercise already exists in the same drop zone
        const existingCards = zone.querySelectorAll('.exercise-card');
        for (let i = 0; i < existingCards.length; i++) {
            const existingData = JSON.parse(decodeURIComponent(existingCards[i].getAttribute('data-ex')));
            if (existingData['動作ID'] === exData['動作ID']) {
                return this.showToast(`錯誤：此動作已存在本區塊中！`, 'error');
            }
        }

        const phase = parseInt(this.state.selectedPhase);
        let currentPair = null;

        if (expectedElement === '6.阻力' && (phase === 2 || phase === 5)) {
            const slot = parseInt(zone.getAttribute('data-slot'));
            const actualPattern = exData['阻力模式'];
            const actualModality = exData['動作形式'];
            
            if (phase === 2) {
                if (slot === 1 && actualModality !== '力量') return this.showToast(`Phase 2 等一格(力量)動作違規！`);
                if (slot === 2 && actualModality !== '不穩定') return this.showToast(`Phase 2 第二格(不穩定)動作違規！`);
            }
            if (phase === 5) {
                if (slot === 1 && actualModality !== '力量') return this.showToast(`Phase 5 第一格(力量)動作違規！`);
                if (slot === 2 && actualModality !== '爆發') return this.showToast(`Phase 5 第二格(爆發)動作違規！`);
            }
            
            // Check cross-slot Pattern mismatch
            const otherSlotLabel = slot === 1 ? '2' : '1';
            currentPair = zone.closest('.superset-pair');
            const otherZone = currentPair.querySelector(`.drop-zone[data-slot="${otherSlotLabel}"]`);
            if (otherZone.querySelector('.exercise-card')) {
                const otherDataRaw = otherZone.querySelector('.exercise-card').getAttribute('data-ex');
                const otherData = JSON.parse(decodeURIComponent(otherDataRaw));
                if (otherData['阻力模式'] !== actualPattern) {
                     return this.showToast(`超級組錯誤：與力量動作的【阻力模式】必須對齊！`, 'error');
                }
            }
            
            // Replace if slot is occupied in superset
            zone.innerHTML = '';
        }

        // Multi placement: Instead of zone.innerHTML='', we append
        const cloneHTML = this.createCardHTML(exData);
        zone.insertAdjacentHTML('beforeend', cloneHTML);
        
        // The newly added card
        const allNewCards = zone.querySelectorAll('.exercise-card');
        const addedCard = allNewCards[allNewCards.length - 1]; // last appended
        addedCard.classList.add('dropped');
        addedCard.removeAttribute('draggable');
        addedCard.querySelector('.add-to-menu-btn').remove(); // remove + btn
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn'; removeBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
        removeBtn.onclick = () => {
             addedCard.remove();
             this.updatePoolSelection();
        };
        addedCard.appendChild(removeBtn);

        // Vars
        const varsObj = this.state.opt.find(o => o['OPT階段'] === this.getPhaseFullLabel(phase) && o['訓練元素'] === expectedElement);
        if (varsObj) {
            addedCard.querySelector('.exercise-info').insertAdjacentHTML('beforeend', `<div class="exercise-variables">
                <div class="var-item">組數: <strong>${varsObj['組數']}</strong> </div>
                <div class="var-item">次數: <strong>${varsObj['次數']}</strong> </div>
                <div class="var-item">節奏: <strong>${varsObj['節奏']}</strong> </div>
                <div class="var-item">休息: <strong>${varsObj['休息時間']}</strong> </div>
            </div>`);
        }
        
        // Superset Extender Logic
        if (currentPair) {
            const hasSlot1 = currentPair.querySelector('.drop-zone[data-slot="1"]').children.length > 0;
            const hasSlot2 = currentPair.querySelector('.drop-zone[data-slot="2"]').children.length > 0;
            
            // If both are filled, and this is the LAST pair, spawn a new one implicitly
            const container = document.getElementById('dz-resistance-container');
            const pairs = container.querySelectorAll('.superset-pair');
            if (hasSlot1 && hasSlot2 && currentPair === pairs[pairs.length - 1]) {
                this.appendSupersetPair(container, phase);
            }
        }
        
        this.applyRecommendationsAndWarnings();
        this.updatePoolSelection();
    }
    
    getPhaseFullLabel(phaseInt) {
        return { 1:"1.穩定度", 2:"2.力量耐力", 3:"3.增肌", 4:"4.最大力量", 5:"5.爆發力" }[phaseInt];
    }

    // --- Generate Text and Save ---
    generateAndShowMenu() {
        const area = document.getElementById('menu-output-area');
        area.classList.remove('hidden');
        
        let text = `【老派健身食堂 - 鍛鍊菜色 Phase ${this.state.selectedPhase}】\n由 ${authManager.userData?.name || '教練'} 開立\n\n`;
        let counter = 1;
        
        document.querySelectorAll('.drop-zone-wrapper').forEach(wrapper => {
            const headerText = wrapper.querySelector('.drop-header').innerText.trim().replace(/\(.*?\)/g, "").trim();
            const cards = wrapper.querySelectorAll('.exercise-card');
            
            if (cards.length > 0) {
                text += `=== ${headerText} ===\n`;
                
                // If this is a superset wrapper we want to group items
                if (wrapper.classList.contains('resistance-wrapper') && wrapper.querySelector('.superset-pair')) {
                    wrapper.querySelectorAll('.superset-pair').forEach(pair => {
                        const c1 = pair.querySelector('.drop-zone[data-slot="1"] .exercise-card');
                        const c2 = pair.querySelector('.drop-zone[data-slot="2"] .exercise-card');
                        if (c1 || c2) {
                            text += `[超級組]\n`;
                            [c1, c2].forEach(c => {
                                if (c) text += this.formatCardText(c);
                            });
                        }
                    });
                } else {
                    cards.forEach(card => text += this.formatCardText(card));
                }
                text += '\n';
            }
        });
        
        document.getElementById('menu-text-output').value = text;
        
        // Scroll down gently
        setTimeout(() => area.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    }
    
    formatCardText(card) {
        const data = JSON.parse(decodeURIComponent(card.getAttribute('data-ex')));
        const title = data['動作名稱'];
        const vars = card.querySelector('.exercise-variables');
        if (vars) {
            const sets = vars.querySelector('.var-item:nth-child(1) strong').innerText;
            const reps = vars.querySelector('.var-item:nth-child(2) strong').innerText;
            return `- ${title} (${sets}組 x ${reps})\n`;
        }
        return `- ${title}\n`;
    }

    copyMenuText() {
        const ta = document.getElementById('menu-text-output');
        ta.select();
        document.execCommand('copy');
        this.showToast('✅ 菜單已複製到剪貼簿！', 'success');
    }

    async saveMenuToHistory() {
        const text = document.getElementById('menu-text-output').value;
        if (!text) return this.showToast('空菜單無法儲存', 'error');
        
        const btn = document.getElementById('save-menu-btn');
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 處理中...`;
        
        try {
            const uuid = 'MENU_' + Date.now().toString().slice(-6);
            const user = authManager.userData?.name || 'Unknown';
            const dateStr = new Date().toLocaleString('zh-TW');
            
            await api.appendMenuHistory([uuid, user, dateStr, text]);
            this.showToast('菜單已儲存至試算表！', 'success');
            
            // Reload payload to cache new history item
            await this.loadAppData();
        } catch (e) {
            this.showToast(`儲存歷史錯誤: ${e.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> 儲存歷史紀錄`;
        }
    }

    // --- History Modal Views ---
    openHistoryModal() {
        const modal = document.getElementById('history-modal');
        modal.classList.remove('hidden');
        this.renderHistoryList();
    }
    
    closeHistoryModal() {
        document.getElementById('history-modal').classList.add('hidden');
    }
    
    renderHistoryList() {
        const container = document.getElementById('history-list-container');
        container.innerHTML = '';
        
        if (!this.state.history || this.state.history.length === 0) {
            container.innerHTML = '<p style="padding: 20px;">尚無歷史菜色紀錄。</p>';
            return;
        }

        // Render backwards to show newest first
        const reverseHistory = [...this.state.history].reverse();
        
        reverseHistory.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-content">
                    <div class="history-date">${item['建立時間'] || '未知日期'} <span style="font-size:12px; color:#aaa; font-weight:normal;">[${item['菜單ID']}]</span></div>
                    <div class="history-author"><i class="fa-solid fa-user-pen"></i> 開立教練: ${item['建立者'] || '無名氏'}</div>
                    <div class="history-text">${item['總結文字內容']}</div>
                </div>
            `;
            
            if (authManager.isAdmin) {
                const delBtn = document.createElement('button');
                delBtn.className = 'btn btn-outline danger';
                delBtn.style.marginLeft = '16px';
                delBtn.title = '刪除此帳單';
                delBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
                
                delBtn.onclick = async () => {
                    if(!confirm('確認要刪除此筆記錄嗎？這會直接修改 Google Sheet。')) return;
                    try {
                        div.style.opacity = '0.5';
                        await api.deleteMenuHistoryRow(item._rowIndex);
                        this.showToast('已刪除一筆歷史', 'success');
                        await this.loadAppData(); // refresh
                        this.renderHistoryList();
                    } catch (e) {
                         this.showToast(e.message, 'error');
                         div.style.opacity = '1';
                    }
                };
                div.appendChild(delBtn);
            }
            container.appendChild(div);
        });
    }

    // --- Admin Add Specific Logic ---
    openAdminModal() {
        document.getElementById('admin-modal').classList.remove('hidden');
        document.getElementById('add-exercise-form').reset();
        document.getElementById('preview-id-text').innerText = '--';
        document.getElementById('add-pattern').disabled = true;
        
        const musclesSet = new Set();
        this.state.ohsa.forEach(o => {
            o['過度活躍肌肉'].split(',').forEach(m => musclesSet.add(m.trim()));
            o['活動不足肌肉'].split(',').forEach(m => musclesSet.add(m.trim()));
        });
        const musclesContainer = document.getElementById('add-muscles');
        musclesContainer.innerHTML = '';
        Array.from(musclesSet).sort().forEach(m => {
            if(!m) return;
            const span = document.createElement('span'); span.className = 'muscle-tag'; span.innerText = m;
            span.onclick = () => span.classList.toggle('selected');
            musclesContainer.appendChild(span);
        });
    }

    closeAdminModal() { document.getElementById('admin-modal').classList.add('hidden'); }

    updatePreviewId() {
        const element = document.getElementById('add-element').value;
        const pattern = document.getElementById('add-pattern').value;
        if (!element) return;
        
        let prefix = 'X';
        if (element.includes('暖身')) prefix = 'W';
        if (element.includes('核心')) prefix = 'C';
        if (element.includes('平衡')) prefix = 'B';
        if (element.includes('增強式')) prefix = 'P';
        if (element.includes('SAQ')) prefix = 'S';
        if (element.includes('阻力')) {
            switch(pattern) {
                case '蹲': prefix = 'R1'; break;
                case '髖鉸鏈': prefix = 'R2'; break;
                case '推': prefix = 'R3'; break;
                case '拉': prefix = 'R4'; break;
                case '舉': prefix = 'R5'; break;
                default: prefix = 'R0';
            }
        }
        
        let maxNum = 0;
        this.state.exercises.forEach(ex => {
            const id = ex['動作ID'] || '';
            if (id.startsWith(prefix)) {
                const numPart = parseInt(id.replace(prefix, ''), 10);
                if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
            }
        });
        document.getElementById('preview-id-text').innerText = prefix + (maxNum < 100 && prefix.length === 1 ? '0' : '') + String(maxNum + 1).padStart(2, '0');
    }

    async submitNewExercise(e) {
        e.preventDefault();
        const id = document.getElementById('preview-id-text').innerText;
        if (!id || id === '--') return this.showToast('無法預覽 ID', 'error');
        
        const rowData = [
            id,
            document.getElementById('add-name').value,
            document.getElementById('add-element').value,
            document.getElementById('add-element').value !== '6.阻力' ? 'N/A' : document.getElementById('add-pattern').value,
            document.getElementById('add-modality').value,
            Array.from(document.querySelectorAll('input[name="phase"]:checked')).map(i => i.value).join(','),
            Array.from(document.querySelectorAll('.muscle-tag.selected')).map(t => t.innerText).join(', '),
            Array.from(document.querySelectorAll('#add-tags input:checked')).map(i => `[${i.value}]`).join(', '),
            document.getElementById('add-notes').value
        ];
        
        if (!rowData[6]) return this.showToast('必須至少選擇一個目標肌群', 'error');
        
        const btn = document.getElementById('submit-exercise-btn'); btn.disabled = true; btn.innerText = '處理中...';
        try {
            await api.appendExercise(rowData);
            this.showToast('加菜成功！', 'success');
            this.closeAdminModal();
            await this.loadAppData();
            if(!document.getElementById('workspace-area').classList.contains('hidden')) this.handlePhaseChange();
        } catch (err) { this.showToast(err.message, 'error'); } 
        finally { btn.innerText = '寫入 Google Sheet'; btn.disabled = false; }
    }

    // --- Utils ---
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-xmark-circle' : 'fa-info-circle'}"></i> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
    }
    
    setLoading(isLoading) { document.getElementById('loading-overlay').classList.toggle('hidden', !isLoading); }
    
    resetApp() {
        this.state = { ohsa: [], opt: [], medical: [], exercises: [], admins: [], history: [], selectedPhase: null, selectedOhsa: [], selectedDiseases: [], draggedItem: null };
        document.getElementById('phase-select').value = "";
        document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
        document.getElementById('workspace-area').classList.add('hidden');
        document.getElementById('history-btn').classList.add('hidden');
        this.clearAllDropZones();
    }

    updatePoolSelection() {
        // Collect all IDs currently in the right menu
        const inMenuIds = new Set();
        document.querySelectorAll('#menu-container .exercise-card').forEach(card => {
            const data = JSON.parse(decodeURIComponent(card.getAttribute('data-ex')));
            inMenuIds.add(data['動作ID']);
        });

        // Update classes on the left side pool
        document.querySelectorAll('#accordion-container .exercise-card').forEach(card => {
            const data = JSON.parse(decodeURIComponent(card.getAttribute('data-ex')));
            if (inMenuIds.has(data['动作ID']) || inMenuIds.has(data['動作ID'])) { // account for sim/trad
                card.classList.add('in-menu');
            } else {
                card.classList.remove('in-menu');
            }
        });
    }
}

window.app = new App();

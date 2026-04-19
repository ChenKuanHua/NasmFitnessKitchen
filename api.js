class SheetsAPI {
    constructor() {
        this.token = null;
    }
    
    setToken(token) {
        this.token = token;
    }

    async fetchAllData() {
        if (!this.token) throw new Error("無授權 Token");
        
        const ranges = [
            'OHSA_Logic!A:C',
            'OPT_Variables!A:G',
            'Medical_Precautions!A:C',
            'Exercise_Library!A:I',
            'Admins!A:B',
            'Menu_History!A:D'
        ];
        
        let url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values:batchGet?`;
        ranges.forEach((r, idx) => {
            url += `ranges=${encodeURIComponent(r)}&`;
        });
        // Remove trailing & if needed, fetch deals with it fine if it's the last char? Actually better to cleanly join.
        url = url.replace(/&$/, '');
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error.message || "讀取資料庫失敗");
        }
        
        const data = await response.json();
        return this.parseBatchData(data.valueRanges);
    }
    
    parseBatchData(valueRanges) {
        const ohsa = this.arrayToObjects(valueRanges[0]?.values);
        const opt = this.arrayToObjects(valueRanges[1]?.values);
        const medical = this.arrayToObjects(valueRanges[2]?.values);
        const exercises = this.arrayToObjects(valueRanges[3]?.values);
        const admins = this.arrayToObjects(valueRanges[4]?.values);
        
        // 為了支援刪除，我們在 History 注入它在試算表上的絕對 Row 行號 (startIndex = 1 代表第二列，因為0是標題列)
        const history = this.arrayToObjects(valueRanges[5]?.values, true);
        
        return { ohsa, opt, medical, exercises, admins, history };
    }
    
    arrayToObjects(arr, includeRowIndex = false) {
        if (!arr || arr.length < 2) return [];
        const headers = arr[0];
        return arr.slice(1).map((row, idx) => {
            let obj = {};
            headers.forEach((header, index) => {
                obj[header.trim()] = row[index] ? row[index].trim() : '';
            });
            if (includeRowIndex) {
                // headers 是 row 0, 第 1 筆 data 是 row 1
                obj['_rowIndex'] = idx + 1; 
            }
            return obj;
        });
    }

    async appendExercise(exerciseArray) {
        if (!this.token) throw new Error("無授權 Token");
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/Exercise_Library!A:I:append?valueInputOption=USER_ENTERED`;
        
        const response = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [exerciseArray] }) });
        if (!response.ok) throw new Error((await response.json()).error.message || "寫入資料庫失敗");
        return await response.json();
    }

    async appendMenuHistory(historyArray) {
        if (!this.token) throw new Error("無授權 Token");
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/Menu_History!A:D:append?valueInputOption=USER_ENTERED`;
        
        const response = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [historyArray] }) });
        if (!response.ok) throw new Error((await response.json()).error.message || "儲存歷史菜單失敗");
        return await response.json();
    }

    async deleteMenuHistoryRow(rowIndex) {
        if (!this.token) throw new Error("無授權 Token");

        // 1. 取得 Menu_History 的 numerical sheetId
        const infoRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}?fields=sheets.properties`, {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });
        if (!infoRes.ok) throw new Error("無法取得表格 Metadata");

        const info = await infoRes.json();
        const historySheet = info.sheets.find(s => s.properties.title === 'Menu_History');
        if (!historySheet) throw new Error("找不到 Menu_History 工作表");
        
        const sheetId = historySheet.properties.sheetId;

        // 2. 進行 batchUpdate 刪除 Row
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}:batchUpdate`;
        const payload = {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId: sheetId,
                        dimension: "ROWS",
                        startIndex: rowIndex, // startIndex is inclusive
                        endIndex: rowIndex + 1 // endIndex is exclusive
                    }
                }
            }]
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) throw new Error((await res.json()).error.message || "刪除歷史記錄失敗");
    }
}

const api = new SheetsAPI();

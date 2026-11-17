// Apps Script Web App havolasi (/exec bilan tugaydi). Lokal sinovda dev-server ishlatiladi.
window.CONFIG = { API_URL: (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? '/api' : 'PASTE_APPS_SCRIPT_EXEC_URL' };

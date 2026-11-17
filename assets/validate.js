/* FIO va guruh tekshiruvi — server (Code.gs) bilan bir xil qoidalar */
(function () {
  const BAD = ['test','asd','asdf','qwerty','qwe','abc','aaa','ism','familiya','name','student','talaba','user','admin','xxx','nomalum','неизвестно','тест','йцукен','fio','фио','familiya ism'];
  const KB = ['qwer','wert','erty','asdf','sdfg','dfgh','zxcv','xcvb','йцук','цуке','фыва','ывап','ячсм'];
  const CYR = /[А-Яа-яЁёЎўҚқҒғҲҳ]/, LAT = /[A-Za-z]/;
  function cleanFio(raw) { return String(raw || '').replace(/\s+/g, ' ').trim(); }
  function validFio(raw) {
    const s = cleanFio(raw);
    if (s.length < 5 || s.length > 60) return false;
    if (!/^[A-Za-zА-Яа-яЁёЎўҚқҒғҲҳ'ʻʼ‘’\- ]+$/.test(s)) return false;
    const w = s.split(' '); if (w.length < 2 || w.length > 4) return false;
    if (BAD.indexOf(s.toLowerCase()) >= 0) return false;
    for (const x of w) {
      const l = x.replace(/['ʻʼ‘’\-]/g, ''); if (l.length < 2) return false;
      if (BAD.indexOf(l.toLowerCase()) >= 0) return false;
      if (LAT.test(l) && CYR.test(l)) return false;
      if (!/[aeiouаеёиоуыэюяўAEIOUАЕЁИОУЫЭЮЯЎ]/.test(l)) return false;
      if (/(.)\1\1/i.test(l)) return false;
      const lw = l.toLowerCase(); if (KB.some(k => lw.indexOf(k) >= 0)) return false;
    }
    return true;
  }
  function prettyFio(raw) {
    return cleanFio(raw).split(' ').map(w => /^(o'g'li|o‘g‘li|qizi|ugli|кизи|угли|оглу)$/i.test(w) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  function validGroup(g) {
    const s = String(g || '').trim();
    return s.length >= 2 && s.length <= 15 && /^[A-Za-zА-Яа-яЁё]/.test(s) && /\d/.test(s) && /^[A-Za-zА-Яа-яЁё0-9\-\/ ]+$/.test(s);
  }
  window.Validate = { validFio, prettyFio, validGroup, cleanFio };
})();

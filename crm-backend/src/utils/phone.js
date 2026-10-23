// Kisi bhi format ke number ko 91XXXXXXXXXX me badalta hai
function normalizePhone(input) {
  if (!input) return '';
  let num = String(input).replace(/\D/g, '');
  if (num.startsWith('0')) num = num.slice(1);
  if (num.length === 10) num = '91' + num;
  return num;
}

function isValidPhone(num) {
  return /^91[6-9]\d{9}$/.test(num);
}

module.exports = { normalizePhone, isValidPhone };

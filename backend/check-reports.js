const fs = require('fs');
const history = JSON.parse(fs.readFileSync(__dirname + '/report-history.json','utf8'));
const mobile = '+919767676738';
let count = 0;
const byType = {};
Object.values(history.leads || {}).forEach(function(lead) {
  (lead.reports || []).forEach(function(r) {
    const m = String((r.mobile || lead.mobile || '')).replace(/\s+/g,'');
    if (m === mobile) {
      count++;
      if (!byType[r.quizType]) byType[r.quizType] = 0;
      byType[r.quizType]++;
    }
  });
});
console.log('Total reports for', mobile, ':', count);
console.log('By type:', JSON.stringify(byType, null, 2));

const http = require('http');

const body = JSON.stringify({ name: 'Dinesh Wadhwani', phone: '+919767676738' });
const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/analyze-transformation',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const d = JSON.parse(data);
        console.log('status:', res.statusCode);
        console.log('sourceReports count (returned to client):', (d.sourceReports || []).length);
        console.log('snapshot totalAssessmentsAnalysed:', d.assessmentSnapshot && d.assessmentSnapshot.totalAssessmentsAnalysed);
        console.log('style attemptCount:', d.assessmentSnapshot && d.assessmentSnapshot.style && d.assessmentSnapshot.style.attemptCount);
        console.log('executiveSummary start:', String((d.plan && d.plan.executiveSummary) || '').slice(0, 150));
    });
});
req.on('error', e => { console.error('error:', e.message); process.exit(1); });
req.write(body);
req.end();

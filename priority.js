// 優先度エンジン：配点・境界値は暫定仕様
const rankOrder = ['s','s-minus','a-plus','a','b','c','d','e'];
const rankLabels = ['S','S−','A+','A','B','C','D','E'];
function calculatePriority(task, capacity, now = new Date()) {
    const importance = {'特級':350,'高':280,'中':210,'低':105,'任意':0}[task.importance];
    // 日付指定の期限はその日の終了時刻（ローカル時刻）
    const deadline = task.due ? new Date(task.due.includes('T')?task.due:task.due+'T23:59:59.999') : null;
    const d = deadline ? (deadline-now)/86400000 : Infinity;
    const late = Math.max(0,-d);
    const urgency = deadline ? 350*Math.exp(-Math.max(0,d)/4) : 0;
    const workload = !deadline ? 0 : d<=0 ? 300 : 300*Math.min(1,task.minutes/(capacity*d));
    const penalty = deadline ? 250*(1-Math.exp(-late/5)) : 0;
    const raw = importance+urgency+workload+penalty;
    const cap = task.importance==='任意'?249:task.importance==='低'?(late>=7?899:799):task.importance==='中'?899:1000;
    const score = Math.round(Math.min(cap,Math.max(task.importance==='特級'?650:0,raw)));
    const rank = task.importance==='中' && late>=3 && score>=850 ? 's-minus' : score>=900?'s':score>=800?'a-plus':score>=650?'a':score>=450?'b':score>=250?'c':score>=100?'d':'e';
    return {score,raw,rank,late,d,overdue:late>0,importance,urgency,workload,penalty};
}

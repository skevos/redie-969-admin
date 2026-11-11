// Builds the "Ενημέρωση από Radio.co" bookmarklet. It runs on studio.radio.co (where the user is
// signed in), reads the last 35 days hour by hour from Radio.co's own statistics, sums them per
// Athens day and sends them to the dashboard. No password ever leaves Radio.co.
export function buildRadiocoBookmarklet(dashboardOrigin: string, token: string): string {
  const src = `(async()=>{try{
if(!/studio\\.radio\\.co$/.test(location.hostname)){alert('Ανοίξτε πρώτα το studio.radio.co και πατήστε ξανά.');return;}
var m=location.pathname.match(/stations\\/([a-z0-9]+)/i);var st=m?m[1]:'s11d4ceafa';
var end=new Date(),start=new Date(end.getTime()-35*864e5);
var r=await fetch('/api/v1/stations/'+st+'/stats/query/reports',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({reports:[{name:'aggregate',type:'time-series',parameters:{epoch:'hour'}}],date_range:{start:start.toUTCString(),end:end.toUTCString()}})});
if(!r.ok){alert('Radio.co: '+r.status+' — συνδεθείτε ξανά στο Radio.co.');return;}
var j=await r.json();var rows=(j.reports&&j.reports[0]&&j.reports[0].rows)||[];
var fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Athens',year:'numeric',month:'2-digit',day:'2-digit'});
var D={};rows.forEach(function(h){var d=fmt.format(new Date(h.epoch));var o=D[d]||(D[d]={day:d,sessions:0,unknown:0,peak:0,unique:0,ttsl_by_region:{},clients:{}});
o.sessions+=h.total_listeners||0;o.unique+=h.unique_listeners||0;o.peak=Math.max(o.peak,h.peak_listeners||0);
(h.regions||[]).forEach(function(g){o.ttsl_by_region[g.region]=(o.ttsl_by_region[g.region]||0)+(g.ttsl||0);});
(h.clients||[]).forEach(function(c){if(c.client==='Unknown')o.unknown+=c.total||0;else o.clients[c.client]=(o.clients[c.client]||0)+(c.total||0);});});
var days=Object.values(D).filter(function(o){return o.sessions>0;});
var p=await fetch('${dashboardOrigin}/api/radioco/import',{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({token:'${token}',days:days})});
var a=await p.json().catch(function(){return{}});
alert(p.ok?'✅ REDIE 969: ενημερώθηκαν '+a.days+' ημέρες ('+a.from+' έως '+a.to+')':'❌ '+(a.error||p.status));
}catch(e){alert('❌ '+e);}})();`;
  return 'javascript:' + encodeURIComponent(src.replace(/\n/g, ''));
}

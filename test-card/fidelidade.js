'use strict';
// Recebo os intervalos e os valores preparados em pipeline/fidelity.py.
// Seleciono campanhas inteiras nos controles, sem cortar por mês.
let fidelityMode='ultimo',fidelityFirst='',fidelityLast='',fidelityCompareFirst='',fidelityCompareLast='';
function fidelityPeriods(){return DB.fidelity?.periods||[];}
function fidelitySelection(){
 const ps=fidelityPeriods(),n=ps.length;if(!n)return {current:[],previous:[]};
 if(fidelityMode==='personalizado'){
  const choose=(a,b)=>{const i=ps.findIndex(p=>p.end===a),j=ps.findIndex(p=>p.end===b);return i>=0&&j>=i?ps.slice(i,j+1):[];};
  return {current:choose(fidelityFirst||ps.at(-1).end,fidelityLast||ps.at(-1).end),previous:choose(fidelityCompareFirst||ps.at(-2)?.end,fidelityCompareLast||ps.at(-2)?.end)};
 }
 const count=fidelityMode==='dois'?2:1;
 return {current:ps.slice(Math.max(0,n-count)),previous:ps.slice(Math.max(0,n-2*count),Math.max(0,n-count))};
}
function fidelityRead(){
 const {current:a,previous:b}=fidelitySelection(),label=xs=>xs.map(x=>x.label).join(' + '),window=`${label(a)||'Selecione um período'} · comparação: ${label(b)||'sem período anterior'}`;
 const fail=why=>({...customLimited({window},why),source:DB.fidelity?.source});
 if(!a.length)return fail('Escolha um intervalo válido de períodos da Fidelidade.');
 if([...a,...b].some(x=>x.status!=='ok'))return fail('Há repetição ou sobreposição ainda não validada nos períodos escolhidos.');
 if(fidelityMode==='personalizado'&&!b.length)return fail('Escolha início e fim de um intervalo válido para a comparação.');
 if(a.some(x=>b.includes(x)))return fail('Escolha períodos diferentes para a análise e a comparação.');
 const totals=ps=>Object.fromEntries(['sales','loyal','normal','profit','net_loyal','days'].map(k=>[k,ps.some(p=>p[k]==null)?null:customSum(ps,k)])),x=totals(a),y=totals(b),has=b.length>0;
 const metric=(label,v,old,kind='money')=>({label,value:v,previous:has?old:null,kind});
 const change=has&&y.loyal?`${x.loyal>=y.loyal?'aumentou':'caiu'} ${number(Math.abs((x.loyal-y.loyal)/y.loyal*100))}%`:'tem '+money(x.loyal);
 const r={status:'ok',window,headline:'Venda com Fidelidade '+change,summary:`${money(x.loyal)} em ${x.days} dias de campanha, contra ${has?money(y.loyal)+' em '+y.days+' dias':'comparação indisponível'}. O total se refere aos produtos presentes nas campanhas selecionadas.`,metrics:[
  metric('Venda com Fidelidade',x.loyal,y.loyal),metric('Venda Total · produtos da campanha',x.sales,y.sales),
  metric('% Venda com Fidelidade',customRatio(x.loyal,x.sales),customRatio(y.loyal,y.sales),'percent'),
  metric('Venda com Fidelidade por dia',customRatio(x.loyal,x.days),customRatio(y.loyal,y.days)),
  metric('Lucro Líquido da Venda Com Fidelidade',x.profit,y.profit),
  metric('Margem Líquida da Fidelidade',customRatio(x.profit,x.net_loyal),customRatio(y.profit,y.net_loyal),'percent')],
  insights:[],drivers:[],series:fidelityPeriods().filter(p=>p.status==='ok').map(p=>({date:p.end,value:p.loyal})),actions:[],limits:[...(DB.fidelity?.limits||[])],source:DB.fidelity.source,selected_periods:a.map(p=>({start:p.start,end:p.end})),comparison_periods:b.map(p=>({start:p.start,end:p.end})),decomposition:[]};
 const insight=(title,body,confidence='Cálculo observado')=>r.insights.push({title,body,kind:'neutral',confidence});
 insight('A campanha vendeu mais por dia?',`Venda média por dia: ${money(customRatio(x.loyal,x.days))}${has?' contra '+money(customRatio(y.loyal,y.days)):''}. Essa comparação ajuda a separar duração da campanha e ritmo de venda. Produtos, preços, feriados e promoções também podem mudar.`);
 if(has){
  const rate=x.loyal/x.days,old=y.loyal/y.days,days=(x.days-y.days)*(rate+old)/2,pace=(rate-old)*(x.days+y.days)/2;
  r.decomposition=[{label:'Duração dos períodos',value:days},{label:'Venda média por dia',value:pace}];
  insight('Quanto mudou pela duração?',`A diferença total de ${money(x.loyal-y.loyal)} se divide em ${money(days)} pela duração e ${money(pace)} pelo valor médio vendido por dia. Isso explica a conta; não demonstra o motivo comercial.`, 'Decomposição exata');
 }
 const products=ps=>{const out={};for(const p of ps)for(const v of p.products)out[v.label]=(out[v.label]||0)+v.loyal;return out;},cp=products(a),pp=products(b);
 if(has){r.drivers=[...new Set([...Object.keys(cp),...Object.keys(pp)])].map(label=>({label,current:cp[label]||0,previous:pp[label]||0,delta:(cp[label]||0)-(pp[label]||0),scope:label in cp&&label in pp?'Nas duas seleções':label in cp?'Só na seleção atual':'Só na comparação'})).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
  const top=r.drivers[0];if(top)insight('Onde o resultado mais mudou?',`${top.label}: diferença de ${money(top.delta)} na Venda com Fidelidade. ${top.scope}. Produto fora da lista de uma campanha não significa que deixou de vender na loja.`);
  const both=Object.keys(cp).filter(k=>k in pp).length;
  insight('A lista de produtos também mudou',`${Object.keys(cp).length} produtos na seleção atual e ${Object.keys(pp).length} na comparação; ${both} aparecem nas duas. Mudanças na lista podem alterar os totais e devem ser investigadas antes de chamar a diferença de melhora ou piora da campanha.`);
 }
 if(x.profit!=null&&x.profit<0)insight('Venda e lucro caminharam juntos?',`O lucro líquido com Fidelidade foi negativo: ${money(x.profit)}. Confira custo, preço e produtos com resultado negativo; vender mais, sozinho, não garante lucro.`);
 if([...a,...b].some(p=>p.profit==null))insight('Lucro e margem com dados incompletos','Há produto sem lucro preenchido nos períodos selecionados. O total de lucro e a margem ficam sem base nessa seleção; o valor ausente não vira zero.');
 r.actions=['Conferir os produtos que mais contribuíram para a mudança e os preços/custos dessas campanhas.','Comparar venda por dia, participação da Fidelidade e lucro, além do total vendido.'];
 r.limits.push('Uma linha por produto e campanha na simulação. Nenhum registro real foi reutilizado.');
 return r;
}
function fidelityControls(){
 const ps=fidelityPeriods(),opt=(selected,defaultValue)=>ps.map(p=>`<option value="${p.end}" ${p.end===(selected||defaultValue)?'selected':''}>${esc(p.label)}${p.status==='ok'?'':' · em validação'}</option>`).join('');
 return `<div class="controls"><div class="periods" role="group" aria-label="Períodos da Fidelidade">${[['ultimo','Último período'],['dois','Dois últimos períodos'],['personalizado','Escolher períodos']].map(([key,name])=>`<button data-fidelity-mode="${key}" class="${fidelityMode===key?'selected':''}" aria-pressed="${fidelityMode===key}">${name}</button>`).join('')}</div><div class="control-right"><button class="button" data-action="export">Baixar análise</button><button class="button primary" data-action="evidence">Entender os números</button></div></div>${fidelityMode==='personalizado'?`<form id="fidelity-form" class="custom-controls"><fieldset><legend>Períodos para analisar</legend><label>Primeiro período<select id="fidelity-first">${opt(fidelityFirst,ps.at(-1)?.end)}</select></label><label>Último período<select id="fidelity-last">${opt(fidelityLast,ps.at(-1)?.end)}</select></label></fieldset><fieldset><legend>Períodos para comparar</legend><label>Primeiro período<select id="fidelity-compare-first">${opt(fidelityCompareFirst,ps.at(-2)?.end)}</select></label><label>Último período<select id="fidelity-compare-last">${opt(fidelityCompareLast,ps.at(-2)?.end)}</select></label></fieldset><button class="button primary" type="submit">Comparar campanhas</button></form>`:''}<p class="panel-sub">Último período compara com o anterior. Dois últimos períodos soma as duas últimas campanhas e compara com as duas anteriores. A seleção respeita as datas completas de cada campanha.</p>`;
}
function fidelityDomain(t){
 const r=fidelityRead();let out=title(t.name,'Campanhas completas, com suas datas de início e fim.',DB.fidelity?.reference||t.as_of)+fidelityControls();
 if(r.status!=='ok')return out+`<section class="limited-hero"><h2>${esc(r.headline)}</h2><p>${esc(r.summary)}</p></section>`;
 out+=hero(t,r)+metrics(r)+`<div class="split"><section class="panel"><h2>Venda com Fidelidade por campanha</h2><p class="panel-sub">Datas finais dos períodos. Os valores não foram divididos por mês.</p>${chart(r.series)}</section><section class="panel"><h2>Produtos que mais mudaram</h2>${drivers(r,t)}<p class="method-label">Listas de produtos podem mudar entre campanhas. O detalhamento está em Entender os números.</p></section></div>`+evidenceCards(r)+actions(r)+limits(r,{...t,sources:[DB.fidelity.source]});
 return out;
}
function fidelityBind(){
 $('main').querySelectorAll('[data-fidelity-mode]').forEach(b=>b.addEventListener('click',()=>{fidelityMode=b.dataset.fidelityMode;render();}));
 $('fidelity-form')?.addEventListener('submit',e=>{e.preventDefault();fidelityFirst=$('fidelity-first').value;fidelityLast=$('fidelity-last').value;fidelityCompareFirst=$('fidelity-compare-first').value;fidelityCompareLast=$('fidelity-compare-last').value;render();});
}

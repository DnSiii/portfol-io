'use strict';
// Respeito o início de cada área ao definir a comparação histórica.
// Não preencho com zero os meses para os quais não há dados.
let strategicStart='';
function historyNextMonth(m){const d=new Date(m+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);return d.toISOString().slice(0,7);}
function historicalRows(area){return DB.meeting_history?.[area]?.rows||[];}
function historicalRead(area,labels=null){
 const h=DB.meeting_history?.[area];if(!h)return customLimited(null,'Histórico ainda indisponível.');
 const names=labels||Object.keys(h.kinds),valid=h.rows.filter(x=>x.complete&&names.every(k=>x.values[k]!=null)),current=valid.at(-1),eligible=valid.filter(x=>!strategicStart||x.month>=strategicStart),baseline=eligible[0],previous=current?valid.findLast(x=>x.month<current.month):null;
 if(!current||!baseline)return customLimited(null,'Não há meses completos comparáveis para a época escolhida.');
 const first=h.rows[0],primary=names[0],kind=h.kinds[primary],x=current.values[primary],b=baseline.values[primary],change=kind==='percent'?number((x-b)*100)+' pontos percentuais':b?number((x-b)/Math.abs(b)*100)+'%':'sem base percentual';
 const r={status:'ok',window:`Histórico desde ${first.month.slice(5)}/${first.month.slice(0,4)} · base: ${date(baseline.date)} · atual: ${date(current.date)}`,headline:`${primary}: de ${value(b,kind)} para ${value(x,kind)}`,summary:`Entre ${baseline.month} e ${current.month}, a variação foi ${change}. Cada mês representa sua própria operação; as contagens de clientes e os saldos não são somados.`,metrics:names.map(label=>({label,value:current.values[label],previous:baseline.values[label],kind:h.kinds[label]})),insights:[],series:h.rows.map(row=>({date:row.date,value:row.values[primary]==null?null:row.values[primary]*(kind==='percent'?100:1)})),drivers:[],actions:[],limits:[h.note],history:{area,baseline,current,previous,primary,kind,rows:h.rows},monthly_metrics:previous?names.map(label=>({label,value:current.values[label],previous:previous.values[label],kind:h.kinds[label]})):[]};
 const add=(title,body)=>r.insights.push({title,body,kind:'neutral',confidence:'Histórico observado'});
 add('O que era e onde estamos',r.summary);
 if(previous){const old=previous.values[primary],delta=kind==='percent'?number((x-old)*100)+' pontos percentuais':old?number((x-old)/Math.abs(old)*100)+'%':'sem base percentual';add('O mês mais recente manteve o movimento?',`${primary}: ${value(old,kind)} em ${previous.month} para ${value(x,kind)} em ${current.month}, uma variação de ${delta}. ${historyNextMonth(previous.month)===current.month?'São meses consecutivos.':'Há um intervalo entre esses meses; não chamamos essa diferença de mês contra mês anterior.'}`);}
 const selected=valid.filter(row=>row.month>=baseline.month),recent=selected.slice(-3),prior=selected.slice(-6,-3);
 if(prior.length===3&&recent.length===3&&[...prior,...recent].every((p,i,rs)=>!i||historyNextMonth(rs[i-1].month)===p.month)){
  if(kind!=='percent'){
   const mean=rs=>customSum(rs.map(p=>({v:p.values[primary]})),'v')/rs.length,a=mean(recent),b=mean(prior);
   add('Qual é o movimento recente?',`A média mensal de ${primary} nos últimos três meses ficou ${a>=b?'acima':'abaixo'} dos três anteriores${b?' em '+number(Math.abs((a-b)/b*100))+'%':''}: ${value(a,kind)} contra ${value(b,kind)}. Isso mostra a direção recente, não uma previsão. A duração dos meses, campanhas e cobertura também podem influenciar.`);
  }else add('Qual é o movimento recente?',`O percentual passou de ${value(recent[0].values[primary],kind)} em ${recent[0].month} para ${value(x,kind)} em ${current.month}. Leia a série mensal para ver se a mudança se repete; dois pontos não confirmam uma tendência.`);
 }else add('Qual é o movimento recente?','Ainda não há seis meses completos consecutivos a partir da época escolhida para comparar o ritmo recente. Mostramos a série disponível sem projetar resultados.');
 if(area==='vendas'||area==='propostas'){
  const amount=area==='vendas'?'Valor das vendas':'Aprovadas',qty=area==='vendas'?'Quantidade de compras':'Recebidas',a=current.values[amount],b=baseline.values[amount],n=current.values[qty],m=baseline.values[qty];
  if(n&&m){const ratio=a/n,old=b/m,ve=(n-m)*(ratio+old)/2,te=(ratio-old)*(n+m)/2,fmt=area==='vendas'?money:number;
   r.decomposition=[{label:qty,value:ve},{label:area==='vendas'?'Valor médio por compra':'% Aprovadas',value:te}];add('Como se divide a evolução?',`${qty} contribuiu ${fmt(ve)} e ${r.decomposition[1].label} contribuiu ${fmt(te)} para a diferença de ${fmt(a-b)} entre a base e o mês atual. É uma divisão matemática, não uma causa comprovada.`);
  }
 }
 if(area==='vendas'){
  const names={'1':'Centro','2':'Norte','3':'Sul','4':'Oeste'};
  r.drivers=Object.keys(current.groups).map(key=>({label:names[key],current:current.groups[key],previous:baseline.groups[key],delta:current.groups[key]-baseline.groups[key]})).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
  const top=r.drivers[0];if(top)add('Onde a evolução se concentra?',`${top.label} teve a maior contribuição em valor: ${money(top.delta)} entre ${baseline.month} e ${current.month}. Confira nessa loja volume de compras, valor médio por compra e mudanças de operação.`);
  const starts=h.store_first_observed,enter=Object.keys(starts).filter(s=>['3','4'].includes(s)&&starts[s]>baseline.date&&starts[s]<=current.date),common=Object.keys(starts).filter(s=>!enter.includes(s)&&starts[s]<=baseline.date);
  const expansion=enter.reduce((sum,s)=>sum+current.groups[s],0),same=common.reduce((sum,s)=>sum+current.groups[s]-baseline.groups[s],0);
  if(enter.length){add('Quanto veio da expansão das lojas?',`${enter.map(s=>names[s]).join(' e ')} iniciaram a operação depois da época de comparação e somam ${money(expansion)} no mês atual. Nas lojas que já operavam, a diferença foi ${money(same)}. Juntas, essas parcelas explicam a mudança no total. O início da operação foi confirmado por autor do projeto; usamos as primeiras datas observadas na fonte.`);r.expansion={stores:enter,value:expansion,existing_stores:common,existing_change:same};}

 }
 if(area==='carteira')add('Crescimento ou mudança na cobertura?','O começo da base de Clientes ativos tem saltos importantes. Confirme se todas as contas já estavam na fonte e se o critério de atividade mudou antes de tratar todo o aumento como crescimento comercial.');
 if(area==='faturamento')add('Atenção ao tempo para receber',h.note);
 if(h.rows.some(row=>!row.complete))r.limits.push('Meses parciais aparecem no detalhamento, mas não entram na base, no mês atual nem no cálculo de tendência.');
 return r;
}
function historyPresentation(r,{table=true}={}){
 if(r.status!=='ok')return `<p>${esc(r.headline)}</p>`;
 const q=r.history;
 return `<div class="method-box"><strong>Desde ${q.baseline.month} até ${q.current.month}</strong><p>${esc(r.summary)}</p></div>${metrics(r)}${evidenceCards(r)}${r.monthly_metrics.length?`<details class="limits"><summary>Comparação com o mês anterior disponível</summary>${metrics({...r,metrics:r.monthly_metrics})}</details>`:''}<section class="panel"><h3>${esc(q.primary)} mês a mês</h3><p class="panel-sub">Todo o histórico da fonte. Meses parciais estão marcados na tabela e fora das comparações.</p>${chart(r.series,{percent:q.kind==='percent',count:q.kind==='number'})}</section>${table?`<details class="limits"><summary>Ver todo o histórico e as datas</summary><div class="table-scroll"><table><thead><tr><th>Mês / posição</th>${r.metrics.map(m=>`<th>${esc(m.label)}</th>`).join('')}<th>Cobertura</th></tr></thead><tbody>${q.rows.map(row=>`<tr><td>${esc(date(row.date))}</td>${r.metrics.map(m=>`<td>${esc(value(row.values[m.label],m.kind))}</td>`).join('')}<td>${esc(row.complete?'Disponível':row.issues.join(' · '))}</td></tr>`).join('')}</tbody></table></div></details>`:''}<p class="method-label">${esc(r.limits.join(' '))}</p>`;
}
function strategicControls(){
 const months=[...new Set(Object.values(DB.meeting_history||{}).flatMap(x=>x.rows.filter(r=>r.complete).map(r=>r.month)))].sort();
 return `<div class="controls"><label>Comparar a partir de <select id="strategic-start"><option value="">Início de cada histórico</option>${months.map(m=>`<option value="${m}" ${strategicStart===m?'selected':''}>${m.slice(5)}/${m.slice(0,4)}</option>`).join('')}</select></label><div class="control-right"><button class="button" data-action="export">Baixar reunião</button></div></div><p class="panel-sub">Cada assunto usa o primeiro mês completo disponível a partir dessa época. O histórico completo continua visível. Saldos mantêm a data da posição.</p>`;
}
function strategicSlide(slide,index){
 const kind=slide.tipo;
 if(kind==='pendente')return {slide,index,status:'pendente',areas:[],analysis:null,html:`<p>${esc(slide.nota)}</p><p class="method-label">A medida deste slide ainda precisa de validação.</p>`};
 const mapping={vendas:['vendas',['Valor das vendas','Quantidade de compras','Valor médio por compra'],'disponivel'],participacao:['vendas',['Participação nas vendas da loja'],'disponivel'],propostas_parcial:['propostas',['Aprovadas','Recebidas','% Aprovadas','Pendentes'],'parcial'],negadas:['propostas',['Recusadas','Pendentes'],'parcial'],compras:['carteira',['Valor das compras','Quantidade de compras','Clientes ativos','Valor médio por compra na base de Clientes ativos'],'disponivel'],status_cobranca:['posicoes',['Saldo a recuperar'],'disponivel'],faturamento_parcial:['faturamento',['Valor das faturas do grupo principal','Valor recebido das faturas do grupo principal','Quantidade de faturas do grupo principal'],'parcial'],recebimento_parcial:['faturamento',['Percentual recebido do grupo principal'],'parcial'],fluxos:['fluxos',['Pagamentos recuperados','Quantidade de pagamentos','Valor que entrou em recuperação'],'parcial']};
 let r=null,html='',areas=[],status='disponivel';
 if(kind==='inicio'||kind==='conclusao'){
  const results=[['vendas','Valor das vendas'],['propostas','Aprovadas'],['carteira','Clientes ativos']].map(([id,label])=>historicalRead(id,[label]));
  r={window:'Visão histórica · cada assunto tem seu próprio início e sua última data',metrics:[],insights:[],limits:['Não há uma data inicial única para todas as fontes.'],histories:results};areas=['vendas','propostas','carteira'];
  html=`<div class="qa-grid">${results.map(q=>`<div><b>${esc(q.status==='ok'?q.history.primary:'Histórico em validação')}</b><p>${esc(q.headline)}</p><p>${esc(q.window)}</p><p>${esc(q.insights.find(i=>i.title==='Qual é o movimento recente?')?.body||'')}</p></div>`).join('')}</div><p>Veja nos próximos slides o que mudou ao longo do tempo e o que explica a diferença no cálculo. Saltos na cobertura, mudança de produtos e tempo de recebimento exigem conferência antes de concluir o motivo.</p>`;
 }else if(kind==='fidelidade'){
  const ps=fidelityPeriods().filter(p=>p.status==='ok');areas=['descontos'];
  r=fidelityRead();html=metrics(r)+evidenceCards(r)+`<h3>Desde o início dos períodos disponíveis</h3><p class="panel-sub">${esc(ps[0]?.label||'')} até ${esc(ps.at(-1)?.label||'')}. Campanhas completas, com diferentes produtos e durações.</p>${chart(ps.map(p=>({date:p.end,value:p.loyal/p.days})))}<p class="method-label">Gráfico em reais por dia: evita atribuir a uma campanha mais longa uma melhora no ritmo. A lista de produtos também muda.</p><a class="button" href="#descontos">Escolher e comparar períodos dos descontos</a>`;
  if(ps.length>1){const a=ps.find(p=>!strategicStart||p.start>=strategicStart+'-01'),b=ps.at(-1);if(a&&a!==b){html+=`<p>Na campanha inicial da comparação (${date(a.start)} a ${date(a.end)}), a Venda com desconto por dia foi ${money(a.loyal/a.days)}; na última, ${money(b.loyal/b.days)}. A participação passou de ${value(a.loyal/a.sales,'percent')} para ${value(b.loyal/b.sales,'percent')}. Essa diferença combina campanhas com produtos distintos e não prova o efeito do desconto.</p>`;r.historical_period_baseline={start:a.start,end:a.end};}else html+='<p>Não há duas campanhas completas a partir da época escolhida para comparar a evolução. A seleção de campanhas acima mantém suas datas próprias.</p>';}
 }else if(kind==='base_parcial'){
  const active=historicalRead('carteira',['Clientes ativos']),aptas=historicalRead('aptas',['Contas disponíveis','Liberada','Nova conta']);areas=['carteira','aptas'];status='parcial';
  r={window:'Clientes ativos por mês e Contas disponíveis por data de referência · históricos separados',metrics:[],insights:[],limits:[slide.nota],active,aptas};
  html=`<h3>Clientes ativos desde o início</h3>${historyPresentation(active)}<h3>Contas disponíveis desde o início</h3>${historyPresentation(aptas)}<p>As duas fontes têm regras e datas próprias. Não dividimos uma pela outra para criar uma taxa de ativação.</p>`;
 }else if(kind==='seis_meses'){
  const active=historicalRead('carteira',['Valor das compras']),billed=historicalRead('faturamento',['Valor das faturas do grupo principal','Valor recebido das faturas do grupo principal']);areas=['carteira','faturamento'];status='parcial';
  r={window:'Históricos completos + detalhe dos seis meses recentes',metrics:[],insights:[],limits:[slide.nota],active,billed,recent:meetingSixMonths()};
  html=`<h3>Compras da base de Clientes ativos</h3>${historyPresentation(active)}<h3>Faturas do grupo principal</h3>${historyPresentation(billed)}<h3>Detalhe dos seis últimos meses</h3><div class="table-scroll"><table><thead><tr><th>Mês</th><th>Valor das compras</th><th>Faturas do grupo principal</th><th>Pagamentos do grupo principal</th></tr></thead><tbody>${r.recent.rows.map(x=>`<tr><td>${x.month}</td><td>${money(x.active)}</td><td>${money(x.billed)}</td><td>${money(x.paid)}</td></tr>`).join('')}</tbody></table></div><p>As bases são distintas. Para explicar como compras geraram faturamento, precisamos vincular compras, parcelas e vencimentos da mesma conta.</p>`;
 }else if(mapping[kind]){
  const [area,labels,state]=mapping[kind];r=historicalRead(area,labels);status=state;areas=[area==='posicoes'||area==='fluxos'?'cobranca':area];html=historyPresentation(r);
  if(r.status==='ok'&&area==='posicoes'){
   const now=r.history.current,old=r.history.baseline,keys=[...new Set([...Object.keys(now.groups),...Object.keys(old.groups)])];
   html+=`<h3>Onde o saldo mudou</h3><div class="table-scroll"><table><thead><tr><th>Situação do acordo</th><th>${date(old.date)}</th><th>${date(now.date)}</th><th>Diferença</th></tr></thead><tbody>${keys.map(k=>`<tr><td>${esc(k)}</td><td>${money(old.groups[k]||0)}</td><td>${money(now.groups[k]||0)}</td><td>${money((now.groups[k]||0)-(old.groups[k]||0))}</td></tr>`).join('')}</tbody></table></div>`;
  }
  if(r.status==='ok'&&area==='carteira'){
   const f=DB.advanced.active_factors.at(-1);html+=`<div class="method-box"><strong>Compras: o que mudou no último mês da base?</strong><p>${esc(f.previous.period)} para ${esc(f.current.period)}: diferença de ${money(f.delta)}. No cálculo, duração do mês contribuiu ${money(f.calendar.effects[0])}. Veja clientes, ritmo diário e valor médio por compra em Análises e oportunidades.</p><a class="text-button" href="#aprofundadas">Abrir estudo dos fatores</a></div>`;
  }
 }
 if(!r||r.status==='limited'){status='pendente';html=`<p>${esc(r?.headline||'Histórico ainda indisponível para este slide.')}</p>`;}
 return {slide,index,status,areas,analysis:r,html};
}

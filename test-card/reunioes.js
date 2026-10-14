'use strict';
// Uso a ordem e os títulos definidos em config/reunioes.json.
function meetingBanner(type){return `<div class="meeting-banner"><img src="assets/reuniao-${type}.svg" alt="${type==='estrategica'?'Reunião Estratégica':'Reunião Semanal'} · Test Card" width="1672" height="941"></div>`;}
function reunioesHome(){return title('Reuniões','Siga o roteiro do Power BI em uma página contínua, com resultados, explicações e próximos passos.')+`<div class="home-grid">${[['semanal','Reunião Semanal','semana'],['estrategica','Reunião Estratégica','mes']].map(([type,name,period])=>`<article class="insight-card meeting-card">${meetingBanner(type)}<h2>${name}</h2><p>Seções na ordem de Home (${type==='semanal'?'RS':'RE'}). As análises disponíveis e as medidas ainda em validação estão identificadas.</p><a class="button primary" href="#reuniao-${type}" data-target-period="${period}">Abrir ${name}</a></article>`).join('')}</div>`;}
function meetingRaw(area,horizon=null){
 const t=theme(area);if(dynamicPeriod()||!horizon)return read(t);
 return linguagemClara(t,t.periods[horizon]);
}
function meetingSubset(area,labels,horizon=null){
 const r=meetingRaw(area,horizon);if(r.status!=='ok')return r;
 return {...r,metrics:r.metrics.filter(m=>labels.includes(m.label))};
}
function meetingFlow(){
 const t=theme('cobranca');if(dynamicPeriod())return read(t);if(level==='ano')return {status:'limited',headline:'O fluxo anual de Entrada e Recuperação em Recuperação de pagamentos ainda não está validado.',summary:'O saldo anual da carteira é uma posição e não substitui pagamentos ou entradas acumulados.',window:'Fluxos anuais em validação',metrics:[],insights:[],limits:[]};
 const raw=t.periods[level];if(raw.status!=='ok')return raw;
 const stamps=raw.window.match(/\d{2}\/\d{2}\/\d{4}/g);
 if(!stamps||stamps.length!==4)return raw;
 const iso=x=>x.split('/').reverse().join('-');
 return linguagemClara(t,customRead(t,{start:iso(stamps[0]),end:iso(stamps[1]),compareStart:iso(stamps[2]),compareEnd:iso(stamps[3])}));
}
function meetingSixMonths(){
 const active=theme('carteira').monthly_base.slice(-6),billed=DB.custom.faturamento.rows;
 const rows=active.map(a=>{const month=a.end.slice(0,7),f=billed.filter(x=>x.date.startsWith(month));return {month,active:a.sales,billed:f.length===6?customSum(f,'billed'):null,paid:f.length===6?customSum(f,'paid'):null};});
 return {rows,window:`${date(active[0].end)} a ${date(active.at(-1).end)} · série mensal própria da fonte`};
}
function meetingSlide(slide,type,index){
 if(type==='estrategica')return strategicSlide(slide,index);
 let r=null,areas=[],html='',status='disponivel';
 const kind=slide.tipo,h=slide.periodo;
 if(kind==='pendente')return {slide,index,status:'pendente',areas:[],analysis:null,html:`<p>${esc(slide.nota)}</p><p class="method-label">Nenhum número de outra medida foi colocado no lugar deste indicador.</p>`};
 if(kind==='inicio'||kind==='conclusao'){
  const f=DB.advanced.active_factors.at(-1);
  html=`<p>${kind==='inicio'?'Pontos para abrir a conversa':'Pontos para fechar a conversa'}</p><div class="qa-grid"><div><b>Clientes, compras e valor médio por compra</b><p>${esc(f.current.period)}: valor das compras ${f.delta<0?'caiu':'aumentou'} ${money(Math.abs(f.delta))}. Duração do mês, quantidade de clientes, ritmo diário e valor médio por compra precisam ser lidos juntos.</p></div><div><b>Aprovação não garante venda</b><p>A relação entre aprovações e compras é exploratória. É preciso ligar a aprovação à primeira compra da mesma conta antes de explicar o efeito comercial.</p></div><div><b>Antes de decidir</b><p>Confirmar datas, fechamento e medidas específicas dos slides. As pendências aparecem na própria reunião.</p></div></div>`;
  r={window:`Resumo mensal complementar: ${f.current.period} · comparação: ${f.previous.period} · independente do período escolhido acima`,metrics:[],insights:[],limits:['O resumo mensal usa a base de Clientes ativos. Os demais slides indicam seus períodos próprios.'],active_factors:f,proposal_sales:DB.advanced.associations.all};areas=['carteira','propostas','vendas'];
 }else if(kind==='vendas'){
  r=meetingRaw('vendas',h);areas=['vendas'];
  if(r.status==='ok')html=metrics(r)+`<p>${esc(r.summary)}</p>`+evidenceCards({...r,insights:r.insights.filter(i=>!i.title.includes('Possível')).slice(1)})+`<section class="panel"><h3>Vendas por data</h3>${chart(r.series)}</section>`;
 }else if(kind==='participacao'){
  r=meetingSubset('vendas',['Participação nas vendas da loja'],h);areas=['vendas'];
  if(r.status==='ok'){const m=r.metrics[0];html=metrics(r)+`<p>O cartão respondeu por ${value(m.value,'percent')} do valor vendido pelo varejo, contra ${value(m.previous,'percent')} na comparação. Usamos as mesmas lojas e datas. Valor médio por compra e Valor médio por compra na loja são indicadores diferentes; o valor médio por compra do varejo ainda não está calculado.</p>`;}
 }else if(kind==='propostas_parcial'){
  r=meetingRaw('propostas',h);areas=['propostas'];status='parcial';
  if(r.status==='ok')html=metrics(r)+evidenceCards({...r,insights:r.insights.filter(i=>!i.title.includes('Possível'))});
 }else if(kind==='negadas'){
  r=meetingSubset('propostas',['Recusadas','Pendentes'],h);areas=['propostas'];status='parcial';
  if(r.status==='ok'){const m=r.metrics.find(m=>m.label==='Recusadas');html=metrics(r)+`<p>Solicitações Recusadas: ${number(m.previous)} para ${number(m.value)}. A regra atual da fonte reúne NEGADO P1 e NEGADO MESA como Recusadas. Isso ainda não mostra qual regra de crédito motivou cada recusa.</p><p>Confira as regras decisoras antes de atribuir a mudança a pontuação de crédito, perfil ou atuação do consultor.</p>`;}
 }else if(kind==='compras'){
  r=meetingRaw('carteira',dynamicPeriod()?null:'mes');areas=['carteira'];
  if(r.status==='ok'){
   const a=r.metrics.find(m=>m.label==='Valor das compras'),n=r.metrics.find(m=>m.label==='Quantidade de compras'),count=r.metrics[0];
   if(a&&n){r={...r,metrics:[count,n,a,{label:'Valor médio por compra na base de Clientes ativos',value:customRatio(a.value,n.value),previous:customRatio(a.previous,n.previous),kind:'money'}]};html=metrics(r)+`<p>Quantidade de compras, gasto e valor médio por compra são calculados na base de Clientes ativos. Este valor médio por compra não é o Valor médio por compra da Vendas.</p>`;}
  }
 }else if(kind==='base_parcial'){
  const active=meetingRaw('carteira',dynamicPeriod()?null:'mes'),aptas=aptasRead(theme('aptas'));areas=['carteira','aptas'];status='parcial';r={window:'Duas bases com datas próprias',metrics:[],insights:[],limits:[slide.nota],active,aptas};
  html=`<h3>Clientes ativos</h3><p>${esc(active.window)}</p>${active.status==='ok'?metrics(active):'<p>'+esc(active.headline)+'</p>'}<h3>Contas disponíveis</h3><p>${esc(aptas.window)}</p>${metrics(aptas)}<p>As datas e as regras são diferentes. Não calculamos taxa de ativação dividindo essas duas contagens.</p>`;
 }else if(kind==='status_cobranca'){
  const q=dynamicPeriod()?read(theme('cobranca')):theme('cobranca').periods[level];const pos=dynamicPeriod()?q.portfolio:theme('cobranca').portfolio;areas=['cobranca'];
  if(pos){r={window:'Posição '+date(pos.date),metrics:[{label:'Saldo a recuperar',value:pos.principal,previous:null,kind:'money'}],insights:[],limits:['Uma posição não é o acumulado de saldos do período.'],portfolio:pos};html=metrics(r)+`<div class="table-scroll"><table><thead><tr><th>Situação do acordo</th><th>Saldo a recuperar</th><th>Parte do saldo</th></tr></thead><tbody>${pos.statuses.map(s=>`<tr><td>${esc(s.label)}</td><td>${money(s.value)}</td><td>${value(customRatio(s.value,pos.principal),'percent')}</td></tr>`).join('')}</tbody></table></div><p>A situação do acordo não informa sozinha por que o saldo aumentou ou caiu. Precisamos conferir entradas, pagamentos e renegociações.</p>`;}
 }else if(kind==='faturamento_parcial'||kind==='recebimento_parcial'){
  const labels=kind==='faturamento_parcial'?['Valor das faturas do grupo principal','Quantidade de faturas do grupo principal','Valor recebido das faturas do grupo principal']:['Percentual recebido do grupo principal'];r=meetingSubset('faturamento',labels,h);areas=['faturamento'];status='parcial';
  if(r.status==='ok')html=metrics(r)+`<p>${esc(slide.nota)}</p><p>Compare pagamentos com o mesmo tempo após o vencimento. Faturas recentes tiveram menos tempo para receber; a diferença não comprova piora da inadimplência.</p>`;
 }else if(kind==='seis_meses'){
  const q=meetingSixMonths();r={window:q.window,metrics:[],insights:[],limits:['Série própria dos últimos seis meses disponíveis, independente do período escolhido acima.','Compras da base de Clientes ativos e faturamento do grupo principal são universos diferentes.'],monthly_series:q.rows};areas=['carteira','faturamento'];status='parcial';
  html=`<div class="table-scroll"><table><thead><tr><th>Mês</th><th>Valor das compras · Clientes ativos</th><th>Faturas do grupo principal</th><th>Pagamentos do grupo principal</th></tr></thead><tbody>${q.rows.map(x=>`<tr><td>${x.month}</td><td>${money(x.active)}</td><td>${money(x.billed)}</td><td>${money(x.paid)}</td></tr>`).join('')}</tbody></table></div><p>As séries permitem observar a evolução. Não demonstram que as compras de uma coluna geraram as faturas da outra: isso exige ligar compras e faturas da mesma conta, incluindo parcelas e vencimentos.</p>`;
 }else if(kind==='fluxos'){
  r=meetingFlow();areas=['cobranca'];status='parcial';
  if(r.status==='ok')html=metrics(r)+`<p>Pagamentos mostram o que foi recebido. Entrada em recuperação mostra o valor que entrou. Os grupos não são necessariamente os mesmos; subtrair um do outro não explica o saldo da carteira.</p>`+evidenceCards({...r,insights:r.insights.filter(i=>!i.title.includes('Possível'))});
 }
 if(!r||r.status==='limited'){status='pendente';html=`<p>${esc(r?.headline||'Não há dados suficientes para essa seção no período selecionado.')}</p><p>${esc(r?.summary||slide.nota)}</p>`;}
 return {slide,index,status,areas,sources:[...new Set(areas.flatMap(id=>theme(id).sources))],analysis:r,html};
}
function meetingBundle(type){return {type,name:DB.meetings.modulos[type].nome,selected_horizon:type==='estrategica'?'historico':level,baseline_from:type==='estrategica'?strategicStart||'inicio_disponivel':null,reference:DB.reference_date,slides:DB.meetings.modulos[type].slides_ativos.map((s,i)=>meetingSlide(s,type,i))};}
function reuniaoPage(type){
 if(!DB.meetings)return title('Reuniões','Recalcule as análises para carregar o roteiro.')+'<p>Roteiro indisponível.</p>';
 const bundle=meetingBundle(type),ready=bundle.slides.filter(x=>x.status!=='pendente').length;
 return title(bundle.name,'Resultados e explicações na ordem numérica de Home ('+(type==='semanal'?'RS':'RE')+').')+meetingBanner(type)+(type==='estrategica'?strategicControls():controls())+banner()+`<div class="meeting-toolbar"><button class="button primary" data-action="print">Imprimir / salvar PDF</button><a class="text-button" href="#apresentacoes">Voltar para Reuniões</a><span>${ready} seções com análises disponíveis ou parciais · ${bundle.slides.length-ready} aguardam dados ou regras</span></div><div class="method-box"><strong>Como ler esta reunião</strong><p>${type==='estrategica'?'A Estratégica acompanha o histórico completo, compara a época inicial com a posição atual e mostra os movimentos mensais. Cada assunto tem suas próprias datas. A direção recente não é uma previsão.':'Cada seção mostra suas datas e fontes. Na RS, os slides Diário e Mensal seguem o próprio título. Personalizado aplica o intervalo escolhido quando a fonte permite. Posições e séries históricas mantêm suas datas.'} “Parcial” indica que a medida completa do slide ainda está em validação.</p></div><nav class="meeting-index" aria-label="Ir para uma seção da reunião">${bundle.slides.map(s=>`<button data-jump="meeting-${type}-${s.index}">${esc(s.slide.titulo)}</button>`).join('')}</nav>${bundle.slides.map(s=>`<section class="meeting-section panel" id="meeting-${type}-${s.index}"><div class="section-head"><h2>${esc(s.slide.titulo)}</h2><span class="pill ${s.status==='disponivel'?'neutral':'attention'}">${s.status==='disponivel'?'Análise disponível':s.status==='parcial'?'Análise parcial':'Em validação'}</span></div><p class="panel-sub">${esc(s.analysis?.window||'Sem medida validada')}</p>${s.status==='parcial'?`<div class="method-box"><strong>O que está disponível neste slide</strong><p>${esc(s.slide.nota)}</p></div>`:''}${s.html}${s.areas.length?`<p class="method-label">Fontes: ${esc([...new Set(s.areas.flatMap(id=>id==='descontos'&&DB.fidelity?[DB.fidelity.source]:theme(id).sources))].join(' · '))}</p><button class="text-button" data-slide-detail="${s.index}" data-meeting-type="${type}">Entender esta seção</button>`:''}</section>`).join('')}`;
}
function meetingDetail(type,index){const s=meetingBundle(type).slides[Number(index)];$('detail-title').textContent=s.slide.titulo;$('detail-body').innerHTML=`<p>${esc(s.analysis?.window||'')}</p>${s.html}<h3>Limites desta análise</h3><p>${esc(s.slide.nota)}</p><ul>${(s.analysis?.limits||[]).map(l=>`<li>${esc(l)}</li>`).join('')}</ul><p>${esc(DB.validation)}</p>`;$('detail').showModal();}

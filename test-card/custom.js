'use strict';
// Recebo do Python as definições e os dados agrupados, sem dados individuais.
// Seleciono as datas e combino somas e contagens aqui, sem ler as planilhas.
function customShift(d,n){const x=new Date(d+'T00:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);}
function customDays(a,b){return Math.round((Date.parse(b)-Date.parse(a))/86400000)+1;}
function customValid(a,b){return /^\d{4}-\d{2}-\d{2}$/.test(a)&&/^\d{4}-\d{2}-\d{2}$/.test(b)&&Number.isFinite(Date.parse(a))&&Number.isFinite(Date.parse(b))&&new Date(a+'T00:00:00Z').toISOString().slice(0,10)===a&&new Date(b+'T00:00:00Z').toISOString().slice(0,10)===b&&a<=b;}
function customWindow(a,b){
 let pa,pb,mode='intervalo anterior com a mesma quantidade de dias';
 if(a.endsWith('-01')&&customShift(b,1).endsWith('-01')){
  const n=(Number(b.slice(0,4))-Number(a.slice(0,4)))*12+Number(b.slice(5,7))-Number(a.slice(5,7))+1;
  const x=new Date(a+'T00:00:00Z');x.setUTCMonth(x.getUTCMonth()-n);pa=x.toISOString().slice(0,10);pb=customShift(a,-1);mode=n===1?'mês anterior completo':`${n} meses anteriores completos`;
 }else{pb=customShift(a,-1);pa=customShift(a,-customDays(a,b));}
 return {a,b,pa,pb,mode,window:`${date(a)} a ${date(b)} · comparação: ${date(pa)} a ${date(pb)}`};
}
function customLimited(w,reason){return {status:'limited',window:w?.window||'Selecione as duas datas e aplique o intervalo.',headline:reason,summary:'O intervalo selecionado foi mantido. Não substituímos a leitura por outro período. Os dados que faltam não viram zero.',metrics:[],insights:[],drivers:[],series:[],actions:['Escolher um intervalo dentro da cobertura disponível.'],limits:[reason]};}
function customSum(rows,key){return rows.reduce((s,x)=>s+(Number(x[key])||0),0);}
function customRatio(a,b){return a!=null&&b!=null&&b!==0? a/b:null;}
function customDistinct(patterns,a,b,bad=false){return patterns.reduce((n,p)=>n+((bad?p.bad_dates:p.dates).some(d=>d>=a&&d<=b)?p.count:0),0);}
function customCoverage(d,a,b){return a>=d.coverage.start&&b<=d.coverage.end;}
function customGroup(rows,key,field){const out={};for(const x of rows){const k=String(x[key]);out[k]=(out[k]||0)+(Number(x[field])||0);}return out;}
function customRead(t,selection=null){
 const a=selection?.start||customStart,b=selection?.end||customEnd;
 const pa=selection?.compareStart??compareStart,pb=selection?.compareEnd??compareEnd;
 if(!customValid(a,b))return customLimited(null,'Escolha uma data inicial e uma data final válidas.');
 if((pa||pb)&&!customValid(pa,pb))return customLimited(null,'Escolha início e fim válidos para a comparação.');
 const w=pa&&pb?{a,b,pa,pb,mode:'período escolhido por você',window:`${date(a)} a ${date(b)} · comparação: ${date(pa)} a ${date(pb)}`} :customWindow(a,b),d=DB.custom?.[t.id];
 if(!d)return customLimited(w,'Esta área não tem uma base operacional para o intervalo personalizado.');
 if(!customCoverage(d,a,b))return customLimited(w,`Cobertura desta área: ${date(d.coverage.start)} a ${date(d.coverage.end)}. O intervalo escolhido está fora dela.`);
 const r={status:'ok',window:w.window,headline:'',summary:'',metrics:[],insights:[],drivers:[],series:[],actions:[],limits:[`Comparação: ${w.mode}. Ainda precisamos confirmar o fechamento e conferir os valores com o Power BI.`],comparison:{start:w.pa,end:w.pb,mode:w.mode},selected:{start:a,end:b}};
 if(customDays(a,b)!==customDays(w.pa,w.pb))r.limits.push(`O período analisado tem ${customDays(a,b)} dias e a comparação tem ${customDays(w.pa,w.pb)} dias. Os totais não foram ajustados por dia: mais dias podem aumentar o total.`);
 const current=(d.rows||[]).filter(x=>x.date>=a&&x.date<=b&&(!t.filters?.[store]||store==='all'||x.store===store));
 const previous=(d.rows||[]).filter(x=>x.date>=w.pa&&x.date<=w.pb&&(!t.filters?.[store]||store==='all'||x.store===store));
 let comparable=customCoverage(d,w.pa,w.pb);
 if(t.id==='vendas'){
  const stores=store==='all'?4:1;
  if(current.length!==customDays(a,b)*stores)return customLimited(w,'Há dias ou lojas sem registro de Vendas no intervalo escolhido.');
  comparable=comparable&&previous.length===customDays(w.pa,w.pb)*stores;
 }
 const metric=(label,value,kind='money',old=null)=>({label,value,kind,previous:comparable?old:null});
 const add=(title,body,kind='neutral',confidence='Totais do período escolhido')=>r.insights.push({title,body,kind,confidence});
 const delta=(x,y)=>comparable&&y?`${x>=y?'+':''}${number((x-y)/Math.abs(y)*100)}%`:'sem dados suficientes para comparar';
 const impact=(key,field)=>{
  if(!comparable)return;
  const x=customGroup(current,key,field),y=customGroup(previous,key,field);
  r.drivers=[...new Set([...Object.keys(x),...Object.keys(y)])].map(k=>({label:key==='store'?({'1':'Centro','2':'Norte','3':'Sul','4':'Oeste','100':'Online'}[k]||'Outros'):k,current:x[k]||0,previous:y[k]||0,delta:(x[k]||0)-(y[k]||0)})).sort((x,y)=>Math.abs(y.delta)-Math.abs(x.delta));
  const top=r.drivers[0];if(top)add('Onde a mudança se concentra?',`${t.id==='faturamento'?'Vencimento ':''}${top.label} contribuiu ${t.id==='propostas'?number(top.delta)+' aprovações':money(top.delta)} para a variação. Isso mostra onde o total mudou mais. Ainda precisamos confirmar o motivo.`);
 };
 const decomp=(x,y,n,m,labelA,labelB)=>{
  if(!comparable||!n||!m)return;
  const ta=x/n,tb=y/m,ve=(n-m)*(ta+tb)/2,te=(ta-tb)*(n+m)/2;
  r.decomposition=[{label:labelA,value:ve},{label:labelB,value:te}];
  const fmt=t.id==='propostas'?number:money;
  add('Como se divide a mudança?',`${labelA}: ${fmt(ve)}. ${labelB}: ${fmt(te)}. Juntos, os dois fatores explicam a diferença no cálculo de ${fmt(x-y)} no intervalo.`, 'neutral','Diferença dividida em dois fatores');
 };
 let seriesField=null;
 if(t.id==='vendas'){
  const x=customSum(current,'sales'),y=customSum(previous,'sales'),n=customSum(current,'quantity'),m=customSum(previous,'quantity');
  r.metrics=[metric('Valor das vendas',x,'money',y),metric('Quantidade de compras',n,'number',m),metric('Valor médio por compra',customRatio(x,n),'money',customRatio(y,m)),metric('Participação nas vendas da loja',current.every(x=>x.retail!=null)?customRatio(x,customSum(current,'retail')):null,'percent',previous.every(x=>x.retail!=null)?customRatio(y,customSum(previous,'retail')):null)];
  r.headline=`Venda Cartão ${delta(x,y)} no intervalo escolhido`;r.summary=`${money(x)} em ${number(n)} compras líquidas. A leitura respeita as datas e lojas selecionadas.`;
  impact('store','sales');decomp(x,y,n,m,'Quantidade de compras','Valor médio por compra');seriesField='sales';r.actions=['Na loja que mais mudou, confira a quantidade de compras, o valor médio por compra e a participação do cartão nas vendas.'];
 }else if(t.id==='propostas'){
  const n=customSum(current,'count'),m=customSum(previous,'count'),x=customSum(current,'approved'),y=customSum(previous,'approved');
  r.metrics=[metric('Recebidas',n,'number',m),metric('Aprovadas',x,'number',y),metric('% Aprovadas',customRatio(x,n),'percent',customRatio(y,m)),metric('Recusadas',customSum(current,'denied'),'number',customSum(previous,'denied')),metric('Pendentes',customSum(current,'pending'),'number',customSum(previous,'pending'))];
  r.headline=`Aprovadas ${delta(x,y)} no intervalo escolhido`;r.summary=`${number(x)} Aprovadas em ${number(n)} Recebidas; ${number(customSum(current,'denied'))} Recusadas e ${number(customSum(current,'pending'))} Pendentes. Status observado na extração, agrupado pela data da solicitação.`;
  impact('store','approved');decomp(x,y,n,m,'Recebidas','% Aprovadas');seriesField='approved';r.actions=['Separar mudança nas Recebidas de mudança no percentual de aprovação.'];r.limits.push('Pendentes não reconstituem a fila histórica. Pontuação de crédito e ativação exigem vínculos próprios.');
 }else if(t.id==='cobranca'){
  const x=customSum(current,'value'),y=customSum(previous,'value'),n=customSum(current,'count'),m=customSum(previous,'count');
  const select=(xs,start,end)=>xs.filter(z=>z.date>=start&&z.date<=end);
  const en=select(d.entries,a,b),ep=select(d.entries,w.pa,w.pb),ag=select(d.agreements,a,b),ap=select(d.agreements,w.pa,w.pb),fu=select(d.fulfilled,a,b);
  r.metrics=[metric('Pagamentos recuperados',x,'money',y),metric('Quantidade de pagamentos',n,'number',m),metric('Novos Acordos',customSum(ag,'count'),'number',customSum(ap,'count')),metric('Valor que entrou em recuperação',customSum(en,'principal'),'money',customSum(ep,'principal'))];
  for(const [name,coverage] of Object.entries(d.event_coverage)){
   if(a<coverage.start||b>coverage.end){r.limits.push(`${name}: cobertura ${date(coverage.start)} a ${date(coverage.end)}; não temos o total completo desse período.`);if(name==='Novos Acordos')r.metrics[2].value=r.metrics[2].previous=null;if(name==='Entrada em recuperação')r.metrics[3].value=r.metrics[3].previous=null;}
   else if(w.pa<coverage.start||w.pb>coverage.end){if(name==='Novos Acordos')r.metrics[2].previous=null;if(name==='Entrada em recuperação')r.metrics[3].previous=null;}
  }
  r.headline=`Pagamentos recuperados ${delta(x,y)}`;r.summary=`${money(x)} em ${number(n)} registros de pagamento no intervalo escolhido. Pagamentos e entradas somam o que ocorreu no período. Saldo a recuperar mostra o saldo em uma data.`;
  impact('band','value');decomp(x,y,n,m,'Quantidade de pagamentos','Valor médio por registro');seriesField='value';r.actions=['Conferir processamento e a faixa de atraso de maior impacto.'];
  add('Novos Acordos e Cumpridos','Cumpridos podem vir de acordos anteriores. Por isso, dividir cumprimentos por novos acordos não mostra quantos acordos desse período foram cumpridos.');
  const posDates=Object.keys(d.positions).filter(z=>z>=a&&z<=b).sort(),endDate=posDates.at(-1);
  if(endDate){const g=d.positions[endDate];r.portfolio={date:endDate,principal:Object.values(g).reduce((n,z)=>n+z.principal,0),rows:Object.values(g).reduce((n,z)=>n+z.rows,0),statuses:Object.entries(g).map(([label,z])=>({label,value:z.principal,rows:z.rows}))};r.limits.push(`Carteira mostrada na posição ${date(endDate)}, sem somar saldos dos dias.`);}
 }else if(t.id==='faturamento'){
  if(!current.length)return customLimited(w,'Não há vencimentos do grupo principal no intervalo escolhido.');
  comparable=comparable&&previous.length>0;
  const x=customSum(current,'billed'),y=customSum(previous,'billed'),n=customSum(current,'qty'),m=customSum(previous,'qty'),paid=customSum(current,'paid'),old=customSum(previous,'paid');
  r.metrics=[metric('Valor das faturas do grupo principal',x,'money',y),metric('Quantidade de faturas do grupo principal',n,'number',m),metric('Valor recebido das faturas do grupo principal',paid,'money',old),metric('Percentual recebido do grupo principal',customRatio(paid,x),'percent',customRatio(old,y))];
  r.headline=`Valor das faturas do grupo principal ${delta(x,y)}`;r.summary=`${money(x)} nas faturas com vencimento no intervalo escolhido. Este valor cobre apenas o grupo principal de faturas, não todos os grupos.`;
  impact('cycle','billed');decomp(x,y,n,m,'Quantidade de faturas','Valor médio da fatura');seriesField='billed';r.actions=['Investigar o vencimento de maior impacto e comparar pagamentos com o mesmo tempo após o vencimento.'];r.limits.push('Pagamentos refletem a extração, não mostram como o recebimento estava em uma data passada. grupos adicionais de faturas não foram consolidados no total.');
 }else if(t.id==='descontos'){
  const x=customSum(current,'sales'),y=customSum(previous,'sales'),profit=customSum(current,'profit'),old=customSum(previous,'profit');
  r.metrics=[metric('Venda líquida dos itens',x,'money',y),metric('Lucro líquido dos itens',profit,'money',old),metric('Margem dos Itens (%)',customRatio(profit,x),'percent',customRatio(old,y)),metric('% Vendos descontos / Itens',customRatio(customSum(current,'loyal'),x),'percent',customRatio(customSum(previous,'loyal'),y))];
  r.headline=`Venda dos itens ${delta(x,y)}`;r.summary=`${money(x)} nos itens da base de produtos analisados no intervalo escolhido. desconto é participação observada; não confirma que o desconto gerou vendas adicionais.`;
  impact('group','sales');seriesField='sales';r.actions=['Revisar os departamentos de maior impacto e a margem dos itens.'];r.limits.push('Cupons repetidos por produto não são somados. O arquivo All não foi adicionado ao analítico.');
 }else if(t.id==='risco'){
  const n=customDistinct(d.membership,a,b),m=customDistinct(d.membership,w.pa,w.pb),x=customDistinct(d.membership,a,b,true),y=customDistinct(d.membership,w.pa,w.pb,true),rate=customRatio(x,n),old=customRatio(y,m);
  if(!n)return customLimited(w,'Não há clientes com atraso na primeira fatura definido para primeiros vencimentos no intervalo escolhido.');
  comparable=comparable&&m>0;
  r.metrics=[metric('Taxa de atraso na primeira fatura',rate,'percent',old),metric('Clientes avaliados na primeira fatura',n,'number',m),metric('Clientes com atraso na primeira fatura',x,'number',y)];
  r.headline=comparable?`Taxa de atraso na primeira fatura mudou ${number((rate-old)*100)} pontos percentuais`:'atraso na primeira fatura dos primeiros vencimentos selecionados';r.summary=`${number(x)} clientes distintos com atraso na primeira fatura em ${number(n)} clientes com SIM ou NAO. A seleção usa a data do primeiro vencimento, e não a data da aprovação.`;
  r.limits.push(`Último primeiro vencimento disponível: ${date(d.last_due_date)}. Safras recentes não têm necessariamente o mesmo tempo de observação.`);add('Antes de concluir piora ou melhora','A taxa foi recalculada para os primeiros vencimentos escolhidos, com clientes distintos. Pontuação de crédito, loja e tempo após o vencimento precisam de validação antes de concluir o motivo.');r.actions=['Comparar com o mesmo tempo após o primeiro vencimento.'];
  r.cohorts=[];
  const months=[...new Set(d.membership.flatMap(z=>z.dates).filter(z=>z>=a&&z<=b).map(z=>z.slice(0,7)))].sort();
  r.series=months.map(month=>{const start=a>month+'-01'?a:month+'-01';const end=b<month+'-31'?b:month+'-31';const eligible=customDistinct(d.membership,start,end),bad=customDistinct(d.membership,start,end,true),rate=customRatio(bad,eligible);r.cohorts.push({cohort:month+' · '+date(start)+' a '+date(end),eligible,bad,rate});return {date:start,value:rate==null?null:rate*100};});
 }else if(t.id==='carteira'){
  if(!a.endsWith('-01')||!customShift(b,1).endsWith('-01'))return customLimited(w,'Clientes ativos tem base mensal: selecione meses completos, do primeiro ao último dia. Não existe detalhamento diário nesta fonte.');
  const expectedMonths=(Number(b.slice(0,4))-Number(a.slice(0,4)))*12+Number(b.slice(5,7))-Number(a.slice(5,7))+1;
  const rows=t.monthly_base.filter(z=>z.end>=a&&z.end<=b);if(rows.length!==expectedMonths)return customLimited(w,'Há meses sem cobertura na base de Clientes ativos.');
  comparable=comparable&&w.pa.endsWith('-01')&&customShift(w.pb,1).endsWith('-01');
  const oldRows=t.monthly_base.filter(z=>z.end>=w.pa&&z.end<=w.pb),n=customDistinct(d.membership,a,b),m=customDistinct(d.membership,w.pa,w.pb);
  r.metrics=[metric('Clientes ativos no período',n,'number',m),metric('Quantidade de compras',customSum(rows,'purchases'),'number',customSum(oldRows,'purchases')),metric('Valor das compras',customSum(rows,'sales'),'money',customSum(oldRows,'sales'))];
  r.headline=`Clientes ativos ${delta(n,m)} no intervalo`;r.summary=`${number(n)} clientes ativos distintos na união dos meses escolhidos. Clientes presentes em mais de um mês são contados uma vez.`;r.series=rows.map(z=>({date:z.end,value:z.accounts}));add('Base mensal e união de clientes','O intervalo usa a união de clientes calculada por informações agrupadas por mês. Não soma contagens distintas de meses diferentes.');r.actions=['Separar mudança na base de mudança na frequência de compra.'];r.limits.push('Não equivale às taxas de ativação Anterior/Posterior, ao cadastro de clientes ou à Total de clientes cadastrados.');
 }
 if(seriesField){const s=customGroup(current,'date',seriesField);r.series=Object.entries(s).sort(([a],[b])=>a.localeCompare(b)).map(([date,value])=>({date,value}));}
 if(!comparable){r.limits.push(`Sem cobertura completa no comparativo ${date(w.pa)} a ${date(w.pb)}. Variações e contribuições não foram calculadas.`);add('Comparativo indisponível','O período analisado tem dados, mas faltam dados suficientes no período de comparação. Não apresentamos ausência de histórico como valor zero.');}
 r.comparison.available=comparable;
 return r;
}

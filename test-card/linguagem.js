'use strict';
/** Organizo os textos das análises sem mudar as fórmulas ou os dados.
 * Ajusto os nomes e as explicações ao vocabulário da operação.
 * Apresento hipóteses como perguntas para investigar, sem confirmar causas.
 */
const NOMES_ANALISE = {vendas:'Vendas',propostas:'Solicitações aprovadas',cobranca:'Pagamentos recuperados',faturamento:'Valor das faturas do grupo principal',descontos:'Vendas dos itens analisados',carteira:'Clientes ativos',risco:'Taxa de atraso na primeira fatura'};
const HIPOTESES_ANALISE = {
 vendas:'Mudanças nos produtos comprados ou nas promoções podem alterar a quantidade de compras e o valor médio por compra do cartão. Confira esses dados na loja que mais mudou.',
 propostas:'Mudanças no perfil dos solicitantes ou nas regras de crédito podem alterar a taxa de aprovação. Confira os motivos das recusas e a solicitação correta de cada cliente.',
 cobranca:'A diferença pode estar ligada ao comportamento de pagamento ou ao processamento dos recebimentos. Confira os pagamentos e as datas na faixa de atraso que mais mudou.',
 faturamento:'A quantidade de compras faturadas e o valor das parcelas podem alterar as faturas. Confira os componentes do vencimento que mais mudou. Para pagamentos, compare faturas com o mesmo tempo após o vencimento.',
 descontos:'Mudanças nos produtos vendidos, nas promoções ou na disponibilidade dos arquivos podem alterar o resultado. Confira os itens e os dados do departamento que mais mudou.',
 carteira:'A frequência de compra e a reativação de clientes podem estar relacionadas à mudança. Confira quem comprou em cada período antes de concluir que clientes foram perdidos.',
 risco:'Mudanças no perfil de crédito podem estar relacionadas ao atraso na primeira fatura. Grupos mais recentes também tiveram menos tempo para pagar. Compare grupos com o mesmo tempo após o vencimento e vincule a solicitação correta antes de investigar pontuação de crédito e loja.'
};
function fraseMudanca(nome,x,y,kind='money'){
 if(x==null)return `${nome}: faltam dados para calcular`;
 if(y==null)return `${nome}: sem dados suficientes para comparar`;
 const d=x-y;
 if(Math.abs(d)<1e-9)return `${nome}: sem mudança entre os períodos`;
 const plural=!['Saldo principal em cobrança','Valor das faturas do grupo principal','Taxa de atraso na primeira fatura'].includes(nome);const verb=d>0?(plural?'aumentaram':'aumentou'):(plural?'diminuíram':'diminuiu');
 if(kind==='percent')return `${nome} ${d>0?'aumentou':'diminuiu'} ${number(Math.abs(d)*100)} pontos percentuais`;
 if(y===0)return `${nome} passaram de ${value(y,kind)} para ${value(x,kind)}`;
 return `${nome} ${verb} ${number(Math.abs(d)/Math.abs(y)*100)}%`;
}
function linguagemClara(t,original){
 if(!original||original.status!=='ok')return original;
 const r={...original,metrics:original.metrics.map(m=>({...m}))};
 // Os nomes dos indicadores já chegam padronizados no arquivo de dados.
 if(t.id==='propostas'){const approved=r.metrics.findIndex(m=>m.label==='Aprovadas');if(approved>0)r.metrics.unshift(r.metrics.splice(approved,1)[0]);}
 const m=r.metrics[0],saldo=t.id==='cobranca'&&m.label==='Saldo a recuperar',nome=saldo?'Saldo principal em cobrança':NOMES_ANALISE[t.id]||m.label;
 r.headline=fraseMudanca(nome,m.value,m.previous,m.kind);
 // Evito repetir o sinal negativo: escrevo "diminuíram 11,6%".
 const amount=m.previous==null?'':` ${m.value>=m.previous?'Aumento':'Queda'} de ${value(Math.abs(m.value-m.previous),m.kind)}${m.kind==='number'?' '+(t.id==='propostas'?'propostas':'clientes'):''}.`;
 r.summary=`${nome}: ${value(m.value,m.kind)} no período analisado${m.previous==null?'.':`, contra ${value(m.previous,m.kind)} no período de comparação.`}${m.kind==='percent'?'':amount}`;
 r.calculation_insights=original.calculation_insights||original.insights||[];
 r.insights=[];
 const add=(title,body,confidence='O que os dados mostram',kind='neutral')=>r.insights.push({title,body,confidence,kind});
 const find=label=>r.metrics.find(z=>z.label===label);
 const beforeAfter=(metric,nome)=>metric&&metric.value!=null?`${nome}: ${metric.previous==null?value(metric.value,metric.kind)+' no período analisado.':'passou de '+value(metric.previous,metric.kind)+' para '+value(metric.value,metric.kind)+'.'}`:'';
 if(t.id==='propostas'){
  const n=find('Recebidas'),rate=find('% Aprovadas');
  add('Quantas solicitações foram aprovadas?',r.summary);
  add('O que mudou nas solicitações e nas aprovações?',`${beforeAfter(n,'Solicitações recebidas')} ${beforeAfter(rate,'Taxa de aprovação')} A quantidade aprovada depende de quantas solicitações chegam e quantas são aprovadas.`);
  const denied=find('Recusadas'),pending=find('Pendentes');
  if(denied||pending)add('Recusadas e pendentes',`${beforeAfter(denied,'Solicitações recusadas')} ${beforeAfter(pending,'Solicitações pendentes')} A situação é a observada no arquivo enviado; não mostra como a fila estava em uma data passada.`);
 }else if(t.id==='vendas'){
  add('O que mudou nas vendas?',r.summary);
  add('Quantidade de compras e valor médio por compra do cartão',`${beforeAfter(find('Quantidade de compras'),'Quantidade de compras com o cartão')} ${beforeAfter(find('Valor médio por compra'),'Valor médio de cada compra com o Test Card')} O valor médio por compra do varejo Test Card (V) é outro indicador; não está calculado nesta análise.`);
  const share=find('Participação nas vendas da loja');if(share)add('Quanto o cartão representa nas vendas do varejo?',beforeAfter(share,'Participação do cartão no valor vendido pelo varejo'));
 }else if(t.id==='cobranca'){
  add(saldo?'Como o saldo em cobrança mudou?':'Quanto recebemos em cobrança?',r.summary+(saldo?' É o saldo nas datas comparadas. Não é o total de pagamentos recebidos no ano.':''));
  if(!saldo)add('Pagamentos, acordos e entradas',`${beforeAfter(find('Quantidade de pagamentos'),'Quantidade de registros de pagamento')} ${beforeAfter(find('Novos Acordos')||find('Novos acordos'),'Novos acordos')} ${beforeAfter(find('Valor que entrou em recuperação'),'Valor que entrou em cobrança')} Pagamentos e entradas são movimentos diferentes. A diferença entre eles não explica sozinha o saldo em cobrança.`);
 }else if(t.id==='faturamento'){
  add('O que mudou nas faturas?',r.summary+' Este valor cobre o grupo principal de faturas. Os grupos adicionais aparecem separados.');
  add('Quantidade de faturas e pagamentos',`${beforeAfter(find('Quantidade de faturas do grupo principal'),'Quantidade de faturas do grupo principal')} ${beforeAfter(find('Percentual recebido do grupo principal'),'Percentual pago das faturas do grupo principal')} Vencimentos recentes tiveram menos tempo para receber. Compare com o mesmo tempo após o vencimento antes de concluir que a inadimplência mudou.`);
 }else if(t.id==='descontos'){
  add('Quanto venderam os itens analisados?',r.summary+' O total considera os produtos da base enviada.');
  add('Margem e participação dos descontos',`${beforeAfter(find('Margem dos Itens (%)'),'Margem dos itens')} ${beforeAfter(find('% Vendos descontos / Itens'),'Participação dos descontos nas vendas dos itens')} A participação dos descontos não comprova que o desconto gerou vendas adicionais.`);
 }else if(t.id==='carteira'){
  add('Quantos clientes estão ativos?',r.summary+' Cada cliente é contado uma vez no período.');
  add('Como esses clientes compraram?',`${beforeAfter(find('Quantidade de compras')||find('Compras no ano'),'Quantidade de compras')} ${beforeAfter(find('Valor das compras')||find('Valor comprado no ano'),'Valor das compras')} Menos clientes ativos não significa, por si só, que eles deixaram de ser clientes do cartão.`);
 }else if(t.id==='risco'){
  add('Como mudou o atraso na primeira fatura?',beforeAfter(m,'Taxa de atraso na primeira fatura')+' Pontos percentuais são a diferença entre duas taxas: de 10% para 12%, por exemplo, são 2 pontos percentuais.');
  add('Quantos clientes foram avaliados?',`${beforeAfter(find('Clientes avaliados na primeira fatura'),'Clientes com atraso na primeira fatura definido')} ${beforeAfter(find('Clientes com atraso na primeira fatura'),'Clientes marcados como atraso na primeira fatura')} Cada cliente é contado uma vez. A análise usa o primeiro vencimento, não a data de aprovação.`);
 }
 if(r.drivers?.length){
  const same=r.drivers.filter(z=>Math.sign(z.delta)===Math.sign(m.value-m.previous));const top=same[0]||r.drivers[0];
  const name=t.id==='cobranca'?'Faixa de atraso '+top.label:t.id==='faturamento'?'Faturas com vencimento no dia '+top.label:top.label;
  add('Onde o resultado mais mudou?',`${name}: ${top.delta<0?'queda':'aumento'} de ${value(Math.abs(top.delta),t.id==='propostas'?'number':'money')}${t.id==='propostas'?' solicitações aprovadas':''}, de ${value(top.previous,t.id==='propostas'?'number':'money')} para ${value(top.current,t.id==='propostas'?'number':'money')}. Isso mostra onde houve a mudança; o motivo ainda precisa ser confirmado.`);
 }
 if(HIPOTESES_ANALISE[t.id])add('Possível explicação — ainda precisa ser confirmada',saldo?'Entradas, pagamentos, juros ou renegociações podem alterar o saldo. Confira esses movimentos entre as duas datas antes de atribuir o aumento a menos pagamentos.':HIPOTESES_ANALISE[t.id],'Hipótese para investigar','attention');
 return r;
}

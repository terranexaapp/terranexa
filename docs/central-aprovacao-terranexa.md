# Central de Aprovacao TerraNexa

Este documento define o fluxo comercial para liberar hectares, fazendas,
talhoes e acessos sensiveis quando o TerraNexa operar como produto pago por
area.

## Principio comercial

O contrato pertence a uma `conta`, nao a um usuario individual. A conta tem:

- hectares contratados;
- tolerancia comercial opcional;
- usuarios membros com papeis;
- fazendas e talhoes vinculados;
- solicitacoes de liberacao;
- trilha de auditoria.

O produtor pode convidar pessoas para trabalhar na conta, mas a area ativa nao
pode passar do limite comercial quando `contas.controle_hectares_ativo = true`.

## Papeis recomendados

| Papel | Uso |
|---|---|
| `proprietario` | Titular comercial da conta. |
| `admin` | Administra usuarios e dados da conta. |
| `gerente` | Gerencia operacao da fazenda. |
| `operador` | Registra atividades de campo. |
| `consultor` | Acessa informacoes autorizadas. |
| `terranexa_admin` | Papel no `profiles.papel` para equipe TerraNexa. |
| `comercial` | Papel no `profiles.papel` para aprovar contrato e hectares. |
| `suporte` | Papel no `profiles.papel` para apoio operacional. |

## Hierarquia por fazenda

A vinculacao operacional fica em `fazenda_membros`. O mesmo usuario pode ter
um papel diferente em cada fazenda.

| Papel | Acesso previsto |
|---|---|
| `gerente` | Acesso total as informacoes da fazenda. |
| `agronomo` | Acesso tecnico amplo, sem gestao administrativa sensivel. |
| `tecnico` | Monitoramento, resumo, coleta de pluviometria e mapa principal. |
| `coordenador_equipe` | Resumo de campo, ultimas operacoes, apontamento e fechamento de OS. |
| `operador` | Papel legado para acesso operacional basico. |

Rode `database/009_hierarquia_fazenda_papeis.sql` para criar a matriz
`fazenda_papeis`, liberar a Central TerraNexa para auditar membros por fazenda
e preparar os helpers de permissao.

## Fluxo de liberacao de area

1. O produtor cria ou importa uma fazenda/talhao.
2. O sistema calcula a area ativa da conta.
3. Se a conta nao tiver controle ativo, o fluxo atual continua sem bloqueio.
4. Se o controle estiver ativo e o novo talhao exceder o limite:
   - o talhao fica `ativo = false`;
   - `talhoes.liberacao_status` vira `pendente_validacao`;
   - uma linha nasce em `solicitacoes_liberacao`;
   - um evento nasce em `audit_events`.
5. A equipe TerraNexa analisa documentos, mapa, titularidade e risco.
6. A equipe aprova, aprova parcialmente, rejeita ou pede documentos.

## O que validar

Para cada solicitacao, a equipe deve conferir:

- conta e titular comercial;
- hectares contratados e tolerancia;
- hectares ativos antes da solicitacao;
- hectares solicitados;
- fazenda, municipio e UF;
- geometria/importacao usada;
- possivel sobreposicao com outros talhoes;
- documentos anexados: CAR, matricula, contrato, CNPJ/CPF ou outro;
- historico de mudancas no `audit_events`;
- usuario que solicitou e papel dele na conta.

## Sinais de risco

Marcar como risco medio ou alto quando houver:

- area solicitada acima do contrato;
- aumento acima de 20% do limite liberado;
- mesma documentacao usada em outra conta;
- fazenda muito distante das demais propriedades da conta;
- geometria editada repetidas vezes;
- usuario sem papel administrativo tentando abrir area nova;
- titularidade divergente entre contrato e documentos.

## Estados da solicitacao

| Status | Significado |
|---|---|
| `rascunho` | Pedido ainda incompleto. |
| `pendente_validacao` | Aguardando primeira analise. |
| `em_analise` | Analista TerraNexa esta validando. |
| `aguardando_documentos` | Produtor precisa enviar evidencias. |
| `aprovado` | Liberacao integral. |
| `aprovado_parcial` | Liberacao limitada. |
| `rejeitado` | Pedido negado. |
| `cancelado` | Pedido cancelado. |
| `bloqueado_por_risco` | Bloqueio preventivo por risco alto. |

## Como aprovar na primeira versao

Enquanto a tela administrativa ainda nao existir, a aprovacao pode ser feita
pelo SQL Editor por um usuario interno. Troque `ANALISTA_USER_ID` pelo id do
perfil interno que revisou o pedido.

```sql
-- 1. Marcar a solicitacao como aprovada.
update public.solicitacoes_liberacao
set status = 'aprovado',
    decidido_por = 'ANALISTA_USER_ID',
    decidido_em = now(),
    decisao_observacao = 'Area validada comercialmente.'
where id = 'SOLICITACAO_ID';

-- 2. Liberar o talhao manualmente.
update public.talhoes
set ativo = true,
    liberacao_status = 'aprovado_manual',
    bloqueio_comercial_motivo = null,
    liberacao_validada_por = 'ANALISTA_USER_ID',
    liberacao_validada_em = now()
where id = 'TALHAO_ID';
```

Se a aprovacao envolver aumento de contrato, atualizar a conta e criar nova
assinatura ativa:

```sql
update public.assinaturas
set status = 'encerrada',
    fim_em = now()
where conta_id = 'CONTA_ID'
  and status = 'ativa';

insert into public.assinaturas (
  conta_id,
  plano_nome,
  hectares_contratados,
  hectares_tolerancia,
  status,
  criado_por
) values (
  'CONTA_ID',
  'Plano Comercial 750 ha',
  750,
  0,
  'ativa',
  'ANALISTA_USER_ID'
);

update public.contas
set plano_nome = 'Plano Comercial 750 ha',
    hectares_contratados = 750,
    hectares_tolerancia = 0,
    controle_hectares_ativo = true,
    status = 'ativa'
where id = 'CONTA_ID';
```

## Consultas uteis

Contas perto do limite:

```sql
select *
from public.v_contas_hectares
where status_uso in ('atencao', 'excedido', 'sem_contrato')
order by status_uso, hectares_ativos desc;
```

Fila pendente:

```sql
select
  sl.id,
  c.nome as conta,
  sl.status,
  sl.risco_nivel,
  sl.area_solicitada_ha,
  sl.hectares_ativos_snapshot,
  sl.hectares_contratados_snapshot,
  sl.created_at
from public.solicitacoes_liberacao sl
join public.contas c on c.id = sl.conta_id
where sl.status in ('pendente_validacao', 'em_analise', 'aguardando_documentos')
order by
  case sl.risco_nivel when 'alto' then 1 when 'medio' then 2 else 3 end,
  sl.created_at;
```

Historico de uma conta:

```sql
select evento, ator_tipo, ator_id, payload, created_at
from public.audit_events
where conta_id = 'CONTA_ID'
order by created_at desc;
```

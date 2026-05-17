# Prioridades — adiadas por enquanto

Sugestões salvas pra retomar depois.

## 🟡 Próximas após o Monitoramento

### Validação em browser dos módulos já feitos
- Rodar `database/001H_maquinas.sql`, `001I_produtividades.sql` e `001J_centros_custo.sql` no Supabase
- Testar no preview do Vercel: ConfigPanel → Centros de Custo, NovaOperação/NovaOS exigindo CC, Estoque mostrando top CCs, Relatórios com tabela agregada
- Reportar bugs/ajustes visuais

### Pull Request da branch `claude/modulos-gerenciais`
- Agrupar todos os commits da branch
- Revisar diff arquivo por arquivo no GitHub
- Mergear no `main`

### Gráfico visual no painel "Custos por CC"
- Atualmente é tabela. Adicionar pizza/barras (SVG inline ou conic-gradient — sem libs extras)
- ~30 min de implementação

## 🟢 Etapa 3 dos Centros de Custo (futuro)

- Exportar relatório como PDF/CSV (jsPDF ou similar)
- Filtrar tabela de custos por talhão (multi-select)
- Comparativo entre safras lado-a-lado
- Trends temporais (custo por mês ao longo da safra)
- ~1-2h

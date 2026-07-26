# Plano — Foco+ módulos reais + indicador de plano

Escopo grande. Vou entregar em uma passada, mantendo a identidade visual atual. Nada de dados fictícios — tudo persiste no Supabase existente (`tasks`, `habits`, `habit_logs`, `goals`, `profiles`, `notifications`) e sincroniza via Realtime + React Query.

## 1. Banco de dados (migração única)

Ajustes mínimos, preservando o que já existe:

- `tasks`: garantir colunas `category text`, `estimated_minutes int`, `due_date timestamptz`, `position int`, `priority` como enum (`low|medium|high|urgent`).
- `habits`: `frequency text` (daily|weekly|custom), `frequency_days int[]`, `target_per_week int`.
- `goals`: `period text` (weekly|monthly|custom), `start_date`, `end_date`, `linked_habit_id`, `linked_category`.
- `profiles`: `avatar_url`, `objectives text[]`, `work_days int[]`, `free_days int[]`, `gym boolean`, `gym_time text`, `available_minutes int`, `language text default 'pt-BR'`, `theme_pref text default 'system'`, `notifications_enabled boolean default true`.
- `events` (nova): compromissos do calendário separados de tarefas — `id, user_id, title, description, start_at, end_at, color, source (manual|task), task_id`, com RLS por `auth.uid()` e GRANTs padrão.
- Ativar Realtime em `tasks`, `habits`, `habit_logs`, `goals`, `events`, `profiles`.
- Trigger para recalcular `current_value` das metas quando tarefas/hábitos ligados forem concluídos.

## 2. Tarefas (`/tarefas`)

- CRUD completo com Dialog de criar/editar (título, descrição, prioridade, prazo, tempo estimado, categoria, `scheduled_start`).
- Busca (input) + filtros (status, prioridade, categoria, "hoje/semana/atrasadas").
- Drag-and-drop entre colunas Pendente / Em progresso / Concluída usando `@dnd-kit/core` (já leve).
- Views: Lista (kanban) e Calendário (link para `/calendario`).
- Marcar concluída, reagendar, duplicar, excluir.
- IA: botão "Reorganizar" chama `ai-organize.functions.ts` já existente; quando uma tarefa vence sem conclusão, server function `rescheduleOverdue` redistribui via IA respeitando janelas de trabalho/sono/academia do perfil.

## 3. Calendário (`/calendario`)

- Views Semana + Dia (toggle).
- Drag para mover eventos/tarefas entre slots (atualiza `scheduled_start`/`start_at`).
- Redimensionar para alterar duração.
- Criar evento via clique num slot vazio (Dialog).
- Editar, duplicar, excluir.
- Mostra tarefas agendadas + eventos numa mesma grade (cores diferentes).
- Realtime.

## 4. Hábitos (`/habitos`)

- CRUD + editar frequência (diária, dias da semana específicos, X vezes/semana).
- Toggle diário grava em `habit_logs`, recalcula streak corretamente (considerando frequência, não só ontem).
- Histórico: heatmap dos últimos 90 dias.
- Estatísticas: taxa de conclusão 7/30 dias, melhor streak.

## 5. Metas (`/metas`)

- CRUD + tipo (semanal/mensal/personalizada com datas).
- Vincular a categoria de tarefa ou a um hábito → progresso automático via trigger.
- Progresso manual (+/-) mantido como fallback.
- Barra + % + dias restantes.

## 6. Relatórios (`/relatorios`)

- KPIs reais: horas produtivas (soma de `estimated_minutes` de tarefas concluídas), tarefas concluídas/pendentes, hábitos concluídos, streak geral.
- Gráficos com `recharts` (já disponível no shadcn): barras por dia da semana, linha de produtividade 30 dias, pizza por categoria.
- Dias mais/menos produtivos calculados no cliente a partir de queries agregadas.

## 7. Perfil (`/perfil`)

- Upload de avatar (bucket Storage `avatars`, público, RLS por dono).
- Editar nome, objetivos (chips), horários acordar/dormir, dias trabalho/livres, academia + horário, tempo disponível/dia.
- Alterar email (`supabase.auth.updateUser`) e senha (com confirmação).
- Auto-save com debounce + toast.
- Card do plano (status, trial restante, data de criação).

## 8. Configurações (`/configuracoes`)

- Tema: claro/escuro/sistema (persistir em `profiles.theme_pref`, aplicar via `useTheme`).
- Idioma (pt-BR/en) — persistido, i18n leve via dicionário (sem lib nova; strings pt permanecem default).
- Notificações: toggle + horários trabalho/sono (mesmos campos do perfil, sincronizados).
- Exportar dados (JSON já existe, manter).
- Excluir conta: server function que apaga dados + `auth.admin.deleteUser` via `supabaseAdmin`.
- Logout.

## 9. Indicador de plano (sidebar)

Novo componente `PlanBadge`:

- **Trial ativo** (`trial_ends_at > now`): 🟢 "Teste Grátis" + "Restam Xh Ym" com contador que atualiza a cada 60s. Clique → `/perfil`.
- **Gratuito** (trial expirado, sem premium): ⚪ "Gratuito" + badge "Upgrade disponível". Clique → abre checkout Kiwify.
- **Premium ativo**: 👑 "Premium" em azul + badge "Ativo". Clique → `/perfil` (card de assinatura já existe).
- Reatividade: React Query + subscription Realtime em `profiles` do usuário → muda sem refresh (webhook Kiwify já atualiza a linha). Timer local re-avalia trial expirado.
- Animação de transição entre estados com Framer Motion.

## 10. Qualidade

- Hooks reutilizáveis em `src/lib/` (`use-tasks`, `use-habits`, `use-goals`, `use-events`, `use-realtime-table`).
- Tipos derivados de `integrations/supabase/types.ts`.
- Toasts (`sonner`) em toda ação de escrita.
- Skeletons durante loading inicial.

## Detalhes técnicos

- Nova dep: `@dnd-kit/core` + `@dnd-kit/sortable` para drag-and-drop.
- Realtime: canal por tabela+user_id, teardown no unmount.
- IA reorganização: reutiliza `ai-organize.functions.ts`; adiciona `rescheduleOverdueTasks` server fn com `requireSupabaseAuth`.
- Migração única com GRANTs para cada nova coluna/tabela.
- Sem alterações no design system (cores, tipografia, cards).

## Fora de escopo

- Push notifications nativas (mantém Web Notifications atual).
- Integração com Google Calendar externo.
- Multi-idioma completo além de pt-BR/en básico nas telas de configuração.

Confirma que posso executar tudo isso numa única leva? Se quiser priorizar (ex: só Tarefas + Calendário + PlanBadge primeiro), me diga.

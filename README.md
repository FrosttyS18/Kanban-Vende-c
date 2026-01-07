Projeto: SocialTeam Kanban (Custom Board)
Tipo: Aplicação Web (SaaS Interno) Objetivo: Gerenciamento de tarefas para time de Social Media e Design. Data: 07/01/2026

1. Stack Tecnológica (A Arquitetura)
Para garantir escalabilidade, tempo real e acesso via navegador (Mobile/Desktop) sem instalação.

Frontend (Interface): React.js + TypeScript (Vite).

Estilização: Tailwind CSS + Shadcn/UI (para componentes limpos e profissionais).

Drag & Drop: Biblioteca @dnd-kit/core (moderna e acessível).

Backend & Banco de Dados: Supabase.

Auth: Gerenciamento de usuários.

Database: PostgreSQL.

Realtime: Websockets para atualizações instantâneas.

Storage: Armazenamento de imagens e anexos.

2. Requisitos de Segurança & Acesso
2.1. Autenticação
Método Único: Login Social via Google Workspace.

Restrição de Domínio: O sistema deve rejeitar automaticamente qualquer email que não termine em @suaempresa.com.br.

Sessão: Persistência de login (JWT). Permite acesso simultâneo (Casa/Trabalho) sem derrubar sessões ativas em dispositivos diferentes.

3. Escopo de Interface (UX/UI)
3.1. Visão Geral (Board)
Header:

Logo da empresa.

Barra de Pesquisa Global: Pesquisa por título de card, descrição ou responsável.

Filtro rápido: "Apenas minhas tarefas".

Canvas do Quadro:

Rolagem horizontal para ver as listas.

Background customizável (cor sólida ou gradiente suave).

3.2. As Listas (Colunas)
Estrutura: Cabeçalho (Nome + Contador de cards) + Corpo + Rodapé (Botão "Adicionar cartão").

Scroll Interno: Se a lista "Na Fila" tiver 50 cards, apenas ela deve rolar verticalmente. O restante da tela fica fixo.

Menu da Lista (Simplificado):

Renomear Lista.

Mover todos os cartões (ex: arquivar a semana).

Excluir Lista.

3.3. O Cartão (Card) - Visão Resumida
Capa: Se houver imagem marcada como capa, exibir full-width no topo.

Etiquetas: Exibir pequenas barras coloridas (expandem ao passar o mouse para mostrar o texto).

Título: Texto claro.

Ícones de Status:

Data de entrega (Cor muda conforme urgência: Amarelo=Perto, Vermelho=Atrasado, Verde=Entregue).

Indicador de anexo (clipe).

Indicador de descrição (linhas).

Checklist (ex: 2/5).

Avatares: Fotos dos membros responsáveis no canto inferior direito.

3.4. O Cartão (Modal Detalhado)
Layout de duas colunas (Inspirado nas imagens fornecidas):

Coluna Esquerda (Principal)
Cabeçalho: Título editável e nome da lista atual.

Descrição: Editor de texto rico (Rich Text) com suporte a negrito, listas e links.

Checklists: Barras de progresso visuais. Itens podem ser marcados como feitos.

Anexos:

Lista de arquivos/imagens.

Opção "Definir como Capa" (Make Cover) no menu de contexto do anexo.

Coluna Direita (Lateral - Ações e Meta)
Bloco de Adição: Botões para adicionar Membros, Etiquetas, Checklist, Datas, Anexos.

Datas: Seletor de Data + Hora (ex: 10/01 às 14:00).

Etiquetas: Lista de etiquetas com cores editáveis e texto personalizado.

Ações: Mover, Copiar, Arquivar/Deletar.

Rodapé do Modal (Activity Feed)
Histórico Automático: "Fulano moveu este cartão de 'Doing' para 'Done'".

Comentários: Campo para equipe conversar.

4. Estrutura de Dados (Database Schema)
Sugestão de tabelas para o Supabase:

profiles: (id, email, avatar_url, full_name)

boards: (id, title, background_color)

lists: (id, board_id, title, position_order)

cards: (id, list_id, title, description, due_date, position_order, cover_image_url)

labels: (id, board_id, name, color_hex)

card_labels: (tabela pivô card_id <-> label_id)

card_members: (tabela pivô card_id <-> profile_id)

checklists: (id, card_id, title)

checklist_items: (id, checklist_id, content, is_checked)

activities: (id, card_id, user_id, action_type, created_at)

5. Roadmap de Desenvolvimento
Fase 1: Fundação (Setup & Auth)
[ ] Configurar projeto React + Vite + Tailwind.

[ ] Configurar projeto Supabase.

[ ] Implementar Login Social (Google) restrito ao domínio da empresa.

[ ] Criar Layout base (Sidebar/Header).

Fase 2: O Quadro (Core Mechanics)
[ ] CRUD de Listas (Criar, Editar, Excluir).

[ ] CRUD Básico de Cards (Apenas Título).

[ ] Drag and Drop: Implementar movimentação de cards entre listas e reordenação (usando dnd-kit).

[ ] Persistência da nova ordem no banco de dados.

Fase 3: Detalhes do Card (Heavy Lifting)
[ ] Criar o Modal de 2 colunas.

[ ] Implementar sistema de Upload de Imagens (Supabase Storage).

[ ] Lógica da "Imagem de Capa".

[ ] Seletor de Data e Hora.

[ ] Sistema de Etiquetas (Criação e Vinculação).

[ ] Editor de texto rico para a descrição.

Fase 4: Refinamento e Tempo Real
[ ] Supabase Realtime: Configurar "Subscriptions" para que a tela atualize sozinha quando outro usuário mexer.

[ ] Scroll interno nas listas (CSS overflow-y-auto).

[ ] Barra de Pesquisa Global.

[ ] Filtro "Minhas Tasks".

Fase 5 (Bônus/Futuro)
[ ] Visualização de Calendário (Alternar Board/Calendar).

[ ] Notificações por e-mail (quando marcado em um card).

Observações Técnicas Importantes
Mobile Friendly: O sistema deve funcionar via navegador no celular (responsivo), permitindo ao menos visualizar e comentar tarefas.

Performance: As imagens de capa devem ser otimizadas/redimensionadas no upload para não pesar o carregamento do quadro.
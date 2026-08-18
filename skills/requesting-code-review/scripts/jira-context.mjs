#!/usr/bin/env node
// Busca uma issue do Jira Cloud, suas subtarefas e suas issues filhas de Epic,
// gerando um arquivo markdown de contexto para o subagente revisor de código.
//
// Uso:   node jira-context.mjs CISS-180745
// Saída: imprime em stdout apenas o caminho absoluto do markdown gerado.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const RAIZ_SKILL = dirname(dirname(fileURLToPath(import.meta.url)));
const CAMINHO_ENV = join(RAIZ_SKILL, '.env');
const DIR_SAIDA = join(homedir(), '.claude', 'reviews');
const MAX_FILHOS = 30;
// Tempo limite por requisição. coletaFilhos faz até MAX_FILHOS chamadas em
// série: sem um limite, um Jira degradado transformaria uma execução de dez
// segundos em minutos de espera sem nenhum retorno para o usuário.
const TEMPO_LIMITE_MS = 30_000;

// Campos pedidos ao Jira. Manter enxuto: cada campo extra engorda o arquivo
// que o revisor vai ler.
const CAMPOS = [
  'summary', 'description', 'issuetype', 'status', 'priority',
  'assignee', 'reporter', 'fixVersions', 'labels', 'resolution', 'subtasks',
];

// Encerra o processo com mensagem em stderr e código 1.
function erro(mensagem) {
  console.error(`ERRO: ${mensagem}`);
  process.exit(1);
}

// Lê o .env da pasta da skill e devolve a base da URL e o header Basic já
// montado. Falha nomeando a variável ausente, para o usuário saber o que
// corrigir sem abrir o código.
function carregaCredenciais() {
  let bruto;
  try {
    bruto = readFileSync(CAMINHO_ENV, 'utf8');
  } catch (falha) {
    // Só ENOENT justifica mandar copiar o .env.example. Permissão negada
    // (EACCES) ou um caminho que virou diretório (EISDIR) precisam do código
    // real do erro: o conselho de copiar o exemplo não resolveria nada.
    if (falha.code === 'ENOENT') {
      erro(
        `Arquivo de credenciais não encontrado: ${CAMINHO_ENV}\n` +
        `Copie .env.example para .env na mesma pasta e preencha os valores.`
      );
    }
    erro(`Falha ao ler o arquivo de credenciais ${CAMINHO_ENV}: ${falha.code ?? falha.message}`);
  }

  const env = {};
  for (const linha of bruto.split(/\r?\n/)) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith('#')) continue;
    const pos = limpa.indexOf('=');
    if (pos === -1) continue;
    env[limpa.slice(0, pos).trim()] = limpa.slice(pos + 1).trim();
  }

  for (const nome of ['JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN']) {
    if (!env[nome]) erro(`Variável ${nome} ausente ou vazia em ${CAMINHO_ENV}`);
  }

  return {
    base: env.JIRA_BASE_URL.replace(/\/+$/, ''),
    auth: Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString('base64'),
  };
}

// Executa uma requisição autenticada na API do Jira e devolve o JSON.
// Anexa o status HTTP ao erro para quem chama decidir a mensagem. Falhas de
// rede e estouro de tempo viram Error com mensagem legível, para nunca
// chegarem ao usuário como stack trace crua.
async function chamaJira(cred, caminho, corpo = null) {
  let resposta;
  try {
    resposta = await fetch(`${cred.base}${caminho}`, {
      method: corpo ? 'POST' : 'GET',
      headers: {
        Authorization: `Basic ${cred.auth}`,
        Accept: 'application/json',
        ...(corpo ? { 'Content-Type': 'application/json' } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
  } catch (falha) {
    const detalhe = falha?.name === 'TimeoutError'
      ? `tempo limite de ${TEMPO_LIMITE_MS / 1000}s excedido`
      : (falha?.message ?? String(falha));
    throw new Error(`falha de rede em ${caminho}: ${detalhe}`);
  }

  if (!resposta.ok) {
    const falha = new Error(`HTTP ${resposta.status} em ${caminho}`);
    falha.status = resposta.status;
    throw falha;
  }

  try {
    return await resposta.json();
  } catch (falha) {
    throw new Error(`resposta ilegível (JSON inválido) em ${caminho}: ${falha?.message ?? String(falha)}`);
  }
}

// Busca uma issue completa pela chave, com os campos que interessam à revisão.
async function buscaIssue(cred, chave) {
  const params = new URLSearchParams({ fields: CAMPOS.join(',') });
  return chamaJira(cred, `/rest/api/2/issue/${encodeURIComponent(chave)}?${params}`);
}

// Busca as issues filhas via JQL. Tenta o endpoint novo do Cloud (/search/jql)
// e cai para o antigo (/search) caso o site ainda não o exponha.
// Pede MAX_FILHOS + 1 resultados (nas duas variantes) de propósito: esse item
// extra é o único sinal de que existe excedente. O endpoint novo é paginado
// por token e não devolve `total`, então não há como saber quantos filhos a
// issue tem de verdade - por isso coletaFilhos apenas sinaliza que o limite
// foi ultrapassado, sem inventar uma contagem.
async function buscaFilhasPorJql(cred, chave) {
  const jql = `parent = "${chave}" ORDER BY key ASC`;
  try {
    const r = await chamaJira(cred, '/rest/api/2/search/jql', {
      jql,
      fields: ['summary'],
      maxResults: MAX_FILHOS + 1,
    });
    return r.issues ?? [];
  } catch (falha) {
    if (falha.status !== 404 && falha.status !== 410) throw falha;
    const params = new URLSearchParams({
      jql,
      fields: 'summary',
      maxResults: String(MAX_FILHOS + 1),
    });
    const r = await chamaJira(cred, `/rest/api/2/search?${params}`);
    return r.issues ?? [];
  }
}

// Reúne os filhos da issue: subtarefas diretas mais o resultado da JQL
// `parent =`. Deduplica por chave, porque a JQL também devolve as subtarefas já
// listadas em fields.subtasks. Cada filho é buscado por completo para termos
// sua descrição, que não vem no resumo de fields.subtasks.
// `excedeuLimite` é booleano de propósito: dá para saber que existem mais
// filhos do que o limite, mas não quantos (veja buscaFilhasPorJql).
async function coletaFilhos(cred, principal) {
  const chaves = [];
  const vistas = new Set();

  for (const sub of principal.fields.subtasks ?? []) {
    if (!vistas.has(sub.key)) {
      vistas.add(sub.key);
      chaves.push(sub.key);
    }
  }

  let avisoJql = null;
  try {
    for (const filha of await buscaFilhasPorJql(cred, principal.key)) {
      if (!vistas.has(filha.key)) {
        vistas.add(filha.key);
        chaves.push(filha.key);
      }
    }
  } catch (falha) {
    avisoJql = `busca de issues filhas por JQL falhou (${falha.message}); apenas as subtarefas diretas estão listadas`;
  }

  const excedeuLimite = chaves.length > MAX_FILHOS;
  const filhos = [];
  for (const chave of chaves.slice(0, MAX_FILHOS)) {
    try {
      filhos.push(await buscaIssue(cred, chave));
    } catch (falha) {
      filhos.push({ key: chave, indisponivel: falha.message });
    }
  }

  return { filhos, excedeuLimite, avisoJql };
}

// Envolve o texto da descrição em uma cerca de crases mais longa do que
// qualquer sequência de crases já presente nele (mesma regra do CommonMark
// para blocos cercados). Assim a descrição nunca consegue "escapar" da cerca
// e fingir ser um título do documento gerado nem injetar instruções soltas
// no meio do arquivo que o subagente revisor vai ler.
function cercaDescricao(texto) {
  const sequencias = texto.match(/`+/g) ?? [];
  const maiorSequencia = Math.max(0, ...sequencias.map((s) => s.length));
  const cerca = '`'.repeat(Math.max(3, maiorSequencia + 1));
  return `${cerca}text\n${texto}\n${cerca}`;
}

// Formata uma issue como seção markdown. `nivel` define a profundidade do título.
function secaoIssue(issue, nivel) {
  const titulo = '#'.repeat(nivel);

  if (issue.indisponivel) {
    return `${titulo} ${issue.key}\n\nNão foi possível buscar esta issue: ${issue.indisponivel}\n`;
  }

  const f = issue.fields;
  const nomes = (itens) => (itens ?? []).map((i) => i.name).join(', ') || '-';
  // Sites com editor rico devolvem `description` como objeto (ADF) em vez de
  // texto. Converter antes de usar evita que .match estoure em cercaDescricao
  // e derrube o script com uma stack trace crua.
  const descricao = String(f.description ?? '').trim();
  // `summary` é o único campo que vira estrutura do documento (um título ###).
  // Uma quebra de linha nele encerraria o título e jogaria o resto do texto
  // solto no arquivo que o revisor lê.
  const resumo = String(f.summary ?? '').replace(/[\r\n]+/g, ' ').trim();

  return [
    `${titulo} ${issue.key} - ${resumo}`,
    '',
    `- Tipo: ${f.issuetype?.name ?? '-'}`,
    `- Status: ${f.status?.name ?? '-'}`,
    `- Prioridade: ${f.priority?.name ?? '-'}`,
    `- Resolução: ${f.resolution?.name ?? 'Não resolvida'}`,
    `- Responsável: ${f.assignee?.displayName ?? '-'}`,
    `- Relator: ${f.reporter?.displayName ?? '-'}`,
    `- Versões corrigidas: ${nomes(f.fixVersions)}`,
    `- Labels: ${(f.labels ?? []).join(', ') || '-'}`,
    '',
    `${'#'.repeat(nivel + 1)} Descrição`,
    '',
    descricao ? cercaDescricao(descricao) : '(sem descrição)',
    '',
  ].join('\n');
}

// Ponto de entrada: valida o argumento, busca issue e filhos, grava o markdown.
async function main() {
  const chave = process.argv[2];
  if (!chave) {
    return erro('Informe a chave da issue. Exemplo: node jira-context.mjs CISS-180745');
  }
  if (!/^[A-Z][A-Z0-9]*-\d+$/.test(chave)) {
    return erro(`Chave inválida: "${chave}". Formato esperado: PROJETO-123`);
  }

  const cred = carregaCredenciais();

  let principal;
  try {
    principal = await buscaIssue(cred, chave);
  } catch (falha) {
    if (falha.status === 401) return erro('Token ou e-mail inválidos (HTTP 401).');
    if (falha.status === 403) return erro(`Sem permissão para ler ${chave} (HTTP 403).`);
    if (falha.status === 404) return erro(`Issue ${chave} não existe ou não é visível para este usuário (HTTP 404).`);
    return erro(`Falha ao buscar ${chave}: ${falha.message}`);
  }

  const { filhos, excedeuLimite, avisoJql } = await coletaFilhos(cred, principal);

  const partes = [
    `# Contexto Jira - ${chave}`,
    '',
    `Origem: ${cred.base}/browse/${chave}`,
    '',
  ];

  if (avisoJql) partes.push(`> Aviso: ${avisoJql}`, '');

  partes.push('## Issue principal', '', secaoIssue(principal, 3));

  if (filhos.length) {
    partes.push(`## Filhos (${filhos.length})`, '');
    for (const filho of filhos) partes.push(secaoIssue(filho, 3));
  } else {
    partes.push('## Filhos', '', 'Nenhuma subtarefa ou issue filha encontrada.', '');
  }

  if (excedeuLimite) {
    partes.push(
      `> Há mais de ${MAX_FILHOS} filhos nesta issue; apenas os ${MAX_FILHOS} primeiros foram incluídos.`,
      ''
    );
  }

  mkdirSync(DIR_SAIDA, { recursive: true });
  const destino = join(DIR_SAIDA, `jira-${chave}.md`);
  writeFileSync(destino, partes.join('\n'), 'utf8');
  console.log(destino);
}

main().catch((falha) => erro(falha.stack ?? String(falha)));

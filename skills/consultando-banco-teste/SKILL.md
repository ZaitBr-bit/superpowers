---
name: consultando-banco-teste
description: Use when precisar consultar dados em banco DB2 de testes do CISSPoder (ex.: CONSBEL) para investigar bug, conferir custos, configurações, movimentos de estoque ou cadastros — SOMENTE LEITURA, salvo pedido explícito do usuário
---

# Consulta SQL em banco de testes (DB2)

## Regra principal
**APENAS LEITURA.** Executar somente `SELECT`. Nunca rodar `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CALL` ou qualquer DDL/DML sem o usuário pedir explicitamente aquela alteração. O helper abre a conexão com `setReadOnly(true)`; se o usuário autorizar escrita, usar outra forma e informar o que foi alterado.

## Dados de conexão (banco de testes, credenciais genéricas)
- Host: `10.250.0.4`
- Porta: `50003`
- Banco: `CONSBEL` (confirmar com o usuário se for outro banco/host/porta)
- Usuário: `dba` (o `db2inst1` NÃO autentica)
- Senha: **solicitar ao usuário** antes da primeira consulta da sessão (ver abaixo)
- Schema das tabelas: `DBA`

## Senha
A senha não fica nesta skill. Antes da primeira consulta, pedir a senha ao usuário e aguardar a resposta; não tentar adivinhar nem procurar em outros arquivos.
- Usar a senha somente na variável `DBP` da própria linha de comando. Não gravar em arquivo (nem no scratchpad), script, commit ou memória.
- Não repetir a senha em mensagens, resumos ou descrições de comando.
- Se a conexão falhar por autenticação (`SQLCODE=-4214` / `ERRORCODE=-4214`), pedir a senha de novo em vez de tentar variações.

## Como executar
O `db2.exe` do SQLLIB não funciona direto no terminal (erro DB21061E) e `java Q.java` com `-cp` falha com o JRE do PATH. Usar o driver JDBC com o JDK 8:

1. Copiar `Q.java` (desta pasta) para o scratchpad da sessão e compilar uma vez:
```
J="/c/Program Files/Eclipse Adoptium/jdk-8.0.502.7-hotspot/bin"
"$J/javac" -cp "C:/PROGRA~1/IBM/SQLLIB/java/db2jcc4.jar" Q.java
```
2. Executar uma ou várias consultas (cada argumento é um SELECT):
```
export DBN=CONSBEL DBU=dba DBP='<senha informada pelo usuário>'
"$J/java" -cp ".;C:/PROGRA~1/IBM/SQLLIB/java/db2jcc4.jar" Q "SELECT CURRENT SERVER FROM SYSIBM.SYSDUMMY1"
```
Variáveis de ambiente não persistem entre chamadas do Bash: repetir o `export` em cada comando que executa `Q`.

## Descoberta de tabelas e colunas
Os nomes reais diferem do que se imagina (ex.: flag de custo do COI está em `OPERACAO_INTERNA`, não em `COI`). Descobrir antes de chutar:
```
SELECT TABSCHEMA, TABNAME FROM SYSCAT.COLUMNS WHERE COLNAME='FLAGATUALIZACUSTO'
SELECT COLNAME FROM SYSCAT.COLUMNS WHERE TABNAME='ESTOQUE_ANALITICO'
SELECT TABNAME FROM SYSCAT.TABLES WHERE TABNAME LIKE 'TRANSFERENCIA%'
```
Erros comuns: `SQLCODE=-204` (tabela inexistente), `-206` (coluna inexistente) — consultar `SYSCAT.COLUMNS`. Usar `FETCH FIRST n ROWS ONLY` em tabelas grandes.

## Tabelas úteis já mapeadas
- `OPERACAO_INTERNA` (COI): `IDOPERACAO`, `FLAGATUALIZACUSTO`
- `POLITICA_PRECO_PRODUTO`: custos por empresa (`VALCUSTOREPOS`, `CUSTOGERENCIAL`, `CUSTONOTAFISCAL`, `CUSTOULTIMACOMPRA`, `DTALTERACAO`)
- `PRODUTO_GRADE`: `MULTIPLICADORPRODUCAO`, `IDPRODUTOTRANSFERENCIA`, `IDSUBPRODUTOTRANSFERENCIA`
- `ESTOQUE_ANALITICO`: movimentos (`IDPLANILHA`, `IDOPERACAO`, `QTDPRODUTO`, `VALUNITBRUTO`, `DTMOVIMENTO`)
- `TRANSFERENCIA_AVULSA`, `PRODUCAO_TRANSFERENCIA_ESTOQUE`, `ESTOQUE_ANALITICO_TMP` (pendentes)
- `CONFIG_ESTOQUE`, `CONFIG_ATRIBUTO_VALORES` (`IDATRIBUTO`, `V_VARCHAR`)

## Cuidados
- É base de testes compartilhada: não assumir que o estado atual é o da simulação do usuário; datas de alteração (`DTALTERACAO`) ajudam a ordenar o que aconteceu.
- Relatar ao usuário o que foi consultado e o que não foi possível verificar.

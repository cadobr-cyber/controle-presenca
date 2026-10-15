// Execute apenas no computador do administrador. Nunca publique este arquivo junto com a chave.
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('node:fs');
const path = require('node:path');

const base = __dirname;
const chave = path.join(base, 'privado', 'firebase-admin-key.json');
const arquivo = path.join(base, 'hev_convidados_189_importacao.json');
if (!fs.existsSync(chave) || !fs.existsSync(arquivo)) {
  console.error('Faltam privado/firebase-admin-key.json ou hev_convidados_189_importacao.json nesta pasta.');
  process.exit(1);
}
const medicos = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
if (medicos.length !== 189 || new Set(medicos.map(m => m.numero)).size !== 189 ||
  medicos.some(m => !m.nome || !Number.isInteger(m.numero) || m.numero < 1 || m.numero > 189)) {
  throw new Error('Conferência falhou: esperados 189 médicos válidos com números únicos de 1 a 189.');
}
initializeApp({ credential: cert(require(chave)) });
const db = getFirestore();
db.settings({ preferRest: true });
(async () => {
  const colecao = db.collection('hev_medicos');
  const ids = medicos.map(m => `convidado_${String(m.numero).padStart(3, '0')}`);
  const refs = ids.map(id => colecao.doc(id));
  const atuais = await db.getAll(...refs);
  const existentes = atuais.filter(s => s.exists);
  if (existentes.length) {
    console.error(`IMPORTAÇÃO CANCELADA: ${existentes.length} registros convidados já existem. Nenhuma presença foi sobrescrita.`);
    process.exitCode = 1;
    return;
  }
  const batch = db.batch();
  medicos.forEach((m, i) => batch.create(refs[i], {
    numero: m.numero,
    nome: String(m.nome).trim(),
    crm: String(m.crm || '').trim(),
    especialidade: String(m.especialidade || '').trim(),
    presente: false,
    horario: null,
  }));
  await batch.commit();
  const checagem = await db.getAll(...refs);
  const gravados = checagem.filter(s => s.exists).length;
  console.log(`IMPORTAÇÃO CONCLUÍDA: ${gravados}/189 médicos gravados na coleção hev_medicos.`);
})().catch(e => { console.error('Erro ao importar:', e.message); process.exitCode = 1; });

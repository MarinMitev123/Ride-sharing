const fs = require('fs');
const path =
  'C:/Users/Marin Mitev/.cursor/projects/c-Users-Marin-Mitev-Diplomna/agent-transcripts/9c45e542-863e-4df6-9b65-03e69b8e2f62/9c45e542-863e-4df6-9b65-03e69b8e2f62.jsonl';
const out = 'C:/Users/Marin Mitev/Diplomna/docs/GLAVA_3_VAZSTANOVENA_OT_CHAT.md';
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean);
const sections = [
  { line: 95, title: 'Plan i struktura' },
  { line: 104, title: 'Palen tekst v1 PostgreSQL - ostaryala' },
  { line: 108, title: 'Palen tekst v2 MySQL' },
  { line: 113, title: 'Stil na primera bulleti n' },
  { line: 116, title: 'Razshirena versiya MySQL - PREPORUCHITELNA' },
  { line: 118, title: 'Instrukcii Fig 3.1 MVC' },
  { line: 121, title: 'Instrukcii Fig 3.2 ER' },
];
let md = '# Glava 3 - vazstanoveno ot chat 9c45e542\n\n';
md += 'Za Word kopirai razdel PREPORUCHITELNA + instrukciite za figurite.\n\n---\n\n';
for (const s of sections) {
  const obj = JSON.parse(lines[s.line - 1]);
  let text = '';
  for (const part of obj.message?.content || []) {
    if (part.type === 'text') text += part.text;
  }
  text = text.replace(/\[REDACTED\]/g, '').trim();
  md += '## ' + s.title + '\n\n' + text + '\n\n---\n\n';
}
fs.mkdirSync('C:/Users/Marin Mitev/Diplomna/docs', { recursive: true });
fs.writeFileSync(out, md, 'utf8');
console.log('OK', out, fs.statSync(out).size, 'bytes');

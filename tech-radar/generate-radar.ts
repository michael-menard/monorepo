import fs from 'fs';
import path from 'path';

const radarPath = path.join(__dirname, 'radar.json');
const outputPath = path.join(__dirname, 'radar.md');

interface Entry {
  name: string;
  quadrant: string;
  ring: string;
  description: string;
}

interface Radar {
  quadrants: { name: string }[];
  rings: { name: string; color: string }[];
  entries: Entry[];
}

function generateMermaid(radar: Radar): string {
  let md = '# Tech Radar (Mermaid)\n\n';
  md += '```mermaid\n';
  md += 'graph TD\n';
  radar.quadrants.forEach((q, qi) => {
    md += `  Q${qi}([${q.name}])\n`;
  });
  radar.rings.forEach((r, ri) => {
    md += `  R${ri}([${r.name}])\n`;
  });
  radar.entries.forEach((e, i) => {
    const qIdx = radar.quadrants.findIndex(q => q.name === e.quadrant);
    const rIdx = radar.rings.findIndex(r => r.name === e.ring);
    md += `  E${i}["${e.name}"]:::${e.ring.toLowerCase()}\n`;
    md += `  Q${qIdx} --> E${i}\n`;
    md += `  R${rIdx} --> E${i}\n`;
  });
  // Add style for rings
  radar.rings.forEach((r) => {
    md += `  classDef ${r.name.toLowerCase()} fill:${r.color},stroke:#333,stroke-width:1px;\n`;
  });
  md += '```\n\n';
  md += '---\n';
  md += '## Entries\n';
  radar.entries.forEach((e) => {
    md += `- **${e.name}** (${e.quadrant}, ${e.ring}) - ${e.description}\n`;
  });
  return md;
}

function main() {
  const radar: Radar = JSON.parse(fs.readFileSync(radarPath, 'utf-8'));
  const md = generateMermaid(radar);
  fs.writeFileSync(outputPath, md);
  console.log('Tech radar generated at', outputPath);
}

main();

// To extend: generate SVG or interactive web radar using D3 or similar 
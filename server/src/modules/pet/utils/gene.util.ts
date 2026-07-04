export function generateGeneCode(fatherGene = 'AAAA', motherGene = 'AAAA') {
  const mutationGenes = ['C', 'B', 'A', 'S'];
  let result = '';

  for (let i = 0; i < 4; i++) {
    const r = Math.random();

    if (r < 0.45) {
      result += fatherGene[i] || 'A';
    } else if (r < 0.9) {
      result += motherGene[i] || 'A';
    } else {
      result += mutationGenes[Math.floor(Math.random() * mutationGenes.length)];
    }
  }

  return result;
}

export function calculateGeneScore(geneCode: string) {
  let score = 0;

  for (const gene of geneCode) {
    if (gene === 'C') score += 1;
    if (gene === 'B') score += 2;
    if (gene === 'A') score += 3;
    if (gene === 'S') score += 5;
  }

  return score;
}
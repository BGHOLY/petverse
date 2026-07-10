const VALID_GENES = ['C', 'B', 'A', 'S'] as const;
const DEFAULT_GENE = 'A';
const GENE_LENGTH = 4;

export interface GeneInheritanceResult {
  geneCode: string;
  mutationCount: number;
  mutationLoci: number[];
}

export function normalizeGeneCode(geneCode = 'AAAA') {
  const normalized = String(geneCode || '')
    .toUpperCase()
    .replace(/[^CBAS]/g, '');

  return Array.from({ length: GENE_LENGTH }, (_, index) => {
    const gene = normalized[index];
    return VALID_GENES.includes(gene as (typeof VALID_GENES)[number])
      ? gene
      : DEFAULT_GENE;
  }).join('');
}

export function inheritGeneCode(
  fatherGene = 'AAAA',
  motherGene = 'AAAA',
  mutationRate = 0.06,
  random: () => number = Math.random,
): GeneInheritanceResult {
  const father = normalizeGeneCode(fatherGene);
  const mother = normalizeGeneCode(motherGene);
  const mutationLoci: number[] = [];
  let result = '';

  for (let index = 0; index < GENE_LENGTH; index += 1) {
    const inherited = random() < 0.5 ? father[index] : mother[index];
    let gene = inherited;

    if (random() < Math.max(0, Math.min(1, mutationRate))) {
      const mutationPool = VALID_GENES.filter(
        (candidate) => candidate !== inherited,
      );
      gene =
        mutationPool[Math.floor(random() * mutationPool.length)] ||
        inherited;
      mutationLoci.push(index);
    }

    result += gene;
  }

  return {
    geneCode: result,
    mutationCount: mutationLoci.length,
    mutationLoci,
  };
}

export function generateGeneCode(
  fatherGene = 'AAAA',
  motherGene = 'AAAA',
) {
  return inheritGeneCode(fatherGene, motherGene).geneCode;
}

export function calculateGeneScore(geneCode: string) {
  const scoreMap: Record<string, number> = {
    C: 1,
    B: 2,
    A: 3,
    S: 5,
  };

  return [...normalizeGeneCode(geneCode)].reduce(
    (score, gene) => score + (scoreMap[gene] || 0),
    0,
  );
}

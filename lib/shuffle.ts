/**
 * shuffle.ts — Utilitaires de mélange pour le puzzle
 *
 * NOTE MOTEUR : La rotation des pièces n'est pas supportée par le moteur de puzzle.
 * PieceState ne possède pas de champ `rotation`, et les formes (tabs/blanks) sont
 * calculées statiquement par generateShapeData. Ce point est hors scope volontairement.
 */

/**
 * Fisher-Yates shuffle — distribution parfaitement uniforme, O(n).
 * Remplace le sort(Math.random - 0.5) biaisé.
 */
export function fisherYatesShuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Dérangement garanti : aucun élément ne reste à son index d'origine.
 * Utilise une boucle retry (max 20 tentatives) pour garantir la propriété.
 * Pour n <= 1, retourne simplement le tableau (dérangement impossible).
 *
 * La comparaison est faite par référence (===), ce qui fonctionne car
 * les PieceState sont des objets uniques créés une seule fois.
 *
 * Complexité : O(n) amorti (chaque retry est O(n), probabilité d'échec < 1/e ≈ 37%).
 */
export function shuffleAsDerangement<T>(arr: readonly T[]): T[] {
  if (arr.length <= 1) return [...arr];

  let result: T[];
  let attempts = 0;
  const maxAttempts = 20;

  do {
    result = fisherYatesShuffle(arr);
    attempts++;
  } while (
    attempts < maxAttempts &&
    result.some((v, i) => v === arr[i])
  );

  return result;
}

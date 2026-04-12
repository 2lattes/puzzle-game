export type EdgeType = 0 | 1 | -1;

export type PieceShapeData = {
  top: EdgeType;
  right: EdgeType;
  bottom: EdgeType;
  left: EdgeType;
};

/**
 * Génère la matrice de connexions pour une grille de puzzle N x N
 */
export function generateShapeData(gridN: number): PieceShapeData[][] {
  const horizontalEdges: (1 | -1)[][] = []; // gridN-1 rows of gridN cols
  const verticalEdges: (1 | -1)[][] = []; // gridN rows of gridN-1 cols
  
  for (let r = 0; r < gridN - 1; r++) {
    const row: (1 | -1)[] = [];
    for (let c = 0; c < gridN; c++) {
      row.push(Math.random() > 0.5 ? 1 : -1);
    }
    horizontalEdges.push(row);
  }
  
  for (let r = 0; r < gridN; r++) {
    const row: (1 | -1)[] = [];
    for (let c = 0; c < gridN - 1; c++) {
      row.push(Math.random() > 0.5 ? 1 : -1);
    }
    verticalEdges.push(row);
  }

  const shapes: PieceShapeData[][] = [];
  for (let r = 0; r < gridN; r++) {
    const rowShapes: PieceShapeData[] = [];
    for (let c = 0; c < gridN; c++) {
      rowShapes.push({
        top: r === 0 ? 0 : (horizontalEdges[r - 1][c] === 1 ? -1 : 1),
        right: c === gridN - 1 ? 0 : verticalEdges[r][c],
        bottom: r === gridN - 1 ? 0 : horizontalEdges[r][c],
        left: c === 0 ? 0 : (verticalEdges[r][c - 1] === 1 ? -1 : 1)
      });
    }
    shapes.push(rowShapes);
  }
  return shapes;
}

/**
 * Dessine un bord de puzzle avec ou sans encoche (tab/blank)
 */
function getEdgePath(
  x1: number, 
  y1: number, 
  x2: number, 
  y2: number, 
  type: EdgeType, 
  sz: number
): string {
  if (type === 0) {
    return `L ${x2} ${y2} `;
  }
  
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  
  // Tangente unitaire
  const tx = dx / length;
  const ty = dy / length;
  
  // Normale pointant vers "l'extérieur" (convention SVG avec rotation horaire des bords)
  const nx = ty; 
  const ny = -tx;

  // Fonction utilitaire pour placer un point en utilisant t (pourcentage de la distance) 
  // et n (pourcentage de la taille de l'encoche, décalage selon la normale)
  const P = (t: number, n: number) => {
    // Si type = 1 (tab) -> s'éloigne de la pièce (vers l'extérieur).
    // Si type = -1 (blank) -> rentre dans la pièce (vers l'intérieur).
    const px = x1 + t * dx + n * sz * type * nx;
    const py = y1 + t * dy + n * sz * type * ny;
    return `${px.toFixed(2)} ${py.toFixed(2)}`;
  };

  let path = '';
  // La logique de tracé utilise des courbes de Bézier cubiques (C)
  // Ligne jusqu'à la base gauche de l'encoche
  path += `L ${P(0.38, 0)} `;
  // Courbe pour dessiner le côté gauche de l'encoche
  path += `C ${P(0.38, 0.2)}, ${P(0.3, 1.0)}, ${P(0.5, 1.0)} `;
  // Courbe pour le côté droit
  path += `C ${P(0.7, 1.0)}, ${P(0.62, 0.2)}, ${P(0.62, 0)} `;
  // Ligne finale
  path += `L ${P(1.0, 0)} `;
  
  return path;
}

/**
 * Construit un path SVG complet pour une pièce
 */
export function getPiecePath(
  width: number, 
  height: number, 
  shape: PieceShapeData
): string {
  const sz = Math.min(width, height) * 0.25;
  
  let path = `M 0 0 `;
  
  // Top edge: de (0,0) à (width,0)
  path += getEdgePath(0, 0, width, 0, shape.top, sz);
  // Right edge: de (width,0) à (width,height)
  path += getEdgePath(width, 0, width, height, shape.right, sz);
  // Bottom edge: de (width,height) à (0,height)
  path += getEdgePath(width, height, 0, height, shape.bottom, sz);
  // Left edge: de (0,height) à (0,0)
  path += getEdgePath(0, height, 0, 0, shape.left, sz);
  
  path += 'Z';
  return path;
}

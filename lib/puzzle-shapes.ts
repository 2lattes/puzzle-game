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

  // Centre du bord : on y ancre notre encoche pour ne pas l'étirer
  const cx = x1 + dx / 2;
  const cy = y1 + dy / 2;

  // Fonction utilitaire pour placer un point depuis le centre (cx, cy)
  // u : décalage le long de l'axe (proportionnel à sz)
  // v : décalage vers l'extérieur (proportionnel à sz)
  const P = (u: number, v: number) => {
    // Si type = 1 -> encoche s'éloigne (tab)
    // Si type = -1 -> encoche rentre (blank)
    const px = cx + u * sz * tx + v * sz * type * nx;
    const py = cy + u * sz * ty + v * sz * type * ny;
    return `${px.toFixed(2)} ${py.toFixed(2)}`;
  };

  let path = '';
  // La logique de tracé utilise des courbes de Bézier cubiques (C)
  
  // Ligne droite de (x1, y1) jusqu'à la base gauche de l'encoche
  path += `L ${P(-0.35, 0)} `;
  // Courbe pour le côté gauche de l'encoche (crée un cou fin puis s'évase)
  path += `C ${P(-0.35, 0.3)}, ${P(-0.8, 0.8)}, ${P(0, 0.8)} `;
  // Courbe pour le côté droit de l'encoche
  path += `C ${P(0.8, 0.8)}, ${P(0.35, 0.3)}, ${P(0.35, 0)} `;
  // Ligne droite retournant à (x2, y2)
  path += `L ${x2.toFixed(1)} ${y2.toFixed(1)} `;
  
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

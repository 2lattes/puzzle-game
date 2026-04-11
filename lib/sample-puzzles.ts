import type { PuzzleImage } from "@/types";

/** URLs Unsplash (format demandé), IDs vérifiés sur images.unsplash.com */
const u = (photoId: string) =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=800&q=80`;

/** Thèmes officiels — répartition des 20 puzzles : 7 / 7 / 6 */
export const PUZZLE_THEMES = [
  "Paysage Corse",
  "Paysage Provence",
  "Fruits",
] as const;

/**
 * 20 puzzles : paysages corses et provençaux + fruits (Unsplash).
 */
export const SAMPLE_PUZZLES: PuzzleImage[] = [
  // Paysage Corse (7)
  {
    id: "corse-1",
    url: u("photo-1664463684906-507595af60ef"),
    theme: "Paysage Corse",
    title: "Coucher de soleil sur la mer",
  },
  {
    id: "corse-2",
    url: u("photo-1709594625825-7c03659c695d"),
    theme: "Paysage Corse",
    title: "Longue pose, rivage rocheux",
  },
  {
    id: "corse-3",
    url: u("photo-1568149788227-36c45e231c3c"),
    theme: "Paysage Corse",
    title: "Falaise face à l’océan",
  },
  {
    id: "corse-4",
    url: u("photo-1586987191342-5f9d347dc86f"),
    theme: "Paysage Corse",
    title: "Montagnes et forêts, Corse",
  },
  {
    id: "corse-5",
    url: u("photo-1662227392398-f30400a72551"),
    theme: "Paysage Corse",
    title: "Bateau sur l’eau",
  },
  {
    id: "corse-6",
    url: u("photo-1706380099107-d508b23ce01a"),
    theme: "Paysage Corse",
    title: "Village sur le rocher",
  },
  {
    id: "corse-7",
    url: u("photo-1535877974-8641fb7bf108"),
    theme: "Paysage Corse",
    title: "Plage, vue aérienne",
  },
  // Paysage Provence (7)
  {
    id: "provence-1",
    url: u("photo-1600759487717-62bbb608106e"),
    theme: "Paysage Provence",
    title: "Champ mauve sous le ciel",
  },
  {
    id: "provence-2",
    url: u("photo-1593715857983-5531aa640471"),
    theme: "Paysage Provence",
    title: "Lavande et ciel bleu",
  },
  {
    id: "provence-3",
    url: u("photo-1614888773798-df30e12a9b6c"),
    theme: "Paysage Provence",
    title: "Champ de lavande",
  },
  {
    id: "provence-4",
    url: u("photo-1723916687481-8b64bbfb56e1"),
    theme: "Paysage Provence",
    title: "Lavande et église au fond",
  },
  {
    id: "provence-5",
    url: u("photo-1720473980025-600fdbba2195"),
    theme: "Paysage Provence",
    title: "Fleurs violettes et montagne",
  },
  {
    id: "provence-6",
    url: u("photo-1662486717731-293f2b6ebfa2"),
    theme: "Paysage Provence",
    title: "Lavande à perte de vue",
  },
  {
    id: "provence-7",
    url: u("photo-1639494845874-e8cffbe830fe"),
    theme: "Paysage Provence",
    title: "Lavande sous nuages",
  },
  // Fruits (6)
  {
    id: "fruits-1",
    url: u("photo-1610832958506-aa56368176cf"),
    theme: "Fruits",
    title: "Agrumes frais",
  },
  {
    id: "fruits-2",
    url: u("photo-1526318472351-c75fcf070305"),
    theme: "Fruits",
    title: "Papaye sur feuille",
  },
  {
    id: "fruits-3",
    url: u("photo-1580052614034-c55d20bfee3b"),
    theme: "Fruits",
    title: "Orange sur bois",
  },
  {
    id: "fruits-4",
    url: u("photo-1444459094717-a39f1e3e0903"),
    theme: "Fruits",
    title: "Baies colorées",
  },
  {
    id: "fruits-5",
    url: u("photo-1511546865855-fe4788edf4b6"),
    theme: "Fruits",
    title: "Panier de fruits",
  },
  {
    id: "fruits-6",
    url: u("photo-1609196119588-15e77a42bf70"),
    theme: "Fruits",
    title: "Citrons au verger",
  },
];

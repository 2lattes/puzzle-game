import type { PuzzleImage } from "@/types";

/** URLs Unsplash (format demandé), IDs vérifiés sur images.unsplash.com */
const u = (photoId: string) =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=800&q=80`;

/** Thèmes officiels — répartition des 20 puzzles : 7 / 7 / 6 */
export const PUZZLE_THEMES = [
  "Corse",
  "Coucher de soleil",
  "Couture",
  "Exotique",
  "Fonds Marins",
  "Fruits",
  "Marseille",
  "Perles",
  "Printemps",
  "Provence",
] as const;

/**
 * 20 puzzles : paysages corses et provençaux + fruits (Unsplash).
 */
export const SAMPLE_PUZZLES: PuzzleImage[] = [
  // Paysage Corse (7)
  {
    id: "corse-1",
    url: u("photo-1664463684906-507595af60ef"),
    theme: "Corse",
    title: "Coucher de soleil sur la mer",
  },
  {
    id: "corse-2",
    url: u("photo-1709594625825-7c03659c695d"),
    theme: "Corse",
    title: "Longue pose, rivage rocheux",
  },
  {
    id: "corse-3",
    url: u("photo-1568149788227-36c45e231c3c"),
    theme: "Corse",
    title: "Falaise face à l’océan",
  },
  {
    id: "corse-4",
    url: u("photo-1586987191342-5f9d347dc86f"),
    theme: "Corse",
    title: "Montagnes et forêts, Corse",
  },
  {
    id: "corse-5",
    url: u("photo-1662227392398-f30400a72551"),
    theme: "Corse",
    title: "Bateau sur l’eau",
  },
  {
    id: "corse-6",
    url: u("photo-1706380099107-d508b23ce01a"),
    theme: "Corse",
    title: "Village sur le rocher",
  },
  {
    id: "corse-7",
    url: u("photo-1535877974-8641fb7bf108"),
    theme: "Corse",
    title: "Plage, vue aérienne",
  },
  // Paysage Provence (7)
  {
    id: "provence-1",
    url: u("photo-1600759487717-62bbb608106e"),
    theme: "Provence",
    title: "Champ mauve sous le ciel",
  },
  {
    id: "provence-2",
    url: u("photo-1593715857983-5531aa640471"),
    theme: "Provence",
    title: "Lavande et ciel bleu",
  },
  {
    id: "provence-3",
    url: u("photo-1614888773798-df30e12a9b6c"),
    theme: "Provence",
    title: "Champ de lavande",
  },
  {
    id: "provence-4",
    url: u("photo-1723916687481-8b64bbfb56e1"),
    theme: "Provence",
    title: "Lavande et église au fond",
  },
  {
    id: "provence-5",
    url: u("photo-1720473980025-600fdbba2195"),
    theme: "Provence",
    title: "Fleurs violettes et montagne",
  },
  {
    id: "provence-6",
    url: u("photo-1662486717731-293f2b6ebfa2"),
    theme: "Provence",
    title: "Lavande à perte de vue",
  },
  {
    id: "provence-7",
    url: u("photo-1639494845874-e8cffbe830fe"),
    theme: "Provence",
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
  // Printemps (5)
  {
    id: "printemps-1",
    url: "/puzzles/printemps/p1.jpg",
    theme: "Printemps",
    title: "Jonquilles éclatantes",
  },
  {
    id: "printemps-2",
    url: "/puzzles/printemps/p2.jpg",
    theme: "Printemps",
    title: "Éclosion printanière",
  },
  {
    id: "printemps-3",
    url: "/puzzles/printemps/p3.jpg",
    theme: "Printemps",
    title: "Cerisiers en fleurs",
  },
  {
    id: "printemps-4",
    url: "/puzzles/printemps/p4.jpg",
    theme: "Printemps",
    title: "Champ de tulipes",
  },
  {
    id: "printemps-5",
    url: "/puzzles/printemps/p5.jpg",
    theme: "Printemps",
    title: "Montagne fleurie",
  },
  {
    id: "printemps-6",
    url: "/puzzles/printemps/p6.jpg",
    theme: "Printemps",
    title: "Cœur de tulipe",
  },
  {
    id: "printemps-7",
    url: "/puzzles/printemps/p7.jpg",
    theme: "Printemps",
    title: "Forêt de bouleaux",
  },
  {
    id: "printemps-8",
    url: "/puzzles/printemps/p8.jpg",
    theme: "Printemps",
    title: "Pâques au jardin",
  },
  {
    id: "printemps-9",
    url: "/puzzles/printemps/p9.jpg",
    theme: "Printemps",
    title: "Floraison rose",
  },
  {
    id: "printemps-10",
    url: "/puzzles/printemps/p10.jpg",
    theme: "Printemps",
    title: "Tapis de fleurs bleues",
  },
  {
    id: "printemps-11",
    url: "/puzzles/printemps/p11.jpg",
    theme: "Printemps",
    title: "Champs de tulipes rouges",
  },
  {
    id: "printemps-12",
    url: "/puzzles/printemps/p12.jpg",
    theme: "Printemps",
    title: "Muscaris sauvages",
  },
  {
    id: "printemps-13",
    url: "/puzzles/printemps/p13.jpg",
    theme: "Printemps",
    title: "Ciel de fleurs banches",
  },
  {
    id: "printemps-14",
    url: "/puzzles/printemps/p14.jpg",
    theme: "Printemps",
    title: "Magnolias en fleurs",
  },
  {
    id: "printemps-15",
    url: "/puzzles/printemps/p15.jpg",
    theme: "Printemps",
    title: "Clairière bleue",
  },
  {
    id: "printemps-16",
    url: "/puzzles/printemps/p16.jpg",
    theme: "Printemps",
    title: "Cerisier blanc",
  },
  {
    id: "printemps-17",
    url: "/puzzles/printemps/p17.jpg",
    theme: "Printemps",
    title: "Papillons et fleurs",
  },
  {
    id: "printemps-18",
    url: "/puzzles/printemps/p18.jpg",
    theme: "Printemps",
    title: "Sous-bois bleu",
  },
  {
    id: "printemps-19",
    url: "/puzzles/printemps/p19.jpg",
    theme: "Printemps",
    title: "Pommiers fleuris",
  },
  {
    id: "printemps-20",
    url: "/puzzles/printemps/p20.jpg",
    theme: "Printemps",
    title: "Magnolias de printemps",
  },
  // Marseille (15)
  {
    id: "marseille-1",
    url: "/puzzles/marseille/m1.jpg",
    theme: "Marseille",
    title: "Notre-Dame de la Garde",
  },
  {
    id: "marseille-2",
    url: "/puzzles/marseille/m2.jpg",
    theme: "Marseille",
    title: "Vigie sur la mer",
  },
  {
    id: "marseille-3",
    url: "/puzzles/marseille/m3.jpg",
    theme: "Marseille",
    title: "Navette du Vieux-Port",
  },
  {
    id: "marseille-4",
    url: "/puzzles/marseille/m4.jpg",
    theme: "Marseille",
    title: "Le voilier Alliance",
  },
  {
    id: "marseille-5",
    url: "/puzzles/marseille/m5.jpg",
    theme: "Marseille",
    title: "Vallon des Auffes et Stade",
  },
  {
    id: "marseille-6",
    url: "/puzzles/marseille/m6.jpg",
    theme: "Marseille",
    title: "Coucher de soleil, Calanques",
  },
  {
    id: "marseille-7",
    url: "/puzzles/marseille/m7.jpg",
    theme: "Marseille",
    title: "Savons de Marseille",
  },
  {
    id: "marseille-8",
    url: "/puzzles/marseille/m8.jpg",
    theme: "Marseille",
    title: "La Bonne Mère (Statue)",
  },
  {
    id: "marseille-9",
    url: "/puzzles/marseille/m9.jpg",
    theme: "Marseille",
    title: "Stade Vélodrome",
  },
  {
    id: "marseille-10",
    url: "/puzzles/marseille/m10.jpg",
    theme: "Marseille",
    title: "Mucem, Dentelle de béton",
  },
  {
    id: "marseille-11",
    url: "/puzzles/marseille/m11.jpg",
    theme: "Marseille",
    title: "Vieux-Port au crépuscule",
  },
  {
    id: "marseille-12",
    url: "/puzzles/marseille/m12.jpg",
    theme: "Marseille",
    title: "Basilique et Ville",
  },
  {
    id: "marseille-13",
    url: "/puzzles/marseille/m13.jpg",
    theme: "Marseille",
    title: "Bateaux à Malmousque",
  },
  {
    id: "marseille-14",
    url: "/puzzles/marseille/m14.jpg",
    theme: "Marseille",
    title: "Port de Plaisance",
  },
  {
    id: "marseille-15",
    url: "/puzzles/marseille/m15.jpg",
    theme: "Marseille",
    title: "Vue sur la Côte",
  },
  {
    id: "marseille-16",
    url: "/puzzles/marseille/m16.jpg",
    theme: "Marseille",
    title: "Mucem, Dentelle de béton (Détail)",
  },
  {
    id: "marseille-17",
    url: "/puzzles/marseille/m17.jpg",
    theme: "Marseille",
    title: "Corniche et Chaises longues",
  },
  {
    id: "marseille-18",
    url: "/puzzles/marseille/m18.jpg",
    theme: "Marseille",
    title: "Anse de la Fausse Monnaie",
  },
  {
    id: "marseille-19",
    url: "/puzzles/marseille/m19.jpg",
    theme: "Marseille",
    title: "Cathédrale de la Major (NB)",
  },
  {
    id: "marseille-20",
    url: "/puzzles/marseille/m20.jpg",
    theme: "Marseille",
    title: "Architecture Phocéenne",
  },
  {
    id: "marseille-21",
    url: "/puzzles/marseille/m21.jpg",
    theme: "Marseille",
    title: "Transats sur le Rocher",
  },
  {
    id: "marseille-22",
    url: "/puzzles/marseille/m22.jpg",
    theme: "Marseille",
    title: "Plage et Corniche",
  },
  {
    id: "marseille-23",
    url: "/puzzles/marseille/m23.jpg",
    theme: "Marseille",
    title: "Ruelle du Panier",
  },
  {
    id: "marseille-24",
    url: "/puzzles/marseille/m24.jpg",
    theme: "Marseille",
    title: "Mucem J4",
  },
  {
    id: "marseille-25",
    url: "/puzzles/marseille/m25.jpg",
    theme: "Marseille",
    title: "Eaux des Calanques",
  },
  {
    id: "marseille-26",
    url: "/puzzles/marseille/m26.jpg",
    theme: "Marseille",
    title: "Petit Train du Vieux-Port",
  },
  {
    id: "marseille-27",
    url: "/puzzles/marseille/m27.jpg",
    theme: "Marseille",
    title: "Falaise et Voilier",
  },
  {
    id: "marseille-28",
    url: "/puzzles/marseille/m28.jpg",
    theme: "Marseille",
    title: "Paddles en Calanque",
  },
  {
    id: "marseille-29",
    url: "/puzzles/marseille/m29.jpg",
    theme: "Marseille",
    title: "Vue Aérienne des Calanques",
  },
  {
    id: "marseille-30",
    url: "/puzzles/marseille/m30.jpg",
    theme: "Marseille",
    title: "Marché aux Poissons",
  },
];

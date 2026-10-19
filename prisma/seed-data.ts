// Static demo content for prisma/seed.ts. Prices are in MAD here and converted
// to centimes by the seed. Placeholder content, replace before production.
// Product names must never contain a color: colors are variants, and the same
// product is seeded in several colors.

export type Tri = { fr: string; ar: string; en: string };

// ---------- Categories ----------

export type CategorySeed = {
  key: string;
  name: Tri;
  children?: CategorySeed[];
};

export const categories: CategorySeed[] = [
  {
    key: "vetements",
    name: { fr: "Vêtements", ar: "ملابس", en: "Clothing" },
    children: [
      { key: "t-shirts", name: { fr: "T-shirts", ar: "تيشيرتات", en: "T-shirts" } },
      {
        key: "chemises",
        name: {
          fr: "Chemises & Surchemises",
          ar: "قمصان وقمصان خارجية",
          en: "Shirts & Overshirts",
        },
      },
      {
        key: "hoodies",
        name: {
          fr: "Hoodies & Sweats",
          ar: "هوديز وسويترات",
          en: "Hoodies & Sweatshirts",
        },
      },
      { key: "vestes", name: { fr: "Vestes", ar: "جاكيتات", en: "Jackets" } },
      {
        key: "pantalons",
        name: {
          fr: "Pantalons & Cargo",
          ar: "سراويل وكارغو",
          en: "Pants & Cargo",
        },
      },
      { key: "jeans", name: { fr: "Jeans", ar: "جينز", en: "Jeans" } },
      { key: "shorts", name: { fr: "Shorts", ar: "شورتات", en: "Shorts" } },
    ],
  },
  {
    key: "chaussures",
    name: { fr: "Chaussures", ar: "أحذية", en: "Shoes" },
    children: [
      { key: "sneakers", name: { fr: "Sneakers", ar: "سنيكرز", en: "Sneakers" } },
      { key: "sandales", name: { fr: "Sandales", ar: "صنادل", en: "Sandals" } },
    ],
  },
  {
    key: "accessoires",
    name: { fr: "Accessoires", ar: "إكسسوارات", en: "Accessories" },
    children: [
      { key: "casquettes", name: { fr: "Casquettes", ar: "قبعات", en: "Caps" } },
      { key: "sacs", name: { fr: "Sacs", ar: "حقائب", en: "Bags" } },
      { key: "ceintures", name: { fr: "Ceintures", ar: "أحزمة", en: "Belts" } },
      { key: "chaussettes", name: { fr: "Chaussettes", ar: "جوارب", en: "Socks" } },
    ],
  },
];

// Short description per leaf category, reused by its products.
export const categoryDescriptions: Record<string, Tri> = {
  "t-shirts": {
    fr: "Coton doux et coupe confortable, à porter au quotidien.",
    ar: "قطن ناعم وقصة مريحة لارتدائه كل يوم.",
    en: "Soft cotton and a comfortable fit for everyday wear.",
  },
  chemises: {
    fr: "Une chemise facile à assortir, du bureau aux sorties.",
    ar: "قميص سهل التنسيق، من العمل إلى السهرة.",
    en: "An easy-to-style shirt, from the office to evenings out.",
  },
  hoodies: {
    fr: "Molleton chaud et épais pour les journées fraîches.",
    ar: "قماش دافئ وسميك للأيام الباردة.",
    en: "Warm, thick fleece for cooler days.",
  },
  vestes: {
    fr: "Une veste pratique qui complète toutes vos tenues.",
    ar: "جاكيت عملي يكمل جميع إطلالاتك.",
    en: "A practical jacket that completes every outfit.",
  },
  pantalons: {
    fr: "Coupe soignée et tissu résistant pour un confort durable.",
    ar: "قصة أنيقة وقماش متين لراحة تدوم.",
    en: "A neat cut and durable fabric for lasting comfort.",
  },
  jeans: {
    fr: "Denim solide avec une belle tenue, lavage soigné.",
    ar: "قماش دنيم متين بقصة جيدة وغسيل متقن.",
    en: "Sturdy denim with a great fit and a careful wash.",
  },
  shorts: {
    fr: "Léger et respirant, idéal pour l'été.",
    ar: "خفيف ومريح للجلد، مثالي للصيف.",
    en: "Light and breathable, ideal for summer.",
  },
  sneakers: {
    fr: "Semelle confortable et finition soignée pour marcher toute la journée.",
    ar: "نعل مريح وتشطيب متقن للمشي طوال اليوم.",
    en: "A comfortable sole and neat finish for all-day walking.",
  },
  sandales: {
    fr: "Confort et simplicité pour la plage et la ville.",
    ar: "راحة وبساطة للشاطئ والمدينة.",
    en: "Comfort and simplicity for the beach and the city.",
  },
  casquettes: {
    fr: "Le détail qui finalise votre look.",
    ar: "التفصيل الذي يكمل إطلالتك.",
    en: "The detail that finishes your look.",
  },
  sacs: {
    fr: "Pratique et solide, avec plusieurs rangements.",
    ar: "عملية ومتينة مع أكثر من جيب للتخزين.",
    en: "Practical and sturdy, with several compartments.",
  },
  ceintures: {
    fr: "Une ceinture résistante, taille ajustable.",
    ar: "حزام متين بمقاس قابل للتعديل.",
    en: "A durable belt with an adjustable size.",
  },
  chaussettes: {
    fr: "Coton respirant, lot pratique pour toute la semaine.",
    ar: "قطن يسمح بمرور الهواء، عبوة عملية لكل الأسبوع.",
    en: "Breathable cotton, a handy pack for the whole week.",
  },
};

// ---------- Colors ----------

export type ColorSeed = { key: string; hex: string; name: Tri };

export const colors: ColorSeed[] = [
  { key: "noir", hex: "#111111", name: { fr: "Noir", ar: "أسود", en: "Black" } },
  { key: "blanc", hex: "#ffffff", name: { fr: "Blanc", ar: "أبيض", en: "White" } },
  {
    key: "marine",
    hex: "#1f2a44",
    name: { fr: "Bleu marine", ar: "أزرق كحلي", en: "Navy" },
  },
  {
    key: "gris",
    hex: "#9aa0a6",
    name: { fr: "Gris chiné", ar: "رمادي", en: "Heather grey" },
  },
  { key: "beige", hex: "#d8c3a5", name: { fr: "Beige", ar: "بيج", en: "Beige" } },
  {
    key: "olive",
    hex: "#556b2f",
    name: { fr: "Vert olive", ar: "أخضر زيتي", en: "Olive green" },
  },
  {
    key: "bordeaux",
    hex: "#6d1a2a",
    name: { fr: "Bordeaux", ar: "عنابي", en: "Burgundy" },
  },
  {
    key: "ciel",
    hex: "#8ec5e8",
    name: { fr: "Bleu ciel", ar: "أزرق سماوي", en: "Sky blue" },
  },
];

// ---------- Sizes ----------

export const sizes = {
  TOP: ["S", "M", "L", "XL", "XXL"],
  BOTTOM: ["38", "40", "42", "44", "46"],
  SHOES: ["40", "41", "42", "43", "44", "45"],
  ONE_SIZE: ["ONE SIZE"],
} as const;

export type SizeGroupKey = keyof typeof sizes;

// Which size group each leaf category uses, plus a SKU prefix.
export const categoryMeta: Record<string, { group: SizeGroupKey; sku: string }> = {
  "t-shirts": { group: "TOP", sku: "TSH" },
  chemises: { group: "TOP", sku: "CHM" },
  hoodies: { group: "TOP", sku: "HOO" },
  vestes: { group: "TOP", sku: "VES" },
  pantalons: { group: "BOTTOM", sku: "PAN" },
  jeans: { group: "BOTTOM", sku: "JEA" },
  shorts: { group: "BOTTOM", sku: "SHO" },
  sneakers: { group: "SHOES", sku: "SNE" },
  sandales: { group: "SHOES", sku: "SAN" },
  casquettes: { group: "ONE_SIZE", sku: "CAS" },
  sacs: { group: "ONE_SIZE", sku: "SAC" },
  ceintures: { group: "ONE_SIZE", sku: "CEI" },
  chaussettes: { group: "ONE_SIZE", sku: "CHA" },
};

// ---------- Collections ----------

export type CollectionSeed = {
  key: string;
  name: Tri;
  description: Tri;
  showOnHome: boolean;
  // 1-based indexes into `products` below.
  products: number[];
};

export const collections: CollectionSeed[] = [
  {
    key: "nouveautes",
    name: { fr: "Nouveautés", ar: "وصل حديثًا", en: "New Arrivals" },
    description: {
      fr: "Les dernières pièces arrivées en boutique.",
      ar: "أحدث القطع التي وصلت إلى المتجر.",
      en: "The latest pieces to land in store.",
    },
    showOnHome: true,
    products: [2, 8, 15, 16, 22, 29, 31, 33, 37],
  },
  {
    key: "ete-26",
    name: { fr: "Été 26", ar: "صيف 26", en: "Summer 26" },
    description: {
      fr: "Légèreté et couleurs pour la saison chaude.",
      ar: "خفة وألوان لموسم الصيف.",
      en: "Lightweight pieces and colors for the warm season.",
    },
    showOnHome: true,
    products: [1, 4, 6, 10, 21, 25, 26, 27, 32, 33, 34],
  },
  {
    key: "essentials",
    name: { fr: "Essentials", ar: "الأساسيات", en: "Essentials" },
    description: {
      fr: "Les basiques indispensables de votre garde-robe.",
      ar: "القطع الأساسية التي لا غنى عنها في خزانتك.",
      en: "The wardrobe basics you cannot do without.",
    },
    showOnHome: true,
    products: [1, 3, 5, 6, 11, 19, 28, 38, 39, 40],
  },
  {
    key: "streetwear",
    name: { fr: "Streetwear", ar: "ستريت وير", en: "Streetwear" },
    description: {
      fr: "Coupes oversize et styles urbains.",
      ar: "قصات واسعة وأساليب حضرية.",
      en: "Oversized fits and urban styles.",
    },
    showOnHome: false,
    products: [2, 12, 13, 16, 18, 24, 31, 36],
  },
];

// ---------- Products ----------

export type ProductSeed = {
  category: string; // leaf category key
  name: Tri;
  price: number; // MAD
  compareAt?: number; // MAD, sale when greater than price
};

// 40 products. Order = id used by collections above (1-based).
export const products: ProductSeed[] = [
  // T-shirts 1-6
  { category: "t-shirts", price: 99, name: { fr: "T-shirt Essentiel Col Rond", ar: "تيشيرت أساسي بياقة دائرية", en: "Essential Crew Neck T-shirt" } },
  { category: "t-shirts", price: 149, compareAt: 199, name: { fr: "T-shirt Oversize Graphique", ar: "تيشيرت أوفرسايز مطبوع", en: "Oversized Graphic T-shirt" } },
  { category: "t-shirts", price: 179, name: { fr: "Polo Piqué Classique", ar: "بولو بيكيه كلاسيكي", en: "Classic Piqué Polo" } },
  { category: "t-shirts", price: 129, name: { fr: "T-shirt Rayé", ar: "تيشيرت مخطط", en: "Striped T-shirt" } },
  { category: "t-shirts", price: 249, compareAt: 297, name: { fr: "Pack 3 T-shirts Basiques", ar: "عبوة 3 تيشيرتات أساسية", en: "Basic T-shirt 3-Pack" } },
  { category: "t-shirts", price: 139, name: { fr: "T-shirt Manches Longues", ar: "تيشيرت بأكمام طويلة", en: "Long Sleeve T-shirt" } },
  // Shirts 7-10
  { category: "chemises", price: 299, name: { fr: "Chemise Lin Manches Longues", ar: "قميص كتان بأكمام طويلة", en: "Long Sleeve Linen Shirt" } },
  { category: "chemises", price: 259, compareAt: 329, name: { fr: "Chemise Oxford Slim", ar: "قميص أكسفورد ضيق", en: "Slim Oxford Shirt" } },
  { category: "chemises", price: 349, name: { fr: "Surchemise à Carreaux", ar: "قميص خارجي منقوش", en: "Plaid Overshirt" } },
  { category: "chemises", price: 199, name: { fr: "Chemise Manches Courtes Été", ar: "قميص صيفي بأكمام قصيرة", en: "Summer Short Sleeve Shirt" } },
  // Hoodies 11-14
  { category: "hoodies", price: 349, name: { fr: "Hoodie Zippé Essentiel", ar: "هودي بسحاب أساسي", en: "Essential Zip Hoodie" } },
  { category: "hoodies", price: 299, compareAt: 399, name: { fr: "Sweat Col Rond Brodé", ar: "سويتر بياقة دائرية مطرز", en: "Embroidered Crewneck Sweatshirt" } },
  { category: "hoodies", price: 399, name: { fr: "Hoodie Oversize Épais", ar: "هودي أوفرسايز سميك", en: "Heavyweight Oversized Hoodie" } },
  { category: "hoodies", price: 329, name: { fr: "Sweat Quart de Zip", ar: "سويتر بنصف سحاب", en: "Quarter-Zip Sweatshirt" } },
  // Jackets 15-17
  { category: "vestes", price: 449, name: { fr: "Veste Coupe-Vent Légère", ar: "جاكيت خفيف مقاوم للرياح", en: "Lightweight Windbreaker" } },
  { category: "vestes", price: 499, compareAt: 649, name: { fr: "Bomber Satiné", ar: "جاكيت بومبر ساتان", en: "Satin Bomber Jacket" } },
  { category: "vestes", price: 459, name: { fr: "Veste en Jean Délavée", ar: "جاكيت جينز مغسول", en: "Washed Denim Jacket" } },
  // Pants 18-21
  { category: "pantalons", price: 359, name: { fr: "Pantalon Cargo Coupe Droite", ar: "سروال كارغو بقصة مستقيمة", en: "Straight Fit Cargo Pants" } },
  { category: "pantalons", price: 299, name: { fr: "Pantalon Chino Slim", ar: "سروال شينو ضيق", en: "Slim Chino Pants" } },
  { category: "pantalons", price: 249, compareAt: 329, name: { fr: "Jogging Molleton", ar: "بنطال رياضي مبطّن", en: "Fleece Joggers" } },
  { category: "pantalons", price: 279, name: { fr: "Pantalon Lin Taille Élastique", ar: "سروال كتان بخصر مطاطي", en: "Linen Drawstring Pants" } },
  // Jeans 22-24
  { category: "jeans", price: 399, name: { fr: "Jean Slim Brut", ar: "جينز ضيق خام", en: "Slim Raw Jeans" } },
  { category: "jeans", price: 379, compareAt: 449, name: { fr: "Jean Droit", ar: "جينز مستقيم", en: "Straight Jeans" } },
  { category: "jeans", price: 429, name: { fr: "Jean Baggy Délavé", ar: "جينز واسع مغسول", en: "Washed Baggy Jeans" } },
  // Shorts 25-27
  { category: "shorts", price: 199, name: { fr: "Short Cargo Été", ar: "شورت كارغو صيفي", en: "Summer Cargo Shorts" } },
  { category: "shorts", price: 149, name: { fr: "Short de Bain Uni", ar: "شورت سباحة سادة", en: "Plain Swim Shorts" } },
  { category: "shorts", price: 229, compareAt: 279, name: { fr: "Bermuda Chino", ar: "برمودا شينو", en: "Chino Bermuda Shorts" } },
  // Sneakers 28-31
  { category: "sneakers", price: 599, name: { fr: "Sneakers Basses en Cuir", ar: "سنيكرز منخفض جلد", en: "Leather Low Sneakers" } },
  { category: "sneakers", price: 549, compareAt: 699, name: { fr: "Sneakers Running Légères", ar: "سنيكرز جري خفيف", en: "Lightweight Running Sneakers" } },
  { category: "sneakers", price: 449, name: { fr: "Sneakers Montantes en Toile", ar: "سنيكرز عالٍ قماش", en: "Canvas High-Top Sneakers" } },
  { category: "sneakers", price: 649, name: { fr: "Sneakers Chunky Urbaines", ar: "سنيكرز عريض حضري", en: "Urban Chunky Sneakers" } },
  // Sandals 32-33
  { category: "sandales", price: 149, name: { fr: "Claquettes Confort", ar: "صنادل شبشب مريحة", en: "Comfort Slides" } },
  { category: "sandales", price: 299, compareAt: 379, name: { fr: "Sandales en Cuir Tressé", ar: "صنادل جلد مجدل", en: "Braided Leather Sandals" } },
  // Caps 34-35
  { category: "casquettes", price: 99, name: { fr: "Casquette Baseball Brodée", ar: "قبعة بيسبول مطرزة", en: "Embroidered Baseball Cap" } },
  { category: "casquettes", price: 89, name: { fr: "Bonnet Côtelé", ar: "قبعة صوف مضلعة", en: "Ribbed Beanie" } },
  // Bags 36-37
  { category: "sacs", price: 249, name: { fr: "Sac Bandoulière Compact", ar: "حقيبة كتف صغيرة", en: "Compact Crossbody Bag" } },
  { category: "sacs", price: 349, compareAt: 449, name: { fr: "Sac à Dos Urbain", ar: "حقيبة ظهر حضرية", en: "Urban Backpack" } },
  // Belts 38-39
  { category: "ceintures", price: 199, name: { fr: "Ceinture en Cuir Classique", ar: "حزام جلد كلاسيكي", en: "Classic Leather Belt" } },
  { category: "ceintures", price: 119, name: { fr: "Ceinture Toile Réglable", ar: "حزام قماش قابل للتعديل", en: "Adjustable Canvas Belt" } },
  // Socks 40
  { category: "chaussettes", price: 129, name: { fr: "Pack 5 Paires de Chaussettes", ar: "عبوة 5 أزواج جوارب", en: "5-Pair Socks Pack" } },
];

// Demo state overrides (1-based product index).
export const draftProducts = [39];
export const archivedProducts = [40];
export const outOfStockProducts = [14]; // every variant at stock 0
export const featuredProducts = [2, 11, 16, 28, 29, 37];

// ---------- Cities ----------

export const cities: { fr: string; ar: string }[] = [
  { fr: "Casablanca", ar: "الدار البيضاء" },
  { fr: "Rabat", ar: "الرباط" },
  { fr: "Marrakech", ar: "مراكش" },
  { fr: "Fès", ar: "فاس" },
  { fr: "Tanger", ar: "طنجة" },
  { fr: "Agadir", ar: "أكادير" },
  { fr: "Meknès", ar: "مكناس" },
  { fr: "Oujda", ar: "وجدة" },
  { fr: "Kénitra", ar: "القنيطرة" },
  { fr: "Tétouan", ar: "تطوان" },
  { fr: "Salé", ar: "سلا" },
  { fr: "Témara", ar: "تمارة" },
  { fr: "Mohammedia", ar: "المحمدية" },
  { fr: "El Jadida", ar: "الجديدة" },
  { fr: "Béni Mellal", ar: "بني ملال" },
  { fr: "Nador", ar: "الناظور" },
  { fr: "Khouribga", ar: "خريبكة" },
  { fr: "Settat", ar: "سطات" },
  { fr: "Safi", ar: "آسفي" },
  { fr: "Essaouira", ar: "الصويرة" },
];

// ---------- About page ----------

export function aboutPage(brand: string): { title: Tri; body: Tri } {
  return {
    title: { fr: "À propos", ar: "من نحن", en: "About" },
    body: {
      fr: `${brand} est une boutique de mode homme pensée pour le Maroc : des vêtements, des chaussures et des accessoires simples, bien coupés et à un prix juste.\n\nNous sélectionnons des matières confortables et des modèles faciles à porter au quotidien. Le paiement se fait à la livraison, et vous pouvez nous écrire sur WhatsApp à tout moment pour être conseillé.`,
      ar: `${brand} متجر أزياء رجالية صُمّم للمغرب: ملابس وأحذية وإكسسوارات بسيطة وبقصات أنيقة وبسعر عادل.\n\nنختار أقمشة مريحة وموديلات سهلة الارتداء كل يوم. الدفع عند الاستلام، ويمكنك مراسلتنا على واتساب في أي وقت للحصول على النصيحة.`,
      en: `${brand} is a menswear store designed for Morocco: simple, well-cut clothing, shoes and accessories at a fair price.\n\nWe pick comfortable fabrics and designs that are easy to wear every day. You pay on delivery, and you can message us on WhatsApp at any time for advice.`,
    },
  };
}

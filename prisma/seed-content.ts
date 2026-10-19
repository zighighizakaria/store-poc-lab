// Storefront demo content for prisma/seed.ts: size guides, home banners and
// static pages. Placeholder text, replace before production.
import type { Tri } from "./seed-data";

// ---------- Size guides ----------
// Content format (see src/lib/size-guide.ts): lines starting with "|" are table
// rows (first row = header), other lines are notes. Values are placeholders.

export type SizeGuideKey = "tops" | "bottoms" | "shoes";

export const sizeGuides: Record<SizeGuideKey, Tri> = {
  tops: {
    fr: [
      "| Taille | Poitrine (cm) | Longueur (cm) |",
      "| S | 92 | 68 |",
      "| M | 98 | 70 |",
      "| L | 104 | 72 |",
      "| XL | 110 | 74 |",
      "| XXL | 116 | 76 |",
      "Mesures prises à plat sur le vêtement. En cas de doute entre deux tailles, prenez la plus grande.",
    ].join("\n"),
    ar: [
      "| المقاس | الصدر (سم) | الطول (سم) |",
      "| S | 92 | 68 |",
      "| M | 98 | 70 |",
      "| L | 104 | 72 |",
      "| XL | 110 | 74 |",
      "| XXL | 116 | 76 |",
      "القياسات مأخوذة على القطعة وهي مسطّحة. إذا تردّدت بين مقاسين فاختر الأكبر.",
    ].join("\n"),
    en: [
      "| Size | Chest (cm) | Length (cm) |",
      "| S | 92 | 68 |",
      "| M | 98 | 70 |",
      "| L | 104 | 72 |",
      "| XL | 110 | 74 |",
      "| XXL | 116 | 76 |",
      "Measurements taken flat on the garment. If you are between two sizes, choose the larger one.",
    ].join("\n"),
  },
  bottoms: {
    fr: [
      "| Taille | Tour de taille (cm) | Longueur de jambe (cm) |",
      "| 38 | 74 | 80 |",
      "| 40 | 78 | 81 |",
      "| 42 | 82 | 82 |",
      "| 44 | 86 | 83 |",
      "| 46 | 90 | 84 |",
      "Mesurez votre tour de taille à même la peau, sans serrer. Les shorts ont une longueur de jambe plus courte.",
    ].join("\n"),
    ar: [
      "| المقاس | محيط الخصر (سم) | طول الساق (سم) |",
      "| 38 | 74 | 80 |",
      "| 40 | 78 | 81 |",
      "| 42 | 82 | 82 |",
      "| 44 | 86 | 83 |",
      "| 46 | 90 | 84 |",
      "قِس محيط خصرك على الجلد دون شدّ. طول الساق في الشورتات أقصر.",
    ].join("\n"),
    en: [
      "| Size | Waist (cm) | Inseam (cm) |",
      "| 38 | 74 | 80 |",
      "| 40 | 78 | 81 |",
      "| 42 | 82 | 82 |",
      "| 44 | 86 | 83 |",
      "| 46 | 90 | 84 |",
      "Measure your waist against the skin, without pulling tight. Shorts have a shorter inseam.",
    ].join("\n"),
  },
  shoes: {
    fr: [
      "| Pointure (EU) | Longueur du pied (cm) |",
      "| 40 | 25,0 |",
      "| 41 | 25,7 |",
      "| 42 | 26,3 |",
      "| 43 | 27,0 |",
      "| 44 | 27,7 |",
      "| 45 | 28,3 |",
      "Posez votre pied sur une feuille, tracez le contour et mesurez du talon au bout du plus long orteil.",
    ].join("\n"),
    ar: [
      "| المقاس (EU) | طول القدم (سم) |",
      "| 40 | 25.0 |",
      "| 41 | 25.7 |",
      "| 42 | 26.3 |",
      "| 43 | 27.0 |",
      "| 44 | 27.7 |",
      "| 45 | 28.3 |",
      "ضع قدمك على ورقة وارسم محيطها ثم قِس من الكعب إلى طرف أطول إصبع.",
    ].join("\n"),
    en: [
      "| Size (EU) | Foot length (cm) |",
      "| 40 | 25.0 |",
      "| 41 | 25.7 |",
      "| 42 | 26.3 |",
      "| 43 | 27.0 |",
      "| 44 | 27.7 |",
      "| 45 | 28.3 |",
      "Place your foot on a sheet of paper, trace its outline and measure from the heel to the tip of the longest toe.",
    ].join("\n"),
  },
};

// Which size guide each leaf category uses (one-size categories have none).
export const categoryGuide: Record<string, SizeGuideKey> = {
  "t-shirts": "tops",
  chemises: "tops",
  hoodies: "tops",
  vestes: "tops",
  pantalons: "bottoms",
  jeans: "bottoms",
  shorts: "bottoms",
  sneakers: "shoes",
  sandales: "shoes",
};

// ---------- Home banners ----------
// Placeholder .png images (placehold.co): desktop 1600x640, mobile 800x1000.
// `link` is a locale-less internal path.

export type BannerSeed = {
  link: string;
  bg: string;
  fg: string;
  title: Tri;
  subtitle: Tri;
  cta: Tri;
};

export const banners: BannerSeed[] = [
  {
    link: "/nouveautes",
    bg: "332f2d",
    fg: "ffffff",
    title: { fr: "Nouvelle collection", ar: "المجموعة الجديدة", en: "New collection" },
    subtitle: {
      fr: "Découvrez les dernières pièces arrivées en boutique.",
      ar: "اكتشف أحدث القطع التي وصلت إلى المتجر.",
      en: "Discover the latest pieces to land in store.",
    },
    cta: { fr: "Voir les nouveautés", ar: "عرض الجديد", en: "Shop new arrivals" },
  },
  {
    link: "/soldes",
    bg: "d8c3a5",
    fg: "111111",
    title: { fr: "C'est les soldes", ar: "بدأت التخفيضات", en: "The sale is on" },
    subtitle: {
      fr: "Des prix réduits sur une sélection d'articles, tant que les stocks sont disponibles.",
      ar: "أسعار مخفّضة على مجموعة مختارة من المنتجات ما دامت الكميات متوفرة.",
      en: "Reduced prices on a selection of items while stocks last.",
    },
    cta: { fr: "Voir les soldes", ar: "عرض التخفيضات", en: "Shop the sale" },
  },
];

// Placeholder image colors (hex, no #) of the home collection tiles, by collection key.
export const collectionImageColors: Record<string, { bg: string; fg: string }> = {
  nouveautes: { bg: "1f2a44", fg: "ffffff" },
  "ete-26": { bg: "8ec5e8", fg: "111111" },
  essentials: { bg: "556b2f", fg: "ffffff" },
  streetwear: { bg: "6d1a2a", fg: "ffffff" },
};

// ---------- Static pages (placeholder legal / help content) ----------

export type PageSeed = { key: string; title: Tri; body: Tri };

export function staticPages(contact: { phone: string; email: string }): PageSeed[] {
  return [
    {
      key: "shipping",
      title: { fr: "Livraison", ar: "التوصيل", en: "Shipping" },
      body: {
        fr: "Nous livrons partout au Maroc en 24 à 72 heures ouvrées. Les frais de livraison sont fixes et la livraison est offerte à partir d'un certain montant d'achat, indiqué dans votre panier.\n\nVous payez en espèces à la réception de votre colis. Notre livreur vous appelle avant de passer.",
        ar: "نوصّل إلى جميع مدن المغرب خلال 24 إلى 72 ساعة عمل. تكلفة التوصيل ثابتة، والتوصيل مجاني ابتداءً من مبلغ معيّن يظهر في سلتك.\n\nتدفع نقدًا عند استلام طردك، وسيتصل بك الموزّع قبل المرور.",
        en: "We deliver anywhere in Morocco within 24 to 72 working hours. The delivery fee is flat and delivery is free above a certain order amount, shown in your cart.\n\nYou pay in cash when you receive your parcel. Our courier calls you before coming.",
      },
    },
    {
      key: "returns",
      title: {
        fr: "Retours et échanges",
        ar: "الإرجاع والاستبدال",
        en: "Returns and exchanges",
      },
      body: {
        fr: "Vous avez 10 jours après la livraison pour demander un échange. L'article doit être neuf, non porté, avec ses étiquettes et dans son emballage d'origine.\n\nÉcrivez-nous sur WhatsApp ou par e-mail avec votre numéro de commande, nous organisons l'échange avec vous.",
        ar: "لديك 10 أيام بعد التوصيل لطلب الاستبدال. يجب أن يكون المنتج جديدًا وغير مستعمل ومعه بطاقاته وفي غلافه الأصلي.\n\nراسلنا عبر واتساب أو البريد الإلكتروني مع رقم طلبك وسنرتّب الاستبدال معك.",
        en: "You have 10 days after delivery to request an exchange. The item must be new, unworn, with its tags and in its original packaging.\n\nMessage us on WhatsApp or by email with your order number and we will arrange the exchange with you.",
      },
    },
    {
      key: "terms",
      title: {
        fr: "Conditions générales de vente",
        ar: "الشروط العامة للبيع",
        en: "Terms and conditions",
      },
      body: {
        fr: "Ce texte est un contenu provisoire. Les conditions générales de vente définitives seront publiées ici avant l'ouverture de la boutique.\n\nLes commandes sont payables à la livraison. Les prix sont affichés en dirhams marocains (MAD), toutes taxes comprises.",
        ar: "هذا النص مؤقت. ستُنشر الشروط العامة للبيع النهائية هنا قبل افتتاح المتجر.\n\nتُدفع الطلبات عند الاستلام. الأسعار معروضة بالدرهم المغربي (MAD) شاملة جميع الرسوم.",
        en: "This text is placeholder content. The final terms and conditions will be published here before the store opens.\n\nOrders are paid on delivery. Prices are shown in Moroccan dirhams (MAD), all taxes included.",
      },
    },
    {
      key: "privacy",
      title: {
        fr: "Politique de confidentialité",
        ar: "سياسة الخصوصية",
        en: "Privacy policy",
      },
      body: {
        fr: "Ce texte est un contenu provisoire. La politique de confidentialité définitive sera publiée ici avant l'ouverture de la boutique.\n\nNous ne collectons que les informations nécessaires pour traiter vos commandes et, si vous le demandez, vous envoyer notre newsletter. Vous pouvez vous désinscrire à tout moment.",
        ar: "هذا النص مؤقت. ستُنشر سياسة الخصوصية النهائية هنا قبل افتتاح المتجر.\n\nنجمع فقط المعلومات اللازمة لمعالجة طلباتك، وإرسال نشرتنا البريدية إذا طلبت ذلك. يمكنك إلغاء الاشتراك في أي وقت.",
        en: "This text is placeholder content. The final privacy policy will be published here before the store opens.\n\nWe only collect the information needed to process your orders and, if you ask for it, to send you our newsletter. You can unsubscribe at any time.",
      },
    },
    {
      key: "contact",
      title: { fr: "Contact", ar: "اتصل بنا", en: "Contact" },
      body: {
        fr: `Une question sur un article, une taille ou une commande ? Écrivez-nous sur WhatsApp, appelez-nous ou envoyez un e-mail.\n\nTéléphone : ${contact.phone}\nE-mail : ${contact.email}`,
        ar: `سؤال عن منتج أو مقاس أو طلب؟ راسلنا عبر واتساب أو اتصل بنا أو أرسل بريدًا إلكترونيًا.\n\nالهاتف: ${contact.phone}\nالبريد الإلكتروني: ${contact.email}`,
        en: `A question about an item, a size or an order? Message us on WhatsApp, call us or send an email.\n\nPhone: ${contact.phone}\nEmail: ${contact.email}`,
      },
    },
  ];
}

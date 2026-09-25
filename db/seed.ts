import { Client } from "pg";
import {
  REASONS,
  STATUSES,
  type RequestResolution,
  type RequestStatus,
  type ReturnReason,
} from "../src/lib/domain/constants";
import { getDatabaseUrl } from "../src/lib/env";

interface SeedRequest {
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  orderNumber: string;
  itemSku: string;
  itemName: string;
  quantity: number;
  reason: ReturnReason;
  status: RequestStatus;
  resolution: RequestResolution | null;
  refundAmount: string | null;
  daysAgo: number;
  decisionHoursAfter?: number;
  softDeletedHoursAfter?: number;
  notes?: { author: string; body: string; hoursAfter: number }[];
}

function subDays(now: Date, days: number): Date {
  const d = new Date(now.getTime());
  d.setDate(d.getDate() - days);
  return d;
}

function addHours(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

// 36 total requests: 34 visible + 2 soft-deleted
// Covers all 25 (status x reason) combinations among visible rows
const SEED_DATA: SeedRequest[] = [
  // 1. open x damaged
  {
    customerName: "Aarav Sharma",
    customerEmail: "aarav.sharma@example.in",
    customerPhone: "+91 98201 12345",
    orderNumber: "ORD-10401",
    itemSku: "SKU-CUSH-BLK-M",
    itemName: "Memory Foam Ergonomic Cushion (Black, M)",
    quantity: 1,
    reason: "damaged",
    status: "open",
    resolution: null,
    refundAmount: null,
    daysAgo: 5,
    notes: [
      {
        author: "Pooja Sharma",
        body: "Customer raised request stating bottom seam was ripped upon unboxing.",
        hoursAfter: 2,
      },
    ],
  },
  // 2. open x wrong_item
  {
    customerName: "Priya Patel",
    customerEmail: "priya.patel@example.com",
    customerPhone: "+91 98450 54321",
    orderNumber: "ORD-10402",
    itemSku: "SKU-TSHIRT-NVY-L",
    itemName: "Organic Cotton Crew T-Shirt (Navy, L)",
    quantity: 2,
    reason: "wrong_item",
    status: "open",
    resolution: null,
    refundAmount: null,
    daysAgo: 4,
  },
  // 3. open x size_issue
  {
    customerName: "Rohan Mehta",
    customerEmail: "rohan.mehta@example.com",
    customerPhone: "+91 97112 88990",
    orderNumber: "ORD-10403",
    itemSku: "SKU-JEANS-SLM-32",
    itemName: "Slim Fit Stretch Denim (Indigo, 32)",
    quantity: 1,
    reason: "size_issue",
    status: "open",
    resolution: null,
    refundAmount: null,
    daysAgo: 3,
    notes: [
      {
        author: "Karan Verma",
        body: "Waist sizing is tighter than standard size chart. Customer requesting size 34.",
        hoursAfter: 1,
      },
    ],
  },
  // 4. open x not_as_described
  {
    customerName: "Ananya Iyer",
    customerEmail: "ananya.iyer@example.in",
    customerPhone: "+91 94440 12890",
    orderNumber: "ORD-10404",
    itemSku: "SKU-LAMP-DESK-LED",
    itemName: "Architectural LED Desk Lamp with Dimmer",
    quantity: 1,
    reason: "not_as_described",
    status: "open",
    resolution: null,
    refundAmount: null,
    daysAgo: 2,
  },
  // 5. open x changed_mind
  {
    customerName: "Vikram Singh",
    customerEmail: "vikram.singh@example.com",
    customerPhone: null,
    orderNumber: "ORD-10405",
    itemSku: "SKU-MUG-CER-WHT",
    itemName: "Matte Artisan Ceramic Mug (350ml)",
    quantity: 4,
    reason: "changed_mind",
    status: "open",
    resolution: null,
    refundAmount: null,
    daysAgo: 1,
  },

  // 6. in_review x damaged
  {
    customerName: "Neha Gupta",
    customerEmail: "neha.gupta@example.in",
    customerPhone: "+91 98300 67890",
    orderNumber: "ORD-10406",
    itemSku: "SKU-BOTTLE-SS-1L",
    itemName: "Vacuum Insulated Stainless Steel Bottle (1L)",
    quantity: 1,
    reason: "damaged",
    status: "in_review",
    resolution: null,
    refundAmount: null,
    daysAgo: 12,
    notes: [
      {
        author: "Rakesh Sinha",
        body: "Customer shared parcel photos showing deep dent on bottle base.",
        hoursAfter: 4,
      },
      {
        author: "Rakesh Sinha",
        body: "Moved to review to verify transit damage claim with carrier.",
        hoursAfter: 6,
      },
    ],
  },
  // 7. in_review x wrong_item
  {
    customerName: "Rahul Verma",
    customerEmail: "rahul.verma@example.com",
    customerPhone: "+91 98111 45678",
    orderNumber: "ORD-10407",
    itemSku: "SKU-HEADSET-WRL",
    itemName: "Active Noise Cancelling Wireless Headphones",
    quantity: 1,
    reason: "wrong_item",
    status: "in_review",
    resolution: null,
    refundAmount: null,
    daysAgo: 10,
    notes: [
      {
        author: "Sneha Nair",
        body: "Received wired version instead of wireless SKU. Checking packing slip.",
        hoursAfter: 3,
      },
    ],
  },
  // 8. in_review x size_issue
  {
    customerName: "Pooja Reddy",
    customerEmail: "pooja.reddy@example.in",
    customerPhone: "+91 98490 34567",
    orderNumber: "ORD-10408",
    itemSku: "SKU-SHOES-RUN-07",
    itemName: "Breathable Mesh Road Running Shoes (UK 7)",
    quantity: 1,
    reason: "size_issue",
    status: "in_review",
    resolution: null,
    refundAmount: null,
    daysAgo: 9,
  },
  // 9. in_review x not_as_described
  {
    customerName: "Kabir Nair",
    customerEmail: "kabir.nair@example.com",
    customerPhone: "+91 98950 23412",
    orderNumber: "ORD-10409",
    itemSku: "SKU-BAG-BKPK-GRN",
    itemName: "Waterproof Commuter Backpack (Olive Green)",
    quantity: 1,
    reason: "not_as_described",
    status: "in_review",
    resolution: null,
    refundAmount: null,
    daysAgo: 8,
    notes: [
      {
        author: "Pooja Sharma",
        body: "Customer claims fabric is canvas, not ballistic nylon as listed.",
        hoursAfter: 5,
      },
    ],
  },
  // 10. in_review x changed_mind
  {
    customerName: "Diya Sengupta",
    customerEmail: "diya.sengupta@example.in",
    customerPhone: "+91 98310 98765",
    orderNumber: "ORD-10410",
    itemSku: "SKU-HOODIE-OVR-M",
    itemName: "Heavyweight Boxy Hoodie (Charcoal, M)",
    quantity: 1,
    reason: "changed_mind",
    status: "in_review",
    resolution: null,
    refundAmount: null,
    daysAgo: 7,
  },

  // 11. approved x damaged (refund)
  {
    customerName: "Siddharth Joshi",
    customerEmail: "siddharth.joshi@example.com",
    customerPhone: "+91 98220 54321",
    orderNumber: "ORD-10411",
    itemSku: "SKU-CLOCK-WALL-MIN",
    itemName: "Minimalist Birch Wood Wall Clock",
    quantity: 1,
    reason: "damaged",
    status: "approved",
    resolution: "refund",
    refundAmount: "1450.00",
    daysAgo: 20,
    decisionHoursAfter: 12,
    notes: [
      {
        author: "Karan Verma",
        body: "Glass face shattered during delivery. Verified with packaging photos.",
        hoursAfter: 3,
      },
      {
        author: "Karan Verma",
        body: "Approved for full refund. Forwarded to finance.",
        hoursAfter: 12,
      },
    ],
  },
  // 12. approved x wrong_item (replacement)
  {
    customerName: "Tanvi Kulkarni",
    customerEmail: "tanvi.kulkarni@example.in",
    customerPhone: "+91 98230 67891",
    orderNumber: "ORD-10412",
    itemSku: "SKU-CASE-PHONE-15",
    itemName: "Matte Silicone Case (iPhone 15, Forest Green)",
    quantity: 1,
    reason: "wrong_item",
    status: "approved",
    resolution: "replacement",
    refundAmount: null,
    daysAgo: 18,
    decisionHoursAfter: 8,
    notes: [
      {
        author: "Sneha Nair",
        body: "Customer received iPhone 15 Pro case instead. Dispatching correct model.",
        hoursAfter: 8,
      },
    ],
  },
  // 13. approved x size_issue (replacement)
  {
    customerName: "Arjun Pillai",
    customerEmail: "arjun.pillai@example.com",
    customerPhone: null,
    orderNumber: "ORD-10413",
    itemSku: "SKU-JACKET-BMBR-L",
    itemName: "Weatherproof Bomber Jacket (Navy, L)",
    quantity: 1,
    reason: "size_issue",
    status: "approved",
    resolution: "replacement",
    refundAmount: null,
    daysAgo: 17,
    decisionHoursAfter: 15,
  },
  // 14. approved x not_as_described (refund)
  {
    customerName: "Meera Menon",
    customerEmail: "meera.menon@example.in",
    customerPhone: "+91 98470 11223",
    orderNumber: "ORD-10414",
    itemSku: "SKU-STAND-LAPTOP",
    itemName: "Ergonomic Aluminum Laptop Stand",
    quantity: 1,
    reason: "not_as_described",
    status: "approved",
    resolution: "refund",
    refundAmount: "1899.00",
    daysAgo: 15,
    decisionHoursAfter: 20,
    notes: [
      {
        author: "Rakesh Sinha",
        body: "Stand lacks 360 swivel advertised in batch 2 specifications.",
        hoursAfter: 10,
      },
      { author: "Rakesh Sinha", body: "Approved refund. Return pickup scheduled.", hoursAfter: 20 },
    ],
  },
  // 15. approved x changed_mind (store_credit)
  {
    customerName: "Devendra Rao",
    customerEmail: "devendra.rao@example.com",
    customerPhone: "+91 98860 33445",
    orderNumber: "ORD-10415",
    itemSku: "SKU-WALLET-LTHR-BRN",
    itemName: "Full Grain Leather Bi-Fold Wallet (Cognac)",
    quantity: 1,
    reason: "changed_mind",
    status: "approved",
    resolution: "store_credit",
    refundAmount: null,
    daysAgo: 14,
    decisionHoursAfter: 10,
    notes: [
      {
        author: "Pooja Sharma",
        body: "Customer agreed to store credit voucher code.",
        hoursAfter: 10,
      },
    ],
  },

  // 16. rejected x damaged
  {
    customerName: "Nandini Sen",
    customerEmail: "nandini.sen@example.in",
    customerPhone: "+91 98200 99887",
    orderNumber: "ORD-10416",
    itemSku: "SKU-SUNGLASS-AVTR",
    itemName: "Polarized Classic Aviator Sunglasses",
    quantity: 1,
    reason: "damaged",
    status: "rejected",
    resolution: null,
    refundAmount: null,
    daysAgo: 35,
    decisionHoursAfter: 24,
    notes: [
      {
        author: "Karan Verma",
        body: "Photographs reveal scratches caused by accidental drop, not transit defect.",
        hoursAfter: 18,
      },
      {
        author: "Karan Verma",
        body: "Rejection communicated to customer citing warranty terms.",
        hoursAfter: 24,
      },
    ],
  },
  // 17. rejected x wrong_item
  {
    customerName: "Karthik Subramanian",
    customerEmail: "karthik.sub@example.com",
    customerPhone: "+91 98400 44332",
    orderNumber: "ORD-10417",
    itemSku: "SKU-PEN-FOUNTAIN",
    itemName: "Brass Barrel Fine Nib Fountain Pen",
    quantity: 1,
    reason: "wrong_item",
    status: "rejected",
    resolution: null,
    refundAmount: null,
    daysAgo: 32,
    decisionHoursAfter: 16,
    notes: [
      {
        author: "Sneha Nair",
        body: "Checked warehouse scan log: barcode matched order exactly. Customer confirmed error on their end.",
        hoursAfter: 16,
      },
    ],
  },
  // 18. rejected x size_issue
  {
    customerName: "Pallavi Deshpande",
    customerEmail: "pallavi.d@example.in",
    customerPhone: "+91 98210 55667",
    orderNumber: "ORD-10418",
    itemSku: "SKU-BELT-LTHR-34",
    itemName: "Formal Reversible Leather Belt (34)",
    quantity: 1,
    reason: "size_issue",
    status: "rejected",
    resolution: null,
    refundAmount: null,
    daysAgo: 30,
    decisionHoursAfter: 12,
  },
  // 19. rejected x not_as_described
  {
    customerName: "Alok Mathur",
    customerEmail: "alok.mathur@example.com",
    customerPhone: null,
    orderNumber: "ORD-10419",
    itemSku: "SKU-DIFFUSER-CER",
    itemName: "Ultrasonic Ceramic Aroma Diffuser (200ml)",
    quantity: 1,
    reason: "not_as_described",
    status: "rejected",
    resolution: null,
    refundAmount: null,
    daysAgo: 28,
    decisionHoursAfter: 14,
  },
  // 20. rejected x changed_mind (RULE-3 SHOWCASE PART 1)
  {
    customerName: "Ritika Bansal",
    customerEmail: "ritika.b@example.in",
    customerPhone: "+91 98190 77889",
    orderNumber: "ORD-10421",
    itemSku: "SKU-CUSH-BLK-M",
    itemName: "Memory Foam Ergonomic Cushion (Black, M)",
    quantity: 1,
    reason: "changed_mind",
    status: "rejected",
    resolution: null,
    refundAmount: null,
    daysAgo: 45,
    decisionHoursAfter: 36,
    notes: [
      {
        author: "Rakesh Sinha",
        body: "Return initiated 40 days after delivery; exceeds 30-day policy window.",
        hoursAfter: 20,
      },
      {
        author: "Rakesh Sinha",
        body: "Request rejected due to return window expiration.",
        hoursAfter: 36,
      },
    ],
  },

  // 21. completed x damaged (refund)
  {
    customerName: "Gaurav Kapoor",
    customerEmail: "gaurav.k@example.com",
    customerPhone: "+91 98101 22334",
    orderNumber: "ORD-10422",
    itemSku: "SKU-VASE-GLS-SMK",
    itemName: "Smoked Glass Ribbed Flower Vase",
    quantity: 1,
    reason: "damaged",
    status: "completed",
    resolution: "refund",
    refundAmount: "950.00",
    daysAgo: 50,
    decisionHoursAfter: 18,
    notes: [
      { author: "Karan Verma", body: "Transit damage confirmed.", hoursAfter: 12 },
      { author: "Karan Verma", body: "Approved full refund.", hoursAfter: 18 },
      {
        author: "Pooja Sharma",
        body: "Refund transaction REF-9901 settled to customer bank account.",
        hoursAfter: 48,
      },
    ],
  },
  // 22. completed x wrong_item (replacement)
  {
    customerName: "Rashmi Deshmukh",
    customerEmail: "rashmi.d@example.in",
    customerPhone: "+91 98221 66778",
    orderNumber: "ORD-10423",
    itemSku: "SKU-ORGANIZER-DSK",
    itemName: "Modular Bamboo Desk Organizer Tray",
    quantity: 1,
    reason: "wrong_item",
    status: "completed",
    resolution: "replacement",
    refundAmount: null,
    daysAgo: 48,
    decisionHoursAfter: 14,
    notes: [
      {
        author: "Sneha Nair",
        body: "Replacement order AWB-778891 delivered and acknowledged by customer.",
        hoursAfter: 60,
      },
    ],
  },
  // 23. completed x size_issue (store_credit)
  {
    customerName: "Chirag Shah",
    customerEmail: "chirag.shah@example.com",
    customerPhone: "+91 98202 33445",
    orderNumber: "ORD-10424",
    itemSku: "SKU-PULLOVER-WOL",
    itemName: "Fine Merino Wool Pullover (Grey, M)",
    quantity: 1,
    reason: "size_issue",
    status: "completed",
    resolution: "store_credit",
    refundAmount: null,
    daysAgo: 46,
    decisionHoursAfter: 16,
    notes: [
      {
        author: "Pooja Sharma",
        body: "Store credit voucher CRED-10424 sent to customer email.",
        hoursAfter: 20,
      },
    ],
  },
  // 24. completed x not_as_described (refund)
  {
    customerName: "Tarun Bhatnagar",
    customerEmail: "tarun.b@example.in",
    customerPhone: null,
    orderNumber: "ORD-10425",
    itemSku: "SKU-SPEAKER-PORT",
    itemName: "Water-Resistant Bluetooth Mini Speaker",
    quantity: 1,
    reason: "not_as_described",
    status: "completed",
    resolution: "refund",
    refundAmount: "1799.00",
    daysAgo: 42,
    decisionHoursAfter: 22,
    notes: [
      {
        author: "Rakesh Sinha",
        body: "Battery capacity measured at 500mAh instead of 1200mAh claim.",
        hoursAfter: 15,
      },
      { author: "Karan Verma", body: "Refund processed successfully.", hoursAfter: 50 },
    ],
  },
  // 25. completed x changed_mind (store_credit)
  {
    customerName: "Divya Madhavan",
    customerEmail: "divya.m@example.com",
    customerPhone: "+91 98112 66778",
    orderNumber: "ORD-10426",
    itemSku: "SKU-BLANKET-THR",
    itemName: "Woven Cotton Waffle Throw Blanket",
    quantity: 1,
    reason: "changed_mind",
    status: "completed",
    resolution: "store_credit",
    refundAmount: null,
    daysAgo: 40,
    decisionHoursAfter: 12,
  },

  // 26. open x wrong_item (RULE-3 SHOWCASE PART 2 - Same order+sku as row 20)
  {
    customerName: "Ritika Bansal",
    customerEmail: "ritika.b@example.in",
    customerPhone: "+91 98190 77889",
    orderNumber: "ORD-10421",
    itemSku: "SKU-CUSH-BLK-M",
    itemName: "Memory Foam Ergonomic Cushion (Black, M)",
    quantity: 1,
    reason: "wrong_item",
    status: "open",
    resolution: null,
    refundAmount: null,
    daysAgo: 6,
    notes: [
      {
        author: "Pooja Sharma",
        body: "Customer raised legitimate new request for wrong firmness delivered. Rule 3 permits this since earlier ticket was rejected.",
        hoursAfter: 1,
      },
    ],
  },
  // 27. open x damaged
  {
    customerName: "Sameer Saxena",
    customerEmail: "sameer.s@example.in",
    customerPhone: "+91 98401 22334",
    orderNumber: "ORD-10427",
    itemSku: "SKU-KETTLE-ELEC",
    itemName: "Gooseneck Electric Pour-Over Kettle",
    quantity: 1,
    reason: "damaged",
    status: "open",
    resolution: null,
    refundAmount: null,
    daysAgo: 4,
  },
  // 28. open x size_issue
  {
    customerName: "Harish Chandra",
    customerEmail: "harish.c@example.com",
    customerPhone: "+91 98203 11223",
    orderNumber: "ORD-10428",
    itemSku: "SKU-GLOVES-LTHR-L",
    itemName: "Cashmere Lined Driving Gloves (L)",
    quantity: 1,
    reason: "size_issue",
    status: "open",
    resolution: null,
    refundAmount: null,
    daysAgo: 3,
  },
  // 29. in_review x damaged
  {
    customerName: "Shalini Hegde",
    customerEmail: "shalini.h@example.in",
    customerPhone: "+91 98451 99887",
    orderNumber: "ORD-10429",
    itemSku: "SKU-MIRROR-COMPACT",
    itemName: "Dual Magnification Brass Compact Mirror",
    quantity: 1,
    reason: "damaged",
    status: "in_review",
    resolution: null,
    refundAmount: null,
    daysAgo: 11,
    notes: [
      {
        author: "Karan Verma",
        body: "Hinge arrived broken. Verified inspection report.",
        hoursAfter: 5,
      },
    ],
  },
  // 30. in_review x not_as_described
  {
    customerName: "Pradeep Ranganathan",
    customerEmail: "pradeep.r@example.com",
    customerPhone: "+91 98113 44556",
    orderNumber: "ORD-10430",
    itemSku: "SKU-PLANTER-TERRA",
    itemName: "Handmade Terracotta Indoor Planter",
    quantity: 2,
    reason: "not_as_described",
    status: "in_review",
    resolution: null,
    refundAmount: null,
    daysAgo: 8,
  },
  // 31. approved x damaged (refund)
  {
    customerName: "Leela Nambiar",
    customerEmail: "leela.n@example.in",
    customerPhone: "+91 98211 77889",
    orderNumber: "ORD-10431",
    itemSku: "SKU-BLENDER-PRT",
    itemName: "Rechargeable Personal Smoothie Blender",
    quantity: 1,
    reason: "damaged",
    status: "approved",
    resolution: "refund",
    refundAmount: "2499.00",
    daysAgo: 22,
    decisionHoursAfter: 18,
    notes: [
      {
        author: "Sneha Nair",
        body: "Motor arrived non-functional. Full refund approved.",
        hoursAfter: 18,
      },
    ],
  },
  // 32. approved x changed_mind (store_credit)
  {
    customerName: "Abhinav Shukla",
    customerEmail: "abhinav.s@example.com",
    customerPhone: null,
    orderNumber: "ORD-10432",
    itemSku: "SKU-NOTEBOOK-A5",
    itemName: "Hardcover Dotted Journal (A5, Forest Green)",
    quantity: 3,
    reason: "changed_mind",
    status: "approved",
    resolution: "store_credit",
    refundAmount: null,
    daysAgo: 16,
    decisionHoursAfter: 14,
  },
  // 33. rejected x size_issue
  {
    customerName: "Geeta Krishnan",
    customerEmail: "geeta.k@example.in",
    customerPhone: "+91 98222 33445",
    orderNumber: "ORD-10433",
    itemSku: "SKU-SLIPPERS-SHP",
    itemName: "Shearling Lined Suede Slippers (UK 6)",
    quantity: 1,
    reason: "size_issue",
    status: "rejected",
    resolution: null,
    refundAmount: null,
    daysAgo: 29,
    decisionHoursAfter: 20,
    notes: [
      {
        author: "Rakesh Sinha",
        body: "Soles show heavy outdoor wear; return rejected as item is not in resalable condition.",
        hoursAfter: 20,
      },
    ],
  },
  // 34. completed x damaged (refund)
  {
    customerName: "Bhavesh Parekh",
    customerEmail: "bhavesh.p@example.com",
    customerPhone: "+91 98204 55667",
    orderNumber: "ORD-10434",
    itemSku: "SKU-FRAME-OAK-A3",
    itemName: "Solid White Oak Poster Frame (A3)",
    quantity: 2,
    reason: "damaged",
    status: "completed",
    resolution: "refund",
    refundAmount: "1250.00",
    daysAgo: 52,
    decisionHoursAfter: 16,
    notes: [
      {
        author: "Pooja Sharma",
        body: "Corner joint split during transport. Refund processed.",
        hoursAfter: 16,
      },
    ],
  },

  // 35. open x size_issue (soft-deleted)
  {
    customerName: "Manoj Kaushik",
    customerEmail: "manoj.k@example.in",
    customerPhone: "+91 98114 88990",
    orderNumber: "ORD-10435",
    itemSku: "SKU-RING-SILVER",
    itemName: "Sterling Silver Minimalist Band (Size 10)",
    quantity: 1,
    reason: "size_issue",
    status: "open",
    resolution: null,
    refundAmount: null,
    daysAgo: 25,
    softDeletedHoursAfter: 48,
    notes: [
      {
        author: "Karan Verma",
        body: "Customer requested removal from desk; decided to gift it to a family member instead.",
        hoursAfter: 24,
      },
    ],
  },
  // 36. rejected x damaged (soft-deleted)
  {
    customerName: "Swati Chawla",
    customerEmail: "swati.c@example.com",
    customerPhone: "+91 98452 33445",
    orderNumber: "ORD-10436",
    itemSku: "SKU-TEAPOT-CAST",
    itemName: "Japanese Cast Iron Teapot with Trivet",
    quantity: 1,
    reason: "damaged",
    status: "rejected",
    resolution: null,
    refundAmount: null,
    daysAgo: 38,
    decisionHoursAfter: 12,
    softDeletedHoursAfter: 24,
    notes: [
      {
        author: "Rakesh Sinha",
        body: "Damage caused by placing empty kettle on open flame.",
        hoursAfter: 8,
      },
      {
        author: "Rakesh Sinha",
        body: "Ticket closed and archived from desk view.",
        hoursAfter: 24,
      },
    ],
  },
];

async function seed() {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
    console.error("Refusing to seed in production without --force");
    process.exit(1);
  }

  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();

  try {
    await client.query("BEGIN");

    // Verify that every status x reason combination is present among visible rows
    for (const s of STATUSES) {
      for (const r of REASONS) {
        const found = SEED_DATA.some(
          (d) => d.status === s && d.reason === r && d.softDeletedHoursAfter === undefined,
        );
        if (!found) {
          throw new Error(`Missing visible seed request for ${s} x ${r}`);
        }
      }
    }

    // Reset data and sequence deterministically
    await client.query("TRUNCATE request_notes, return_requests RESTART IDENTITY");
    await client.query("ALTER SEQUENCE return_request_ref_seq RESTART WITH 1");

    const now = new Date();

    for (const req of SEED_DATA) {
      const createdAt = subDays(now, req.daysAgo);
      const decidedAt =
        req.decisionHoursAfter !== undefined ? addHours(createdAt, req.decisionHoursAfter) : null;
      const deletedAt =
        req.softDeletedHoursAfter !== undefined
          ? addHours(decidedAt ?? createdAt, req.softDeletedHoursAfter)
          : null;
      const updatedAt = deletedAt ?? decidedAt ?? createdAt;

      const insertRes = await client.query<{ id: string; reference: string }>(
        `
        INSERT INTO return_requests (
          customer_name,
          customer_email,
          customer_phone,
          order_number,
          item_sku,
          item_name,
          quantity,
          reason,
          status,
          resolution,
          refund_amount,
          created_at,
          updated_at,
          decided_at,
          deleted_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        ) RETURNING id, reference
        `,
        [
          req.customerName,
          req.customerEmail,
          req.customerPhone,
          req.orderNumber,
          req.itemSku,
          req.itemName,
          req.quantity,
          req.reason,
          req.status,
          req.resolution,
          req.refundAmount,
          createdAt,
          updatedAt,
          decidedAt,
          deletedAt,
        ],
      );

      const requestId = insertRes.rows[0].id;

      if (req.notes && req.notes.length > 0) {
        for (const note of req.notes) {
          const noteCreatedAt = addHours(createdAt, note.hoursAfter);
          await client.query(
            `
            INSERT INTO request_notes (
              request_id,
              author,
              body,
              created_at
            ) VALUES ($1, $2, $3, $4)
            `,
            [requestId, note.author, note.body, noteCreatedAt],
          );
        }
      }
    }

    await client.query("COMMIT");

    // Print verification metrics
    const totalCountRes = await client.query<{ count: string }>(
      "SELECT count(*) FROM return_requests",
    );
    const visibleCountRes = await client.query<{ count: string }>(
      "SELECT count(*) FROM return_requests WHERE deleted_at IS NULL",
    );
    const softDeletedCountRes = await client.query<{ count: string }>(
      "SELECT count(*) FROM return_requests WHERE deleted_at IS NOT NULL",
    );
    const refRangeRes = await client.query<{ first_ref: string; last_ref: string }>(
      "SELECT min(reference) as first_ref, max(reference) as last_ref FROM return_requests",
    );
    const statusCountsRes = await client.query<{ status: string; count: string }>(
      `SELECT status, count(*) FROM return_requests WHERE deleted_at IS NULL GROUP BY status ORDER BY status`,
    );
    const reasonCountsRes = await client.query<{ reason: string; count: string }>(
      `SELECT reason, count(*) FROM return_requests WHERE deleted_at IS NULL GROUP BY reason ORDER BY reason`,
    );

    console.log("Database seeded successfully.");
    console.log(
      `Total rows: ${totalCountRes.rows[0].count} (Visible: ${visibleCountRes.rows[0].count}, Soft-deleted: ${softDeletedCountRes.rows[0].count})`,
    );
    console.log(
      `Reference range: ${refRangeRes.rows[0].first_ref} .. ${refRangeRes.rows[0].last_ref}`,
    );

    console.log("\nVisible counts per status:");
    console.table(
      statusCountsRes.rows.map((r) => ({
        status: r.status,
        count: Number(r.count),
      })),
    );

    console.log("Visible counts per reason:");
    console.table(
      reasonCountsRes.rows.map((r) => ({
        reason: r.reason,
        count: Number(r.count),
      })),
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seeding failed, rolled back:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

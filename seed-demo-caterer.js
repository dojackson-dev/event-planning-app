/**
 * Demo caterer seed: one caterer vendor with a menu (items + packages) to try the vendor catalog.
 * Target: demo Supabase project (rrljixodciaptldnzeoc)
 *
 * Creates:
 *  - caterer login   (chef@democatering.com / Demo@2024!)
 *  - vendor account  (Demo Southern Table Catering, category caterer, menu shown to clients)
 *  - 18 menu items across Drinks, Appetizers, Salads, Entrees, Sides, Desserts and Service & Extras (one hidden
 *    from clients) and 2 packages (one with a hidden price)
 *  - booking link    (/book/demo-southern-table) so clients can pick menu items on a request
 *
 * Needs the catalog migration (packages/backend/migrations/create-vendor-catalog.sql) and the caterer
 * migration (add-caterer-vendor-category.sql) already run on the demo project.
 *
 * Run (demo project values, never commit them):
 *   SUPABASE_URL=https://rrljixodciaptldnzeoc.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node seed-demo-caterer.js
 * Safe to run again: it reuses the login and vendor, and replaces that vendor's menu.
 */

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = "chef@democatering.com";
const PASSWORD = "Demo@2024!";
const SLUG = "demo-southern-table";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!SUPABASE_URL.includes("rrljixodciaptldnzeoc")) {
  console.error("Refusing to run: SUPABASE_URL is not the demo project.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function fail(step, error) {
  console.error(`${step}: ${error.message}`);
  if (
    /vendor_items|visible_to_clients|show_catalog_to_clients/.test(
      error.message,
    )
  ) {
    console.error(
      "Run packages/backend/migrations/create-vendor-catalog.sql on the demo project first.",
    );
  }
  if (/vendor_accounts_category_check|caterer/.test(error.message)) {
    console.error(
      "Run packages/backend/migrations/add-caterer-vendor-category.sql on the demo project first.",
    );
  }
  process.exit(1);
}

async function authUser() {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) fail("listUsers", error);
  const existing = data.users.find((u) => u.email === EMAIL);
  if (existing) return existing.id;
  const created = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: "Chef", last_name: "Marcel" },
  });
  if (created.error) fail("createUser", created.error);
  return created.data.user.id;
}

// section, name, description, unit, price, extras. Menus show sections in a fixed order, whatever order these are in.
const MENU = [
  ["Drinks", "Sweet Tea & Lemonade Station", "Self-serve, refilled throughout.", "flat", 125],
  ["Drinks", "Bottled Water & Soda", "Chilled in tubs with ice.", "person", 2.5],
  ["Appetizers", "Deviled Eggs", "Smoked paprika, pickled jalapeño.", "each", 1.75],
  ["Appetizers", "Chicken & Waffle Bites", "Maple-hot honey drizzle.", "each", 3],
  ["Appetizers", "Pimento Cheese & Crackers", "House-made, served in cups.", "person", 3.5],
  ["Salads", "Peach & Arugula Salad", "Goat cheese, pecans, honey vinaigrette.", "person", 5],
  ["Salads", "Classic Garden Salad", "Mixed greens, cucumber, tomato, choice of dressing.", "person", 4],
  ["Entrees", "Smoked Brisket", "Slow-smoked 14 hours, sliced to order.", "person", 18],
  ["Entrees", "Fried Chicken", "Buttermilk-brined, hand-breaded, crispy.", "person", 14],
  ["Entrees", "Shrimp & Grits", "Gulf shrimp over stone-ground cheese grits.", "person", 19],
  ["Entrees", "Vegetable Lasagna", "Roasted seasonal vegetables, three cheeses.", "person", 13],
  ["Sides", "Mac & Cheese", "Baked, with a toasted crumb top.", "person", 4],
  ["Sides", "Collard Greens", "Simmered with smoked turkey.", "person", 3.5],
  ["Sides", "Cornbread Muffins", "Honey butter on the side.", "each", 1.5],
  ["Desserts", "Banana Pudding", "Layered with vanilla wafers and fresh whipped cream.", "person", 4.5],
  ["Desserts", "Peach Cobbler", "Warm, served with vanilla ice cream.", "person", 5],
  ["Service & Extras", "Serving Staff", "Uniformed servers for buffet service and cleanup.", "hour", 35],
  // Kept off the client menu on purpose: the vendor can still use it on their own estimates.
  ["Service & Extras", "Delivery & Setup (internal)", "Travel, delivery and chafing dish setup. Added on the vendor's estimate.", "flat", 150, { visible_to_clients: false }],
];

const PACKAGES = [
  {
    name: "Southern Classic Buffet",
    description: "Pick-your-protein buffet that covers a whole reception.",
    unit: "person",
    price: 29,
    includes: [
      ["Smoked Brisket", 1],
      ["Mac & Cheese", 1],
      ["Collard Greens", 1],
      ["Cornbread Muffins", 2],
      ["Banana Pudding", 1],
    ],
  },
  {
    name: "Full Service Wedding Package",
    description:
      "Dinner, dessert, drink station and staff. Ask us for a custom quote for your guest count.",
    unit: "flat",
    price: 0,
    hide_price: true,
    includes: [
      ["Shrimp & Grits", 1],
      ["Fried Chicken", 1],
      ["Peach Cobbler", 1],
      ["Sweet Tea & Lemonade Station", 1],
      ["Serving Staff", 1],
    ],
  },
];

async function main() {
  const userId = await authUser();

  const { error: userErr } = await supabase.from("users").upsert(
    {
      id: userId,
      email: EMAIL,
      first_name: "Chef",
      last_name: "Marcel",
      role: "vendor",
      roles: ["vendor"],
      status: "active",
      email_verified: true,
    },
    { onConflict: "id" },
  );
  if (userErr) fail("users upsert", userErr);

  const vendorFields = {
    business_name: "Demo Southern Table Catering",
    category: "caterer",
    categories: ["caterer"],
    bio: "Family-run Southern catering for weddings, repasts, church events and corporate lunches. Everything made from scratch.",
    email: EMAIL,
    phone: "+13125550142",
    city: "Chicago",
    state: "IL",
    zip_code: "60601",
    is_active: true,
    show_catalog_to_clients: true,
  };
  let { data: vendor } = await supabase
    .from("vendor_accounts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (vendor) {
    const { error } = await supabase
      .from("vendor_accounts")
      .update(vendorFields)
      .eq("id", vendor.id);
    if (error) fail("vendor update", error);
  } else {
    const { data, error } = await supabase
      .from("vendor_accounts")
      .insert({ user_id: userId, ...vendorFields })
      .select("id")
      .single();
    if (error) fail("vendor insert", error);
    vendor = data;
  }

  // Replace the menu so the script can be run again.
  const { error: delErr } = await supabase
    .from("vendor_items")
    .delete()
    .eq("vendor_account_id", vendor.id);
  if (delErr) fail("clear menu", delErr);

  // Older demo databases predate the per-item "show on client menu" column.
  const probe = await supabase
    .from("vendor_items")
    .select("visible_to_clients")
    .limit(1);
  const hasVisibility = !probe.error;
  if (!hasVisibility) {
    console.warn(
      "vendor_items.visible_to_clients is missing on this project, so the hidden item is skipped. Run on the demo SQL editor, then run this script again:\n" +
        "  ALTER TABLE public.vendor_items ADD COLUMN IF NOT EXISTS visible_to_clients boolean NOT NULL DEFAULT true;\n" +
        "  NOTIFY pgrst, 'reload schema';",
    );
  }

  const rows = MENU.filter(([, , , , , extra]) => hasVisibility || !extra).map(
    ([section, name, description, unit, price, extra], i) => ({
      vendor_account_id: vendor.id,
      kind: "item",
      ...(hasVisibility ? { visible_to_clients: true } : {}),
      section,
      name,
      description,
      unit,
      price,
      sort_order: i,
      ...(extra ?? {}),
    }),
  );
  const { data: items, error: itemsErr } = await supabase
    .from("vendor_items")
    .insert(rows)
    .select("id, name");
  if (itemsErr) fail("insert items", itemsErr);
  const idByName = Object.fromEntries(items.map((i) => [i.name, i.id]));

  for (const [i, pkg] of PACKAGES.entries()) {
    const { data: created, error } = await supabase
      .from("vendor_items")
      .insert({
        vendor_account_id: vendor.id,
        kind: "package",
        section: "Packages",
        name: pkg.name,
        description: pkg.description,
        unit: pkg.unit,
        price: pkg.price,
        hide_price: !!pkg.hide_price,
        sort_order: i,
      })
      .select("id")
      .single();
    if (error) fail(`insert package ${pkg.name}`, error);
    const { error: linkErr } = await supabase
      .from("vendor_package_items")
      .insert(
        pkg.includes.map(([name, quantity]) => ({
          package_id: created.id,
          item_id: idByName[name],
          quantity,
        })),
      );
    if (linkErr) fail(`link package ${pkg.name}`, linkErr);
  }

  const { data: link } = await supabase
    .from("vendor_booking_links")
    .select("id")
    .eq("vendor_account_id", vendor.id)
    .maybeSingle();
  const linkFields = {
    slug: SLUG,
    is_active: true,
    custom_message:
      "Tell us about your event and pick the dishes you like. We will send an estimate.",
  };
  const linkRes = link
    ? await supabase
        .from("vendor_booking_links")
        .update(linkFields)
        .eq("id", link.id)
    : await supabase
        .from("vendor_booking_links")
        .insert({ vendor_account_id: vendor.id, ...linkFields });
  if (linkRes.error) fail("booking link", linkRes.error);

  console.log("\nDemo caterer ready.");
  console.log(`  Login:           ${EMAIL} / ${PASSWORD}`);
  console.log("  Vendor menu:     /vendors/dashboard/catalog");
  console.log(`  Client menu:     /book/${SLUG}`);
  console.log(`  Public profile:  /vendors/${vendor.id}`);
}

main().catch((e) => fail("unexpected", e));

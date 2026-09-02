# Complete Analysis: Dreamstime Contributor DOM Structure, Selectors & Form Fields
**Technical Documentation of Extracted DOM Recording for Microstock AIO Metadata Browser Extension**  
*Source Recording Files:*  
- *Session 1: `rekaman-dreamstime-20260902_120029.json` (1,460 DOM Events & 383 User Actions)*  
- *Session 2: `rekaman-dreamstime-20260902_121634.json` (970 DOM Events & 165 User Actions)*  
*Analysis Date: September 2, 2026*

---

## 1. Executive Summary & Dreamstime Architecture

Dreamstime Contributor utilizes a **Server-Rendered + jQuery/AJAX dynamic modal workflow**. Contributors upload assets in batches, view them in a grid of cards (`div.upload-item`), and edit individual asset metadata through a modal submission panel (`div.popup-upload.popup-upload--submit`).

### Two Distinct Automation Workflows:
The browser extension must support two contributor operational modes:

```
[Mode A: Save Draft Only]
  1. Open Asset Modal -> Record initial `firstAssetId`
  2. Clear pre-existing metadata (Title, Desc, Categories, Keywords)
  3. Fill AI Title, Description, Categories (1-3), Keywords
  4. Click "Save edits" (`#js-savededits`) -> Wait for success toast (`.noty_type__dt-success`)
  5. Click Next Arrow (`a#js-next-submit.popup-nav__btn--next`)
  6. Check next `assetId`. If `assetId === firstAssetId` -> Stop & Close modal.

[Mode B: Fill & Immediate Submit]
  1. Open Asset Modal
  2. Clear pre-existing metadata
  3. Fill AI Title, Description, Categories (1-3), Keywords
  4. Click "Submit file" (`a#js-next-submit`)
  5. Dreamstime automatically submits asset and loads the next unfinished asset.
  6. When the last asset is submitted, the modal automatically closes back to the main uploads page.
```

---

## 2. Precise DOM Selector Map (Validated Selectors)

| Form Component | Primary Selector (ID / Class) | Fallback Selector | Element Type & Notes |
| :--- | :--- | :--- | :--- |
| **1. Asset Item Card** | `div.upload-item[id]` | `div.upload-item--sml` | Grid card for uploaded batch item (e.g. `id="473820111"`) |
| **2. Asset Thumbnail** | `div.upload-item__thumb img` | `a.js-upload-edit img` | `<img>` preview thumbnail (used for LLM Vision processing) |
| **3. Open Edit Modal** | `a.upload-item__link.js-upload-edit` | `div.upload-item__thumb a` | Link opening metadata editor modal |
| **4. Edit Modal Container** | `div.popup-upload.popup-upload--submit` | `div.popup-upload` | Modal wrapper for metadata editing |
| **5. Title Input** | `input#title` | `input[name="M_title"]` | `<input>` text box for asset title |
| **6. Clear Title Button** | `a#js-remove-title` | `a.form-row-close` | Quick button to clear pre-existing title |
| **7. Description Textarea** | `textarea#description` | `textarea[name="M_description"]` | `<textarea>` for asset description |
| **8. Clear Description** | `a.js-editcleandescription` | `div.form-row--description a.form-row-close` | Button with `i.icn--close` icon clearing pre-existing description |
| **9. Main Category 1** | `select#M_Category_1` | `select[name="M_Category_1"]` | Main category 1 dropdown (Required) |
| **10. Subcategory 1** | `select#M_Subcategory_1` | `select[name="M_Subcategory_1"]` | Dependent subcategory 1 dropdown (Required) |
| **11. Clear Category 1** | `a#js-remove-cat1` | `div.form-row--categories a.form-row-close` | Reset category 1 |
| **12. Main Category 2** | `select#M_Category_2` | `select[name="M_Category_2"]` | Main category 2 dropdown (Optional) |
| **13. Subcategory 2** | `select#M_Subcategory_2` | `select[name="M_Subcategory_2"]` | Dependent subcategory 2 dropdown (Optional) |
| **14. Clear Category 2** | `a#js-remove-cat2` | `a.form-row-close--cat2` | Reset category 2 |
| **15. Main Category 3** | `select#M_Category_3` | `select[name="M_Category_3"]` | Main category 3 dropdown (Optional) |
| **16. Subcategory 3** | `select#M_Subcategory_3` | `select[name="M_Subcategory_3"]` | Dependent subcategory 3 dropdown (Optional) |
| **17. Clear Category 3** | `a#js-remove-cat3` | `a.form-row-close--cat3` | Reset category 3 |
| **18. Keyword Tag Input** | `input#keywords_tag` | `div.popup__row--keywords input` | Autocomplete / tag text box |
| **19. Clear All Keywords** | `a.js-editcleankeywords` | `div.popup__row--keywords a.form-row-close` | One-click button wiping all pre-existing keywords |
| **20. Commercial (RF) Button**| `a:has-text("Commercial (RF)")` | `div.popup__form-element--buttons a:first-child` | Sets license to Commercial Royalty-Free |
| **21. Editorial (ED) Button** | `a:has-text("Editorial (ED)")` | `div.popup__form-element--buttons a:last-child` | Sets license to Editorial |
| **22. Save Edits (Draft)** | `div#js-savededits` | `#js-savededits` | Button saving current metadata changes |
| **23. Submit File (Review)** | `a#js-next-submit` | `#js-next-submit` | Button submitting file for curation |
| **24. Next Item Arrow** | `a#js-next-submit.popup-nav__btn--next` | `a.popup-nav__btn--next` | Arrow navigating to next item in draft mode |
| **25. Prev Item Arrow** | `a#js-prev-submit.popup-nav__btn--prev` | `a.popup-nav__btn--prev` | Arrow navigating to previous item |
| **26. Notification Toast (Save)**| `div.noty_bar.noty_type__dt-success` | `div.noty_body` | Green toast confirming successful draft save |
| **27. In-Modal Status Banner** | `div#js-submit-message` | `div.popup-upload__message--success` | Success/error message banner inside modal |

---

## 3. Infinite Loop Prevention & First Asset ID Tracking (Mode A)

When contributors choose **Mode A (Save Draft Only)**, navigating with the Next Arrow (`a.popup-nav__btn--next`) will cycle infinitely around all batch assets. To prevent infinite loops:

1. **Capture First Processed Asset ID**:
   Extract the asset ID from the modal header text (e.g., `Submit file 473814624`) or the container item ID:
   ```javascript
   function getCurrentAssetId() {
     const headerText = document.querySelector('.popup-nav__breadcrumbs, .popup-nav')?.textContent || '';
     const match = headerText.match(/(\d{7,12})/);
     return match ? match[1] : null;
   }
   ```
2. **Loop Condition**:
   - Maintain a `Set` of processed IDs: `const processedIds = new Set();`
   - Store `const firstAssetId = getCurrentAssetId();`
   - After saving and clicking Next Arrow, if `getCurrentAssetId() === firstAssetId` or `processedIds.has(nextId)`, the entire batch is completed $\to$ Close the modal and return to upload overview.

---

## 4. Pre-Existing Metadata Wiping Mechanism

Assets uploaded with pre-embedded EXIF/IPTC data will have fields automatically filled by Dreamstime. The extension should execute a clean-slate wipe before applying AI metadata:

```javascript
/**
 * Wipes all pre-existing metadata fields on Dreamstime editor modal
 */
export async function clearExistingMetadata() {
  // 1. Clear Title
  const clearTitle = document.querySelector("#js-remove-title");
  if (clearTitle) clearTitle.click();

  // 2. Clear Description
  const clearDesc = document.querySelector(".js-editcleandescription");
  if (clearDesc) clearDesc.click();

  // 3. Clear Categories (1, 2, 3)
  const clearCat1 = document.querySelector("#js-remove-cat1");
  if (clearCat1) clearCat1.click();
  const clearCat2 = document.querySelector("#js-remove-cat2");
  if (clearCat2) clearCat2.click();
  const clearCat3 = document.querySelector("#js-remove-cat3");
  if (clearCat3) clearCat3.click();

  // 4. Clear Keywords
  const clearKeywords = document.querySelector(".js-editcleankeywords");
  if (clearKeywords) clearKeywords.click();

  await new Promise(r => setTimeout(r, 100));
}
```

---

## 5. Notification Toast & Save Status Detection

Dreamstime displays asynchronous feedback when saving drafts:
1. **Noty Toast Notification**:
   - Selector: `div.noty_bar.noty_type__dt-success .noty_body`
   - Content: `"Image ID:473814624 saved successfully You can exit edit page"`
2. **Modal Status Bar**:
   - Selector: `div#js-savededits.popup-nav__status`
   - Transitions: `"Saving..."` $\to$ `"Save edits"`
3. **Success Banner**:
   - Selector: `div#js-submit-message.popup-upload__message--success`

```javascript
/**
 * Waits for save confirmation toast or status update
 */
export async function waitForSaveConfirmation(timeoutMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const toast = document.querySelector(".noty_bar.noty_type__dt-success, #js-submit-message:not([style*='display: none'])");
    if (toast) return true;
    await new Promise(r => setTimeout(r, 150));
  }
  return false;
}
```

---

## 6. Complete Hierarchical Category & Subcategory Taxonomy (15 Main Categories & 182 Subcategories)

Dreamstime uses a two-tier hierarchical category system. A contributor can assign **up to 3 Category / Subcategory pairs**.

### Image vs Video Category Differences:
- Both **Images (Photos, Vectors, Illustrations)** and **Videos (Footage)** share the same **15 Main Categories**.
- For Video assets, static graphic subcategories (specifically `186: Vector` under `172: Illustrations & Clipart`) are omitted or ignored during review, while motion-relevant subcategories (such as `166: 3D & Computer generated` and `212: Generative AI`) are valid.

---

### 1. Abstract (Main Category ID: `38`) — 26 Subcategories
| Subcategory ID | Subcategory Name | Indonesian Translation | Focus & Keywords |
| :---: | :--- | :--- | :--- |
| **211** | Aerial | Tampilan Udara | Drone perspective, top-down geometry |
| **112** | Backgrounds | Latar Belakang | Wallpapers, backdrop, backdrop textures |
| **39** | Blurs | Efek Blur | Bokeh, out of focus, motion blur |
| **164** | Colors | Warna & Spektrum | Color palette, vivid, rainbow, monochromatic |
| **40** | Competition | Kompetisi & Lomba | Challenge, race, winning concept |
| **41** | Craftsmanship | Keahlian & Kriya | Handmade, artisan, sculpting, detailed craft |
| **42** | Danger | Bahaya & Peringatan | Warning, caution, toxic, hazard symbols |
| **43** | Exploration | Eksplorasi & Petualangan| Discovery, compass, uncharted, journey |
| **158** | Fun | Kesenangan & Ceria | Joy, playful, colorful happiness |
| **44** | Help | Bantuan & Dukungan | Support, helping hands, assistance |
| **149** | Love | Cinta & Kasih Sayang | Hearts, romance, passion, wedding abstract |
| **45** | Luxury | Kemewahan & Premium | Gold, silk, diamonds, prestige, elegant |
| **187** | Mobile | Perangkat Seluler | Smartphone concepts, connectivity abstract |
| **46** | Peace | Kedamaian & Harmoni | Zen, dove, calm meditation, serenity |
| **165** | Planetarium | Planetarium & Luar Angkasa | Galaxy, constellations, nebula, cosmos |
| **47** | Power | Kekuatan & Energi | Lightning, surge, muscular force, power surge |
| **48** | Purity | Kemurnian & Kebersihan | Clean water, white, crystal clear, innocent |
| **128** | Religion | Agama & Simbol Spiritual | Cross, crescent, spiritual light, praying |
| **155** | Seasonal & Holiday | Musiman & Liburan | Autumn leaves abstract, winter snow, holiday vibe |
| **49** | Security | Keamanan & Privasi | Shield, padlock, cyber defense abstract |
| **50** | Sports | Olahraga Abstrak | Motion vectors, dynamic athletics lines |
| **51** | Stress | Stres & Tekanan | Headache abstract, chaos, pressure concept |
| **52** | Success | Kesuksesan & Prestasi | Arrow going up, achievement, trophy concept |
| **53** | Teamwork | Kerja Sama Tim | Connected gears, collaboration abstract |
| **141** | Textures | Tekstur Permukaan | Wood grain, marble, rust, leather, concrete |
| **54** | Unique | Keunikan & Standout | Standing out from crowd, special piece |

---

### 2. Animals (Main Category ID: `29`) — 9 Subcategories
| Subcategory ID | Subcategory Name | Indonesian Translation | Focus & Keywords |
| :---: | :--- | :--- | :--- |
| **31** | Birds | Burung | Eagles, parrots, seagulls, flying birds, poultry |
| **33** | Farm | Hewan Ternak | Cows, horses, sheep, goats, pigs |
| **36** | Insects | Serangga | Butterflies, bees, ants, spiders, beetles |
| **32** | Mammals | Mamalia | Lions, tigers, deer, elephants, bears |
| **34** | Marine life | Hewan Laut | Fish, dolphins, corals, sharks, whales, turtles |
| **30** | Pets | Hewan Peliharaan | Dogs, cats, hamsters, puppies, kittens |
| **35** | Reptiles & Amphibians | Reptil & Amfibi | Snakes, lizards, frogs, chameleons, crocodiles |
| **37** | Rodents | Hewan Pengerat | Mice, rats, squirrels, capybaras |
| **168** | Wildlife | Satwa Liar | Safari, savannah animals, jungle biodiversity |

---

### 3. Arts & Architecture (Main Category ID: `69`) — 11 Subcategories
| Subcategory ID | Subcategory Name | Indonesian Translation | Focus & Keywords |
| :---: | :--- | :--- | :--- |
| **124** | Details | Detail Arsitektur | Columns, ornate facade, door handles, arches |
| **71** | Generic architecture | Arsitektur Umum | General building structures, suburban houses |
| **132** | Historic buildings | Bangunan Bersejarah | Castles, ancient temples, cathedrals, palaces |
| **153** | Home | Rumah & Hunian | Residential houses, cozy cottages, villas |
| **73** | Indoor | Ruangan Dalam | Rooms, lobbies, corridors, ceiling structures |
| **70** | Landmarks | Monumen Terkenal | Eiffel tower, Big Ben, Taj Mahal, Statue of Liberty |
| **131** | Modern buildings | Bangunan Modern | Glass skyscrapers, contemporary towers, offices |
| **130** | Night scenes | Pemandangan Malam | Illuminated buildings, night cityscapes |
| **72** | Outdoor | Arsitektur Luar | Plazas, courtyards, building exteriors |
| **174** | Ruins & Ancient | Reruntuhan & Purbakala| Roman ruins, ancient stones, historical relics |
| **154** | Work places | Tempat Kerja | Office cubicles, coworking spaces, workshops |

---

### 4. Business (Main Category ID: `74`) — 11 Subcategories
| Subcategory ID | Subcategory Name | Indonesian Translation | Focus & Keywords |
| :---: | :--- | :--- | :--- |
| **79** | Communications | Komunikasi Bisnis | Customer service, headsets, call centers, press |
| **78** | Computers | Komputer Bisnis | Laptops on desk, office spreadsheets, typing |
| **80** | Finance | Keuangan & Investasi | Money, stock market charts, currency, banking |
| **77** | Industries | Sektor Industri | Commercial production, business plants |
| **83** | Metaphors | Metafora Bisnis | Stepping stones, lightbulb ideas, balance scales |
| **84** | Objects | Peralatan Bisnis | Briefcases, pens, contracts, calculators, stamps |
| **75** | People | Pebisnis & Karyawan | Executives, business suits, meetings, entrepreneurs |
| **81** | Still-life | Still-Life Bisnis | Desktop arrangements, notebooks, coffee cup setup |
| **76** | Teams | Kerja Sama Tim | Team brainstorming, handshake, partnership |
| **82** | Transportation | Transportasi Bisnis | Logistics, fleet delivery, executive corporate travel |
| **85** | Travel | Perjalanan Bisnis | Airport terminals, business flights, hotel suites |

---

### 5. Editorial (Main Category ID: `177`) — 8 Subcategories
| Subcategory ID | Subcategory Name | Indonesian Translation | Focus & Keywords |
| :---: | :--- | :--- | :--- |
| **178** | Celebrities | Selebriti & Tokoh | Red carpet, film festivals, famous actors/singers |
| **185** | Commercial | Berita Komersial | Product launches, company brand events, trade expos |
| **179** | Events | Acara & Rapat Publik | Parades, demonstrations, festivals, public rallies |
| **184** | Landmarks | Lokasi & Bangunan Berita| Government buildings, embassies, historic sites |
| **180** | People | Manusia & Berita | Citizen journalism, portraits of real event attendees |
| **181** | Politics | Politik & Pemerintahan | Presidents, ministers, elections, parliament sessions |
| **182** | Sports | Olahraga & Turnamen | FIFA, Olympics, stadium matches, championships |
| **183** | Weather & Environment | Cuaca & Bencana Alam | Floods, storms, climate strikes, extreme heatwaves |

---

### 6. Holidays (Main Category ID: `188`) — 15 Subcategories
| Subcategory ID | Subcategory Name | Indonesian Translation | Focus & Keywords |
| :---: | :--- | :--- | :--- |
| **204** | Chinese New Year | Tahun Baru Imlek | Red lanterns, dragons, angpao, spring festival |
| **190** | Christmas | Natal | Xmas tree, Santa, ornaments, snow, gift boxes |
| **207** | Cinco de Mayo | Cinco de Mayo | Mexican celebration, sombrero, fiesta decorations |
| **203** | Diwali | Diwali / Deepavali | Oil lamps, rangoli, fireworks, festival of lights |
| **193** | Easter | Paskah | Easter eggs, bunny, spring blossoms |
| **196** | Fathers Day | Hari Ayah | Father & child, dad gifts, family bonding |
| **192** | Halloween | Halloween | Pumpkins, ghosts, spooky costumes, haunted house |
| **208** | Hanukkah | Hanukkah | Menorah, dreidel, Jewish holiday celebration |
| **206** | Mardi Gras | Mardi Gras | Carnivals, masks, colorful beads, parade floats |
| **195** | Mothers Day | Hari Ibu | Flowers, maternal love, breakfast in bed, greeting cards |
| **189** | New Years | Tahun Baru | Champagne, countdown fireworks, confetti, celebration |
| **205** | Ramadan | Ramadan & Idul Fitri | Crescent moon, mosques, dates, lanterns, ketupat |
| **191** | Thanksgiving | Thanksgiving | Roast turkey, pumpkin pie, autumn harvest feast |
| **194** | Valentines Day | Hari Valentine | Red roses, chocolate boxes, romantic dinner, hearts |
| **202** | Other | Hari Libur Lainnya | St Patrick's Day, local traditional festivals |

---

### 7. IT & C (Main Category ID: `108`) — 5 Subcategories
| Subcategory ID | Subcategory Name | Indonesian Translation | Focus & Keywords |
| :---: | :--- | :--- | :--- |
| **210** | Artificial Intelligence | Kecerdasan Buatan (AI) | Neural networks, deep learning, humanoid robots, ML |
| **110** | Connectivity | Konektivitas Jaringan | 5G signals, optic fibers, satellite data streams |
| **113** | Equipment | Perangkat Keras Jaringan| Server racks, routers, switches, patch panels |
| **111** | Internet | Internet & Web | Cyber security, cloud computing, online platforms |
| **109** | Networking | Topologi Jaringan | LAN diagram, digital node mesh, data exchange |

---

### 8. Illustrations & Clipart (Main Category ID: `172`) — 5 Subcategories
| Subcategory ID | Subcategory Name | Indonesian Translation | Focus & Keywords |
| :---: | :--- | :--- | :--- |
| **166** | 3D & Computer generated | 3D & CGI Rendering | Cinema4D, Blender renders, 3D characters, CGI |
| **212** | Generative AI | Gambar AI Generatif | Midjourney / Stable Diffusion generated art |
| **167** | Hand drawn & Artistic | Gambar Tangan & Lukisan | Watercolor, sketches, oil paintings, doodle art |
| **163** | Illustrations | Ilustrasi Grafis | Digital graphic illustrations, flat design |
| **186** | Vector | Vektor Grafis | Scalable EPS/AI vector icons, badges, banners *(Photos only)* |

---

### 9. Industries (Main Category ID: `86`) — 21 Subcategories
| Subcategory ID | Subcategory Name | Indonesian Translation | Focus & Keywords |
| :---: | :--- | :--- | :--- |
| **101** | Agriculture | Pertanian & Agrikultur | Tractors, wheat fields, farm harvesting, crops |
| **89** | Architecture | Industri Arsitektur | Blueprints, architects drafting, engineering models |
| **87** | Banking | Perbankan & Finansial | ATM machines, vaults, bank clerks, teller counters |
| **93** | Cargo & Shipping | Kargo & Ekspedisi | Container ships, freight ports, logistics warehouses |
| **94** | Communications | Industri Telekomunikasi| Telecom towers, broadcast vans, satellite antennas |
| **91** | Computers | Industri Komputer | Semiconductor fabrication, computer assembly |
| **90** | Construction | Konstruksi Bangunan | Cranes, hardhat workers, scaffolding, concrete |
| **150** | Education | Industri Pendidikan | Universities, tutoring, e-learning courses, degrees |
| **136** | Entertainment | Industri Hiburan | Film production, stages, music studios, cinemas |
| **99** | Environment | Industri Lingkungan | Recycling plants, green energy, solar panels, wind turbines |
| **127** | Food & Beverages | Industri Makanan/Minuman| Food processing, bottling factories, bakeries |
| **92** | Healthcare & Medical | Industri Medis | Hospital clinics, surgery rooms, medical research |
| **96** | Insurance | Industri Asuransi | Claim forms, policy protection, insurance agents |
| **95** | Legal | Industri Hukum | Law books, gavel, judge courtroom, lawyer consultation |
| **100** | Manufacturing | Manufaktur Pabrik | Assembly lines, robotic arms, production floors |
| **102** | Military | Militer & Pertahanan | Soldiers, navy vessels, fighter jets, tanks |
| **161** | Oil and gas | Minyak & Gas Bumi | Offshore oil rigs, pumpjacks, pipelines, refineries |
| **97** | Power and energy | Pembangkit Listrik | Power plants, electrical grid pylons, transformers |
| **157** | Sports | Industri Olahraga | Sports merchandise, gym equipment manufacturing |
| **98** | Transportation | Industri Transportasi | Railway networks, cargo airlines, trucking fleets |
| **88** | Travel | Industri Pariwisata | Travel agencies, flight bookings, tour operators |

---

### 10. Nature (Main Category ID: `8`) — 20 Subcategories
| Subcategory ID | Subcategory Name | Indonesian Translation | Focus & Keywords |
| :---: | :--- | :--- | :--- |
| **22** | Clouds and skies | Awan & Langit | Blue skies, cumulus clouds, storm clouds, rainbow |
| **17** | Deserts | Gurun Pasir | Sand dunes, Sahara, arid landscapes, desert rocks |
| **14** | Details | Detail Alam | Dewdrops on leaf, tree bark, flower petals macro |
| **27** | Fields & Meadows | Padang Rumput & Ladang | Green plains, wildflower meadows, countryside |
| **25** | Flowers & Gardens | Bunga & Taman | Roses, sunflowers, botanical gardens, blooming |
| **28** | Food ingredients | Bahan Makanan Alami | Fresh raw vegetables, organic herbs, spices |
| **18** | Forests | Hutan & Pepohonan | Pine forests, tropical rainforest, misty woods |
| **137** | Fruits & Vegetables | Buah & Sayuran | Apples, citrus, berries, fresh organic harvest |
| **11** | Generic vegetation | Tumbuhan Umum | Shrubs, green foliage, grass bushes |
| **143** | Geologic and mineral | Geologi & Mineral | Rock strata, crystals, geodes, volcanic stones |
| **16** | Lakes and rivers | Danau & Sungai | Clear streams, riverbanks, peaceful alpine lakes |
| **146** | Landscapes | Lanskap Alam | Wide scenic horizons, panoramic nature vistas |
| **15** | Mountains | Pegunungan | Snow peaks, mountain ranges, alpine cliffs |
| **12** | Plants and trees | Tanaman & Pohon | Bonsai, palm trees, giant oaks, lush botanicals |
| **19** | Sea & Ocean | Laut & Samudra | Waves crashing, turquoise shores, deep sea horizon |
| **26** | Seasons specific | Musim Spesifik | Spring blooms, summer sun, autumn red, winter ice |
| **23** | Sunsets & Sunrises | Matahari Terbit/Tenggelam| Golden hour, twilight, dramatic dawn, evening sky |
| **20** | Tropical | Alam Tropis | Palm leaves, tropical islands, paradise beaches |
| **171** | Water | Air & Percikan | Water splashes, ripples, pure liquid drops |
| **24** | Waterfalls | Air Terjun | Cascades, jungle waterfalls, flowing torrents |

---

### 11. Objects (Main Category ID: `133`) — 11 Subcategories
| Subcategory ID | Subcategory Name | Indonesian Translation | Focus & Keywords |
| :---: | :--- | :--- | :--- |
| **142** | Clothing & Accessories | Pakaian & Aksesori | Shoes, bags, hats, watches, sunglasses, jewelry |
| **147** | Electronics | Perangkat Elektronik | Headphones, cameras, gaming controllers, TVs |
| **138** | Home related | Perlengkapan Rumah | Kitchenware, furniture, lamps, cushions, vases |
| **135** | Isolated | Objek Terisolasi | Items on pure white background, cutout objects |
| **151** | Music and sound | Alat Musik & Audio | Guitars, pianos, microphones, vinyl records, speakers |
| **152** | Retro | Barang Antik / Retro | Vintage cameras, classic typewriter, rotary phone |
| **156** | Sports | Peralatan Olahraga | Football, tennis racket, dumbbells, yoga mat |
| **144** | Still life | Still Life Objek | Arranged fruit bowls, desktop decorations |
| **140** | Tools | Perkakas & Alat Kerja | Hammers, wrenches, screwdrivers, drills, toolbox |
| **134** | Toys | Mainan & Boneka | Teddy bears, wooden blocks, puzzle pieces, games |
| **145** | Other | Objek Lainnya | Miscellaneous standalone items |

---

### 12. People (Main Category ID: `114`) — 15 Subcategories
| Subcategory ID | Subcategory Name | Indonesian Translation | Focus & Keywords |
| :---: | :--- | :--- | :--- |
| **123** | Active | Orang Beraktivitas | Jogging, dancing, workout, outdoor cycling |
| **139** | Body parts | Bagian Tubuh | Hands holding objects, feet, eyes, lips macro |
| **119** | Children | Anak-anak | Toddlers, school kids playing, smiling children |
| **175** | Cosmetic & Makeup | Riasan & Kosmetik | Face skincare, lipstick application, beauty spa |
| **115** | Couples | Pasangan | Romantic partners, husband and wife, embracing |
| **122** | Diversity | Keberagaman Etnis | Multi-ethnic groups, diverse cultures, inclusion |
| **159** | Expressions | Ekspresi Wajah | Laughing, surprised, thinking, cheering emotions |
| **118** | Families | Keluarga | Parents with kids, grandparents, family dinner |
| **117** | Men | Pria Dewasa | Male portraits, gentlemen lifestyle, fatherhood |
| **173** | Nudes | Seni Tubuh / Nude | Artistic silhouettes, body contour photography |
| **162** | Portraits | Foto Potret | Studio headshots, professional profile portraits |
| **121** | Seniors | Lansia / Orang Tua | Elderly couples, retired lifestyle, grandfather |
| **120** | Teens | Remaja | High school students, young generation, hanging out |
| **116** | Women | Wanita Dewasa | Female portraits, women empowerment, modern ladies |
| **160** | Workers | Pekerja & Profesi | Chefs, doctors, construction workers, engineers |

---

### 13. Technology (Main Category ID: `103`) — 7 Subcategories
| Subcategory ID | Subcategory Name | Indonesian Translation | Focus & Keywords |
| :---: | :--- | :--- | :--- |
| **105** | Computers | Komputer & Hardware | Motherboards, CPUs, PC towers, graphic cards |
| **106** | Connections | Koneksi Digital | Fiber optic cables, ethernet plugs, USB connections |
| **129** | Electronics | Sirkuit Elektronik | Microchips, circuit boards, soldering, semiconductors |
| **107** | Retro | Teknologi Retro | CRT monitors, floppy disks, cassette tapes |
| **209** | Science | Sains & Riset | Microscopes, test tubes, chemical formulas, astronomy |
| **104** | Telecommunications | Telekomunikasi | Antenna towers, radar systems, radio transmission |
| **148** | Other | Teknologi Lainnya | Emerging tech, smart home devices |

---

### 14. Travel (Main Category ID: `55`) — 14 Subcategories
| Subcategory ID | Subcategory Name | Indonesian Translation | Focus & Keywords |
| :---: | :--- | :--- | :--- |
| **56** | Africa | Destinasi Afrika | Pyramids, Serengeti, Safari lodges, Cape Town |
| **58** | America | Destinasi Amerika | Grand Canyon, New York, Rio de Janeiro, Route 66 |
| **176** | Antarctica | Destinasi Antartika | Icebergs, glaciers, penguin colonies, polar expedition |
| **65** | Arts & Architecture | Seni Wisata | Museums, historic street art, famous galleries |
| **57** | Asia | Destinasi Asia | Mount Fuji, Bali temples, Bangkok streets, Great Wall |
| **60** | Australasian | Destinasi Australasia | Sydney Opera House, Outback, New Zealand fjords |
| **62** | Cruise | Wisata Kapal Pesiar | Luxury ocean liners, deck pools, island docking |
| **63** | Cuisine | Kuliner Wisata | Street food markets, authentic local gastronomy |
| **67** | Currencies | Mata Uang Asing | Travel cash, banknotes, foreign exchange |
| **61** | Destination scenics | Pemandangan Wisata | Postcard viewpoints, famous travel vistas |
| **59** | Europe | Destinasi Eropa | Paris alleys, Venice canals, Swiss Alps, Colosseum |
| **68** | Flags | Bendera Negara | World national flags, tourism souvenir flags |
| **64** | Resorts | Resor & Hotel Liburan | Overwater bungalows, infinity pools, luxury suites |
| **66** | Tropical | Wisata Pulau Tropis | White sand beaches, coconut trees, lagoon swimming |

---

### 15. Web Design Graphics (Main Category ID: `197`) — 4 Subcategories
| Subcategory ID | Subcategory Name | Indonesian Translation | Focus & Keywords |
| :---: | :--- | :--- | :--- |
| **201** | Banners | Web Banner & Header | Promo headers, hero banners, website sale badges |
| **200** | Buttons | Tombol UI/UX | Call-to-Action buttons, Download / Buy Now icons |
| **199** | Web Backgrounds & Textures | Background Web | Website seamless patterns, UI gradient fills |
| **198** | Web Icons | Ikon Web | Flat icons, glyphs, navigation symbols, social icons |

---

## 7. Keywords & Delimiter Rules

1. **Tag Count**: Minimum **5 keywords**, Maximum **80 keywords**.
2. **Tag Format**: Input separated by commas (`,`).
3. **Wiping Existing Tags**:
   - Dreamstime provides a dedicated clean button `a.js-editcleankeywords` (with `i.icn--close` icon) inside the keywords row that immediately clears all tag inputs.
4. **Keyword Tag Field**:
   - `input#keywords_tag` (for interactive typing).
   - In automated injection, setting the backing input value or typing comma-separated words followed by `Enter` registers tags cleanly.

---

## 8. Commercial (RF) vs Editorial (ED) Licensing Workflow

1. **Toggle Switch**:
   - Commercial: Click `a:has-text("Commercial (RF)")`
   - Editorial: Click `a:has-text("Editorial (ED)")`
2. **Editorial Caption Rule**:
   - For Editorial assets, the Description field must provide factual context (who, what, where, when).
   - Dreamstime allows general journalistic formatting:  
     `CITY, COUNTRY - MONTH DAY YEAR: Detailed description of the event, person, or landmark.`

---

## 9. JavaScript Automation & Dynamic Dependent Select Handler

Dreamstime's category dropdowns use jQuery event listeners. When setting `select#M_Category_1`, you **MUST dispatch a `change` event** to trigger the script that populates `select#M_Subcategory_1`:

```javascript
/**
 * Sets a dropdown value and triggers jQuery / native change event
 * @param {HTMLSelectElement} selectEl 
 * @param {string|number} value 
 */
export async function setSelectValueAndTrigger(selectEl, value) {
  if (!selectEl) return;
  selectEl.value = String(value);
  selectEl.dispatchEvent(new Event("change", { bubbles: true }));
  // Wait a small delay for AJAX / internal script to populate subcategories
  await new Promise((resolve) => setTimeout(resolve, 200));
}
```

---

## 10. Complete Dreamstime Adapter Implementation (`DreamstimeAdapter.js`)

```javascript
export class DreamstimeAdapter {
  static isMatch(url) {
    return url.includes("dreamstime.com");
  }

  /**
   * Retrieves all asset items from the batch grid
   */
  static getAssetItems() {
    return Array.from(document.querySelectorAll("div.upload-item[id]"));
  }

  /**
   * Gets current active asset ID from modal header / breadcrumbs
   */
  static getCurrentAssetId() {
    const header = document.querySelector(".popup-nav__breadcrumbs, .popup-nav");
    if (!header) return null;
    const match = header.textContent.match(/(\d{7,12})/);
    return match ? match[1] : null;
  }

  /**
   * Gets thumbnail image URL from an item card
   */
  static getThumbnailUrl(itemElement) {
    const img = itemElement.querySelector("div.upload-item__thumb img, a.js-upload-edit img");
    return img ? img.src : null;
  }

  /**
   * Opens the edit modal for a given asset item
   */
  static openEditModal(itemElement) {
    const link = itemElement.querySelector("a.upload-item__link.js-upload-edit, div.upload-item__thumb a");
    if (link) link.click();
  }

  /**
   * Clears all pre-existing metadata fields before filling
   */
  static async clearExistingMetadata() {
    const clearTitle = document.querySelector("#js-remove-title");
    if (clearTitle) clearTitle.click();

    const clearDesc = document.querySelector(".js-editcleandescription");
    if (clearDesc) clearDesc.click();

    const clearCat1 = document.querySelector("#js-remove-cat1");
    if (clearCat1) clearCat1.click();
    const clearCat2 = document.querySelector("#js-remove-cat2");
    if (clearCat2) clearCat2.click();
    const clearCat3 = document.querySelector("#js-remove-cat3");
    if (clearCat3) clearCat3.click();

    const clearKeywords = document.querySelector(".js-editcleankeywords");
    if (clearKeywords) clearKeywords.click();

    await new Promise(r => setTimeout(r, 80));
  }

  /**
   * Sets Category and Dependent Subcategory
   */
  static async setCategoryPair(index, mainCatId, subCatId) {
    const mainSelect = document.querySelector(`#M_Category_${index}`);
    const subSelect = document.querySelector(`#M_Subcategory_${index}`);
    
    if (mainSelect && mainCatId) {
      mainSelect.value = String(mainCatId);
      mainSelect.dispatchEvent(new Event("change", { bubbles: true }));
      // Allow DOM to populate dependent subcategories
      await new Promise(r => setTimeout(r, 250));
    }
    
    if (subSelect && subCatId) {
      subSelect.value = String(subCatId);
      subSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  /**
   * Fills all metadata fields in the active Dreamstime edit modal
   */
  static async fillMetadata({
    title,
    description,
    categories = [], // Array of pairs: [{ main: 38, sub: 112 }, { main: 8, sub: 22 }]
    keywords = [],
    isEditorial = false,
    clearExisting = true
  }) {
    if (clearExisting) {
      await this.clearExistingMetadata();
    }

    // 1. Fill Title
    const titleInput = document.querySelector("#title, input[name='M_title']");
    if (titleInput && title) {
      titleInput.value = title.slice(0, 100);
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // 2. Fill Description
    const descInput = document.querySelector("#description, textarea[name='M_description']");
    if (descInput && description) {
      descInput.value = description;
      descInput.dispatchEvent(new Event("input", { bubbles: true }));
      descInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // 3. Fill Categories (Up to 3 pairs)
    for (let i = 0; i < Math.min(categories.length, 3); i++) {
      const { main, sub } = categories[i];
      await this.setCategoryPair(i + 1, main, sub);
    }

    // 4. Fill Keywords
    if (keywords && keywords.length > 0) {
      const kwInput = document.querySelector("#keywords_tag");
      if (kwInput) {
        const kwString = Array.isArray(keywords) 
          ? keywords.slice(0, 80).join(", ") 
          : keywords;
        kwInput.focus();
        kwInput.value = kwString + ",";
        kwInput.dispatchEvent(new Event("input", { bubbles: true }));
        kwInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true }));
      }
    }

    // 5. Set Commercial / Editorial License
    if (isEditorial) {
      const edBtn = document.querySelector('a:has-text("Editorial (ED)"), div.popup__form-element--buttons a:last-child');
      if (edBtn) edBtn.click();
    } else {
      const comBtn = document.querySelector('a:has-text("Commercial (RF)"), div.popup__form-element--buttons a:first-child');
      if (comBtn) comBtn.click();
    }
  }

  /**
   * Saves current edits as draft and waits for toast confirmation
   */
  static async saveDraft() {
    const saveBtn = document.querySelector("#js-savededits");
    if (!saveBtn) return false;
    saveBtn.click();

    // Wait for success toast / notification
    const start = Date.now();
    while (Date.now() - start < 4000) {
      const toast = document.querySelector(".noty_bar.noty_type__dt-success, #js-submit-message");
      if (toast && !toast.getAttribute("style")?.includes("display: none")) {
        return true;
      }
      await new Promise(r => setTimeout(r, 150));
    }
    return true;
  }

  /**
   * Submits the file for curator review (Auto moves to next item)
   */
  static submitForReview() {
    const submitBtn = document.querySelector("#js-next-submit");
    if (submitBtn) {
      submitBtn.click();
      return true;
    }
    return false;
  }

  /**
   * Navigates to next asset in draft mode
   */
  static goToNextItem() {
    const nextArrow = document.querySelector("a#js-next-submit.popup-nav__btn--next, a.popup-nav__btn--next");
    if (nextArrow) {
      nextArrow.click();
      return true;
    }
    return false;
  }
}
```

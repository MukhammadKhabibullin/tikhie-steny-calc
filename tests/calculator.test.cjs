const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseNumericInput, MAX_INPUT_VALUE } = require('../src/utils/numericInput.ts');
const calc = require('../src/utils/calculator.ts');
const { syncGeometryMaterials, syncGeometryProfiles, syncOpeningWorks, AUTO_PROFILE_CATALOG_IDS } = require('../src/utils/geometrySync.ts');
const { DEFAULT_MATERIALS } = require('../src/data/prices.ts');

function room(count = 1, contour = 'open', openings = []) {
  return { id: 'room', name: 'Room', ceilingHeight: 2700, contour,
    walls: Array.from({ length: count }, (_, i) => ({ id: `wall-${i}`, name: `Wall ${i}`, length: 3000 })), openings };
}
const windowOpening = { id: 'window', type: 'window', width: 1400, height: 1500, wallId: 'wall-0' };
const doorOpening = { id: 'door', type: 'door', width: 800, height: 2100, wallId: 'wall-1' };
const material = (category, quantity = 0) => ({ id: category, category, name: category, quantity, unit: 'm2', costPrice: 100, clientPrice: 200 });

for (const [input, text, value] of [
  ['', '', 0], ['0', '0', 0], ['00', '0', 0], ['00025', '25', 25],
  ['01500', '1500', 1500], ['0.5', '0.5', 0.5], ['000.50', '0.50', 0.5],
  ['0,5', '0.5', 0.5], [' 1 500,25 ', '1500.25', 1500.25],
  ['-25', '0', 0], ['.5', '0.5', 0.5], ['0.', '0.', 0],
]) test(`numeric input ${JSON.stringify(input)}`, () => assert.deepEqual(parseNumericInput(input), { text, value }));

test('invalid, non-finite and excessive pasted numbers are rejected', () => {
  for (const input of ['1e309', 'NaN', 'Infinity', 'abc', '1.2.3', '-']) assert.equal(parseNumericInput(input), null);
  assert.equal(parseNumericInput(String(MAX_INPUT_VALUE + 1)), null);
  assert.equal(parseNumericInput('1001', 1000), null);
  assert.equal(parseNumericInput('1000', 1000).value, 1000);
});

test('fabric uses the full wall with reserve; openings remain informational', () => {
  const before = calc.calculateRoomMetrics(room());
  const after = calc.calculateRoomMetrics(room(1, 'open', [windowOpening, doorOpening]));
  assert.equal(after.grossWallArea, 8.1);
  assert.equal(after.openingsArea, 3.78);
  assert.equal(after.netWallArea, 4.32);
  assert.equal(after.fabricArea, 8.51);
  assert.equal(after.fabricArea, before.fabricArea);
  assert.equal(calc.calculateTotalFabricArea([room(1, 'open', [windowOpening])]), 8.1);
  assert.equal(calc.calculateNetFabricArea(room(1, 'open', [windowOpening])), 8.1);
});

for (const [count, contour, base, corner] of [
  [0, 'open', 0, 0], [1, 'open', 3.24, 0], [1, 'closed', 3.24, 0],
  [2, 'open', 5.83, 2.92], [2, 'closed', 5.83, 2.92],
  [3, 'open', 5.83, 5.83], [3, 'closed', 0, 8.75],
  [4, 'open', 5.83, 8.75], [4, 'closed', 0, 11.66],
]) test(`${count} walls, ${contour}: profile quantities`, () => {
  assert.deepEqual(calc.calculateRoomProfiles(room(count, contour)), {
    'base-profile': base, 'corner-profile': corner, 'opening-profile': 0,
  });
});

test('legacy rooms default to open; zero-length walls break connections', () => {
  const legacy = room(4); delete legacy.contour;
  assert.equal(calc.calculateRoomProfiles(legacy)['base-profile'], 5.83);
  legacy.walls[1].length = 0;
  assert.deepEqual(calc.calculateRoomProfiles(legacy), { 'base-profile': 9.07, 'corner-profile': 2.92, 'opening-profile': 0 });
});

for (const openings of [[windowOpening], [doorOpening], [windowOpening, { ...windowOpening, id: 'second' }],
  [windowOpening, { ...doorOpening, wallId: 'wall-0' }], [windowOpening, doorOpening]]) {
  test(`opening perimeter: ${openings.map(o => `${o.type}@${o.wallId}`).join(', ')}`, () => {
    const expected = calc.roundTo(openings.reduce((sum, o) => sum + 2 * (o.width + o.height) / 1000, 0) * 1.08);
    assert.equal(calc.calculateRoomProfiles(room(2, 'open', openings))['opening-profile'], expected);
  });
}

test('automatic lines are idempotent, preserve manual rows, and disappear with geometry', () => {
  const manual = { ...material('profile', 19), unit: 'm', name: DEFAULT_MATERIALS.find(i => i.id === AUTO_PROFILE_CATALOG_IDS['opening-profile']).name };
  const rooms = [room(2, 'open', [windowOpening, doorOpening])];
  const first = syncGeometryMaterials([manual, material('fabric'), material('insulation')], rooms, DEFAULT_MATERIALS);
  const second = syncGeometryMaterials(first, rooms, DEFAULT_MATERIALS);
  assert.deepEqual(first, second);
  assert.equal(second.filter(i => i.autoSource).length, 3);
  assert.deepEqual(second.find(i => i.id === manual.id), manual);
  assert.equal(second.find(i => i.category === 'fabric').quantity, 17.01);
  assert.equal(second.find(i => i.category === 'insulation').quantity, 13.04);
  const withoutOpenings = syncGeometryMaterials(second, [room(2)], DEFAULT_MATERIALS);
  assert.equal(withoutOpenings.some(i => i.autoSource === 'opening-profile'), false);
  const empty = syncGeometryMaterials(withoutOpenings, [], DEFAULT_MATERIALS);
  assert.equal(empty.some(i => i.autoSource), false);
  assert.equal(empty.find(i => i.category === 'fabric').quantity, 0);
  assert.deepEqual(empty.find(i => i.id === manual.id), manual);
});

test('adding/removing walls and closing/opening the contour updates only managed profiles', () => {
  let items = syncGeometryProfiles([], [room()], DEFAULT_MATERIALS);
  const baseId = items[0].id;
  items = syncGeometryProfiles(items, [room(4)], DEFAULT_MATERIALS);
  assert.equal(items.find(i => i.autoSource === 'base-profile').id, baseId);
  items = syncGeometryProfiles(items, [room(4, 'closed')], DEFAULT_MATERIALS);
  assert.equal(items.some(i => i.autoSource === 'base-profile'), false);
  items = syncGeometryProfiles(items, [room(3)], DEFAULT_MATERIALS);
  assert.equal(items.find(i => i.autoSource === 'base-profile').quantity, 5.83);
  assert.equal(items.find(i => i.autoSource === 'corner-profile').quantity, 5.83);
});

test('duplicate managed roles collapse but manual catalog copies survive', () => {
  const items = syncGeometryProfiles([], [room()], DEFAULT_MATERIALS);
  const duplicate = { ...items[0], id: 'duplicate' };
  const manual = { ...items[0], id: 'manual', autoSource: undefined, quantity: 9 };
  const result = syncGeometryProfiles([...items, duplicate, manual], [room()], DEFAULT_MATERIALS);
  assert.equal(result.length, 2);
  assert.deepEqual(result.find(i => i.id === 'manual'), manual);
});

test('catalog matches stable ID, then exact normalized name, then a safe local fallback', () => {
  const base = DEFAULT_MATERIALS.find(i => i.id === AUTO_PROFILE_CATALOG_IDS['base-profile']);
  const byName = { ...base, id: 'custom-id', name: `  ${base.name.toUpperCase()} `, costPrice: 123 };
  const result = syncGeometryProfiles([], [room()], [byName])[0];
  assert.equal(result.catalogId, 'custom-id');
  assert.equal(result.costPrice, 123);
  const fallback = syncGeometryProfiles([], [room()], [])[0];
  assert.equal(fallback.catalogId, undefined);
  assert.equal(fallback.costPrice, base.costPrice);
});

test('automatic profile mode m → pieces → m restores exact geometry and preserves prices', () => {
  const base = syncGeometryProfiles([], [room()], DEFAULT_MATERIALS)[0];
  const pieces = syncGeometryProfiles([{ ...base, unit: 'pcs', costPrice: base.costPrice * 2, clientPrice: base.clientPrice * 2 }], [room()], DEFAULT_MATERIALS)[0];
  assert.equal(pieces.quantity, 2);
  const meters = syncGeometryProfiles([{ ...pieces, unit: 'm', costPrice: pieces.costPrice / 2, clientPrice: pieces.clientPrice / 2 }], [room()], DEFAULT_MATERIALS)[0];
  assert.equal(meters.quantity, 3.24);
  assert.equal(meters.clientPrice, base.clientPrice);
  const entry = DEFAULT_MATERIALS.find(i => i.id === base.catalogId);
  assert.equal(calc.catalogPricesForMaterial(pieces, entry).clientPrice, entry.clientPrice * 2);
});

test('opening installation is charged once, included in total and margin, persisted as a work line', () => {
  const rooms = [room(2, 'open', [windowOpening, doorOpening])];
  const manualWork = { id: 'manual-work', category: 'additional', name: 'Other work', unit: 'pcs', quantity: 2, clientPrice: 100, costPrice: 40 };
  const works = syncOpeningWorks([manualWork], rooms);
  assert.deepEqual(syncOpeningWorks(works, rooms), works);
  assert.equal(works[1].quantity, 2);
  assert.equal(works[1].clientPrice, 6000);
  const totals = calc.calculateProjectTotals(rooms, [], 1400, 800, undefined, undefined, undefined, undefined, undefined, works);
  assert.equal(totals.openingInstallationCost, 12000);
  assert.equal(totals.installationCost, 17.01 * 1400 + 12000 + 200);
  assert.equal(totals.installationCostPrice, 13688);
  assert.equal(totals.totalClientPrice, totals.installationCost);
  assert.equal(totals.margin, calc.roundTo(totals.totalClientPrice - totals.installationCostPrice));
  assert.deepEqual(syncOpeningWorks(works, [room()]), [manualWork]);
  assert.equal(calc.calculateProjectTotals([room()], []).openingInstallationCost, 0);
});

test('millimeter precision is retained until wall area is calculated', () => {
  const geometry = room();
  geometry.walls[0].length = 1501;
  assert.equal(calc.calculateGrossWallArea(geometry), 4.05);
  geometry.ceilingHeight = 10000;
  assert.equal(calc.calculateGrossWallArea(geometry), 15.01);
  assert.equal(calc.calculateRoomMetrics(geometry).grossWallArea, 15.01);
});

test('multiple rooms aggregate profiles and installation without duplicate managed rows', () => {
  const rooms = [room(1, 'open', [windowOpening]), { ...room(4, 'closed', [doorOpening]), id: 'second' }];
  const items = syncGeometryMaterials([], rooms, DEFAULT_MATERIALS);
  assert.equal(items.filter(i => i.autoSource === 'opening-profile').length, 1);
  assert.equal(items.find(i => i.autoSource === 'opening-profile').quantity, 12.52);
  assert.equal(items.find(i => i.autoSource === 'base-profile').quantity, 3.24);
  assert.equal(items.find(i => i.autoSource === 'corner-profile').quantity, 11.66);
  assert.equal(calc.calculateProjectTotals(rooms, items).openingInstallationCost, 12000);
});

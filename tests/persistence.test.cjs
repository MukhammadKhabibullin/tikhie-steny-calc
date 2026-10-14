const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const { syncGeometryMaterials, syncOpeningWorks } = require('../src/utils/geometrySync.ts');

// Exercise the real persistence functions using a deterministic, isolated query adapter.
// No credentials or network calls are used in these tests.
function serviceFixture({ missingSchema = false, failReadTable } = {}) {
  const tables = { projects: [], rooms: [], walls: [], openings: [], project_materials: [], project_works: [] };
  const writes = [];
  const client = {
    from(table) {
      let action = 'select'; let payload; let limit; const filters = [];
      const query = {
        select() { return query; },
        upsert(data) { action = 'upsert'; payload = data; return query; },
        insert(data) { action = 'insert'; payload = data; return query; },
        delete() { action = 'delete'; return query; },
        eq(key, value) { filters.push(row => row[key] === value); return query; },
        in(key, values) { filters.push(row => values.includes(row[key])); return query; },
        limit(value) { limit = value; return query; },
        then(resolve, reject) {
          const matches = row => filters.every(filter => filter(row));
          if ((missingSchema && limit === 0) || (failReadTable === table && action === 'select')) {
            return Promise.resolve({ data: null, error: { message: 'Missing schema / read failed' } }).then(resolve, reject);
          }
          if (action !== 'select') writes.push({ table, action, payload });
          if (action === 'insert') tables[table].push(...structuredClone(payload));
          if (action === 'upsert') {
            tables[table] = tables[table].filter(row => row.id !== payload.id);
            tables[table].push(structuredClone(payload));
          }
          if (action === 'delete') tables[table] = tables[table].filter(row => !matches(row));
          const data = tables[table].filter(matches);
          return Promise.resolve({ data: structuredClone(limit === 0 ? [] : data), error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const filename = path.resolve(__dirname, '../src/services/supabaseClient.ts');
  const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env', '({})');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const realRequire = createRequire(filename);
  const exports = {};
  vm.runInNewContext(js, {
    exports, require: name => name === '@supabase/supabase-js' ? { createClient: () => client } : realRequire(name),
    crypto, fetch, URL, console, setTimeout, clearTimeout,
  }, { filename });
  return { service: exports, tables, writes };
}

const project = { id: crypto.randomUUID(), title: 'Test', clientName: '', phone: '', address: '', dealId: '', createdAt: '' };
const makeRoom = () => ({ id: 'legacy-room', name: 'Room', ceilingHeight: 0, contour: 'closed',
  walls: [0, 1, 2, 3].map(i => ({ id: `wall-${i}`, name: `Wall ${i}`, length: 3000 })),
  openings: [{ id: 'opening', type: 'window', width: 1400, height: 1500, wallId: 'wall-2' }],
});

test('save/load preserves topology, wall order, opening linkage, zero height, automatic and manual rows', async () => {
  const { service, tables } = serviceFixture();
  const rooms = [makeRoom()];
  const materials = syncGeometryMaterials([{ id: crypto.randomUUID(), name: 'Manual profile', category: 'profile', unit: 'm', costPrice: 1, clientPrice: 2, quantity: 7 }], rooms, []);
  const works = syncOpeningWorks([], rooms);
  const result = await service.saveProjectToSupabase(project, rooms, materials, works);
  assert.equal(result.success, true);
  assert.equal(tables.rooms[0].contour, 'closed');
  assert.equal(tables.openings[0].wall_id, tables.walls[2].id);
  tables.walls.reverse();
  const loaded = await service.fetchProjectRoomsWithWalls(project.id);
  assert.deepEqual(Array.from(loaded.rooms[0].walls, w => w.name), ['Wall 0', 'Wall 1', 'Wall 2', 'Wall 3']);
  assert.equal(loaded.rooms[0].ceilingHeight, 0);
  assert.equal(loaded.rooms[0].contour, 'closed');
  assert.equal(loaded.materials.find(m => m.name === 'Manual profile').autoSource, undefined);
  assert.equal(loaded.materials.find(m => m.autoSource === 'opening-profile').quantity, 6.26);
  assert.equal(loaded.works[0].autoSource, 'opening-installation');
  assert.equal(loaded.works[0].clientPrice, 6000);
});

test('missing migration stops saving before any write', async () => {
  const { service, writes } = serviceFixture({ missingSchema: true });
  const result = await service.saveProjectToSupabase(project, [makeRoom()], [], []);
  assert.equal(result.success, false);
  assert.match(result.error, /20261014_geometry_automation.sql/);
  assert.equal(writes.length, 0);
});

test('legacy data without metadata loads as an open contour with manual items', async () => {
  const { service, tables } = serviceFixture();
  tables.rooms.push({ id: 'old-room', project_id: project.id, name: 'Old', ceiling_height: 2700 });
  tables.project_materials.push({ id: 'manual', project_id: project.id, category: 'profile', name: 'Base', quantity: 10 });
  const loaded = await service.fetchProjectRoomsWithWalls(project.id);
  assert.equal(loaded.rooms[0].contour, 'open');
  assert.equal(loaded.materials[0].autoSource, undefined);
  assert.equal(loaded.materials[0].quantity, 10);
});

for (const failReadTable of ['walls', 'openings', 'project_materials', 'project_works']) {
  test(`partial read failure in ${failReadTable} cannot masquerade as an empty project`, async () => {
    const { service, tables } = serviceFixture({ failReadTable });
    tables.rooms.push({ id: 'room', project_id: project.id, name: 'Room', ceiling_height: 2700 });
    await assert.rejects(service.fetchProjectRoomsWithWalls(project.id), /read failed/);
  });
}

test('an empty project is loaded without borrowing geometry from another project', async () => {
  const { service } = serviceFixture();
  const loaded = await service.fetchProjectRoomsWithWalls(project.id);
  assert.equal(loaded.rooms.length, 0);
  assert.equal(loaded.materials.length, 0);
  assert.equal(loaded.works.length, 0);
});

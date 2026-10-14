import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RoomBuilder } from '../../src/components/RoomBuilder';
import { MaterialsSection } from '../../src/components/MaterialsSection';
import { SummarySection } from '../../src/components/SummarySection';
import { DEFAULT_MATERIALS } from '../../src/data/prices';
import { calculateProjectTotals } from '../../src/utils/calculator';
import { syncGeometryMaterials, syncGeometryProfiles } from '../../src/utils/geometrySync';
import type { MaterialItem, Room } from '../../src/types';
import '../../src/index.css';

// Local-only component harness. No Supabase client, credentials, or writes.
export function GeometryHarness() {
  const [rooms, setRooms] = useState<Room[]>([{ id: 'room', name: 'Проверка', ceilingHeight: 2700, walls: [{ id: 'wall', name: 'Стена 1', length: 0 }], openings: [] }]);
  const [materials, setMaterials] = useState<MaterialItem[]>([{ ...DEFAULT_MATERIALS[0], catalogId: DEFAULT_MATERIALS[0].id, quantity: 0 }]);
  const update = (next: Room[]) => {
    setRooms(next);
    setMaterials(previous => syncGeometryMaterials(previous, next, DEFAULT_MATERIALS));
  };
  const totals = calculateProjectTotals(rooms, materials);
  return <main className="max-w-7xl mx-auto p-4 space-y-5">
    <h1>Локальная проверка компонентов — данные не сохраняются</h1>
    <RoomBuilder rooms={rooms} onUpdateRooms={update} />
    <MaterialsSection materials={materials} onUpdateMaterials={next => setMaterials(syncGeometryProfiles(next, rooms, DEFAULT_MATERIALS))}
      calculatedFabricArea={totals.totalFabricArea} calculatedProfileLength={totals.totalProfileLength}
      calculatedPlinthLength={totals.totalPlinthLength} catalog={DEFAULT_MATERIALS} onSyncGeometry={() => update(rooms)} />
    <SummarySection results={totals} />
  </main>;
}

const root = createRoot(document.getElementById('root')!);
root.render(<StrictMode><GeometryHarness /></StrictMode>);

if (import.meta.hot) {
  import.meta.hot.dispose(() => root.unmount());
}

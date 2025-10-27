import { db } from './schema';

export async function seedDatabase() {
  // Check if already seeded
  const tripCount = await db.trips.count();
  if (tripCount > 0) return;

  console.log('Seeding database with sample data...');

  // Seed rig presets
  await db.rigPresets.bulkAdd([
    { slot: 'A', name: '표준형', sinkerDropLength: '15cm', branchLineLength: '10cm', notes: '기본 세팅' },
    { slot: 'B', name: '긴단차', sinkerDropLength: '20cm', branchLineLength: '15cm', notes: '조류 강할 때' },
    { slot: 'C', name: '직결형', sinkerDropLength: '10cm', branchLineLength: '직결', notes: '빠른 액션' },
  ]);

  // Seed egi presets
  await db.egiPresets.bulkAdd([
    { slot: 'A', name: '주간용', size: '3.0', color: '핑크', finish: '광택' },
    { slot: 'B', name: '야간용', size: '3.0', color: '네온', finish: '야광' },
    { slot: 'C', name: '탁한물', size: '2.5', color: '오렌지', finish: '광택' },
  ]);

  // Sample trip 1
  const trip1Id = await db.trips.add({
    dateStart: new Date('2025-10-20T05:00:00'),
    dateEnd: new Date('2025-10-20T11:00:00'),
    spotName: '인천 을왕리',
    lat: 37.4456,
    lng: 126.3816,
    tideStage: 8,
    tideHighTimes: ['10:23'],
    tideLowTimes: ['04:15', '16:45'],
    notes: '맑은 날씨, 조황 좋음',
  });

  await db.conditions.add({
    tripId: trip1Id,
    at: new Date('2025-10-20T06:00:00'),
    waterTemp: 18.5,
    windDir: '서',
    windSpeed: 3.2,
    waveHeight: 0.5,
    clouds: 20,
  });

  await db.catchEvents.bulkAdd([
    {
      tripId: trip1Id,
      at: new Date('2025-10-20T06:27:00'),
      rigSlot: 'A',
      egiSlot: 'A',
      sizeCm: 28,
      kept: true,
      lat: 37.4456,
      lng: 126.3816,
    },
    {
      tripId: trip1Id,
      at: new Date('2025-10-20T07:15:00'),
      rigSlot: 'A',
      egiSlot: 'B',
      sizeCm: 25,
      kept: true,
      lat: 37.4456,
      lng: 126.3816,
    },
    {
      tripId: trip1Id,
      at: new Date('2025-10-20T09:30:00'),
      rigSlot: 'B',
      egiSlot: 'A',
      sizeCm: 30,
      kept: true,
      lat: 37.4456,
      lng: 126.3816,
    },
  ]);

  // Sample trip 2
  const trip2Id = await db.trips.add({
    dateStart: new Date('2025-10-22T06:00:00'),
    dateEnd: new Date('2025-10-22T10:00:00'),
    spotName: '부산 송정',
    lat: 35.1785,
    lng: 129.1997,
    tideStage: 5,
    tideHighTimes: ['08:45'],
    tideLowTimes: ['02:30', '14:50'],
    notes: '흐림, 바람 약간',
  });

  await db.conditions.add({
    tripId: trip2Id,
    at: new Date('2025-10-22T06:30:00'),
    waterTemp: 19.2,
    windDir: '남',
    windSpeed: 5.5,
    waveHeight: 1.0,
    clouds: 70,
  });

  await db.catchEvents.bulkAdd([
    {
      tripId: trip2Id,
      at: new Date('2025-10-22T07:20:00'),
      rigSlot: 'A',
      egiSlot: 'C',
      sizeCm: 26,
      kept: true,
      lat: 35.1785,
      lng: 129.1997,
    },
    {
      tripId: trip2Id,
      at: new Date('2025-10-22T08:50:00'),
      rigSlot: 'B',
      egiSlot: 'C',
      sizeCm: 22,
      kept: false,
      lat: 35.1785,
      lng: 129.1997,
    },
  ]);

  console.log('Database seeded successfully!');
}

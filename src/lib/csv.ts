import Papa from 'papaparse';
import { db } from '@/db/schema';

const CSV_HEADERS = [
  '날짜',
  '시작시간',
  '종료시간',
  '위치명',
  '위도',
  '경도',
  '수역',
  '포인트유형',
  '기법',
  '대상어종',
  '물때',
  '만조시간',
  '간조시간',
  '조과수',
  '보관수',
  '방생수',
  '최솟길이(cm)',
  '평균길이(cm)',
  '최댓길이(cm)',
  '수온(°C)',
  '파고(m)',
  '풍향',
  '풍속(m/s)',
  '루어/에기',
  '라인호수',
  '메모',
];

export async function exportToCSV(): Promise<string> {
  const trips = await db.trips.toArray();
  const data: any[] = [];

  for (const trip of trips) {
    const catches = await db.catchEvents.where('tripId').equals(trip.id!).toArray();
    const condition = await db.conditions.where('tripId').equals(trip.id!).first();

    const kept = catches.filter(c => c.kept).length;
    const released = catches.filter(c => !c.kept).length;
    const sizes = catches.filter(c => c.sizeCm).map(c => c.sizeCm!);
    const minSize = sizes.length ? Math.min(...sizes) : '';
    const avgSize = sizes.length ? (sizes.reduce((a, b) => a + b, 0) / sizes.length).toFixed(1) : '';
    const maxSize = sizes.length ? Math.max(...sizes) : '';

    data.push({
      '날짜': trip.dateStart.toLocaleDateString('ko-KR'),
      '시작시간': trip.dateStart.toLocaleTimeString('ko-KR'),
      '종료시간': trip.dateEnd ? trip.dateEnd.toLocaleTimeString('ko-KR') : '',
      '위치명': trip.spotName || '',
      '위도': trip.lat || '',
      '경도': trip.lng || '',
      '수역': '',
      '포인트유형': '',
      '기법': '에깅',
      '대상어종': '갑오징어',
      '물때': trip.tideStage || '',
      '만조시간': trip.tideHighTimes?.join(', ') || '',
      '간조시간': trip.tideLowTimes?.join(', ') || '',
      '조과수': catches.length,
      '보관수': kept,
      '방생수': released,
      '최솟길이(cm)': minSize,
      '평균길이(cm)': avgSize,
      '최댓길이(cm)': maxSize,
      '수온(°C)': condition?.waterTemp || '',
      '파고(m)': condition?.waveHeight || '',
      '풍향': condition?.windDir || '',
      '풍속(m/s)': condition?.windSpeed || '',
      '루어/에기': '',
      '라인호수': '',
      '메모': trip.notes || '',
    });
  }

  const csv = Papa.unparse(data, {
    columns: CSV_HEADERS,
  });

  // Add UTF-8 BOM for Excel compatibility
  return '\ufeff' + csv;
}

export async function importFromCSV(csvText: string): Promise<{ success: number; failed: number; preview: any[] }> {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  let success = 0;
  let failed = 0;
  const preview = result.data.slice(0, 5);

  for (const row of result.data as any[]) {
    try {
      // Map CSV columns to database schema (best effort)
      const dateStr = row['날짜'];
      const timeStr = row['시작시간'];
      
      if (!dateStr) {
        failed++;
        continue;
      }

      const tripId = await db.trips.add({
        dateStart: new Date(`${dateStr} ${timeStr || '00:00'}`),
        dateEnd: row['종료시간'] ? new Date(`${dateStr} ${row['종료시간']}`) : undefined,
        spotName: row['위치명'] || undefined,
        lat: row['위도'] ? parseFloat(row['위도']) : undefined,
        lng: row['경도'] ? parseFloat(row['경도']) : undefined,
        tideStage: row['물때'] ? parseInt(row['물때']) : undefined,
        tideHighTimes: row['만조시간'] ? row['만조시간'].split(',').map((t: string) => t.trim()) : undefined,
        tideLowTimes: row['간조시간'] ? row['간조시간'].split(',').map((t: string) => t.trim()) : undefined,
        notes: row['메모'] || undefined,
      });

      // Add condition if available
      if (row['수온(°C)'] || row['풍향']) {
        await db.conditions.add({
          tripId,
          at: new Date(`${dateStr} ${timeStr || '00:00'}`),
          waterTemp: row['수온(°C)'] ? parseFloat(row['수온(°C)']) : undefined,
          windDir: row['풍향'] || undefined,
          windSpeed: row['풍속(m/s)'] ? parseFloat(row['풍속(m/s)']) : undefined,
          waveHeight: row['파고(m)'] ? parseFloat(row['파고(m)']) : undefined,
        });
      }

      success++;
    } catch (error) {
      console.error('Failed to import row:', row, error);
      failed++;
    }
  }

  return { success, failed, preview };
}

export function downloadCSV(csv: string, filename: string = 'fishing-log.csv') {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

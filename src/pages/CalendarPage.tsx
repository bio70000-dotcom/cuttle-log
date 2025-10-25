import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { useState } from 'react';

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  const trips = useLiveQuery(() => db.trips.toArray(), []) || [];

  const tripsOnSelectedDate = trips.filter(trip => {
    if (!selectedDate) return false;
    const tripDate = new Date(trip.dateStart);
    return (
      tripDate.getFullYear() === selectedDate.getFullYear() &&
      tripDate.getMonth() === selectedDate.getMonth() &&
      tripDate.getDate() === selectedDate.getDate()
    );
  });

  const tripDates = trips.map(trip => new Date(trip.dateStart));

  return (
    <div className="min-h-screen bg-background pb-20 pt-4 px-4">
      <h1 className="text-2xl font-bold mb-4">캘린더</h1>

      <Card className="p-4 mb-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md"
          modifiers={{
            trip: tripDates,
          }}
          modifiersStyles={{
            trip: {
              fontWeight: 'bold',
              textDecoration: 'underline',
            },
          }}
        />
      </Card>

      {selectedDate && (
        <div className="space-y-3">
          <h2 className="font-semibold">
            {selectedDate.toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </h2>

          {tripsOnSelectedDate.length > 0 ? (
            tripsOnSelectedDate.map((trip) => (
              <TripSummary key={trip.id} tripId={trip.id!} />
            ))
          ) : (
            <Card className="p-4 text-center">
              <p className="text-muted-foreground">이 날짜에 출조 기록이 없습니다</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function TripSummary({ tripId }: { tripId: number }) {
  const trip = useLiveQuery(() => db.trips.get(tripId), [tripId]);
  const catchCount = useLiveQuery(
    () => db.catchEvents.where('tripId').equals(tripId).count(),
    [tripId]
  );

  if (!trip) return null;

  return (
    <Card className="p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{trip.spotName || '위치 미지정'}</h3>
          <p className="text-sm text-muted-foreground">
            {new Date(trip.dateStart).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg">{catchCount || 0}수</p>
        </div>
      </div>
    </Card>
  );
}

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { TodayBar } from '@/components/TodayBar';
import { ConditionsSnapshot } from '@/components/ConditionsSnapshot';
import { PresetSlots } from '@/components/PresetSlots';
import { LiveCatchButton } from '@/components/LiveCatchButton';
import { RecentEvents } from '@/components/RecentEvents';
import { MiniInsight } from '@/components/MiniInsight';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useToast } from '@/hooks/use-toast';
import { queueForSync } from '@/lib/sync';

export default function HomePage() {
  const [currentTripId, setCurrentTripId] = useState<number | null>(null);
  const [activeRigSlot, setActiveRigSlot] = useState<'A' | 'B' | 'C'>('A');
  const [activeEgiSlot, setActiveEgiSlot] = useState<'A' | 'B' | 'C'>('A');
  const { position } = useGeolocation();
  const { toast } = useToast();

  const currentTrip = useLiveQuery(
    async () => {
      if (!currentTripId) return null;
      return await db.trips.get(currentTripId);
    },
    [currentTripId]
  );

  const rigPresets = useLiveQuery(() => db.rigPresets.toArray(), []) || [];
  const egiPresets = useLiveQuery(() => db.egiPresets.toArray(), []) || [];
  
  const recentEvents = useLiveQuery(
    async () => {
      if (!currentTripId) return [];
      return await db.catchEvents
        .where('tripId')
        .equals(currentTripId)
        .reverse()
        .limit(3)
        .toArray();
    },
    [currentTripId]
  ) || [];

  const allEvents = useLiveQuery(() => db.catchEvents.toArray(), []) || [];
  const allConditions = useLiveQuery(() => db.conditions.toArray(), []) || [];

  const currentCondition = useLiveQuery(
    async () => {
      if (!currentTripId) return null;
      return await db.conditions
        .where('tripId')
        .equals(currentTripId)
        .last();
    },
    [currentTripId]
  );

  // Find active trip on mount
  useEffect(() => {
    const findActiveTrip = async () => {
      const trips = await db.trips.reverse().limit(1).toArray();
      if (trips.length > 0 && !trips[0].dateEnd) {
        setCurrentTripId(trips[0].id!);
      }
    };
    findActiveTrip();
  }, []);

  const handleStartTrip = async () => {
    try {
      const tripId = await db.trips.add({
        dateStart: new Date(),
        lat: position?.lat,
        lng: position?.lng,
      });

      setCurrentTripId(tripId);
      await queueForSync('trip', { id: tripId, action: 'start' });

      toast({
        title: '출조 시작',
        description: '즐거운 낚시 되세요!',
      });
    } catch (error) {
      console.error('Failed to start trip:', error);
      toast({
        title: '출조 시작 실패',
        variant: 'destructive',
      });
    }
  };

  const handleEndTrip = async () => {
    if (!currentTripId) return;

    try {
      await db.trips.update(currentTripId, {
        dateEnd: new Date(),
      });

      await queueForSync('trip', { id: currentTripId, action: 'end' });

      toast({
        title: '출조 종료',
        description: '수고하셨습니다!',
      });

      setCurrentTripId(null);
    } catch (error) {
      console.error('Failed to end trip:', error);
      toast({
        title: '출조 종료 실패',
        variant: 'destructive',
      });
    }
  };

  const handleSelectSpot = () => {
    // TODO: Open map modal to select spot
    toast({
      title: '위치 선택',
      description: '지도 페이지로 이동하여 위치를 선택하세요',
    });
  };

  const handleRefreshConditions = () => {
    // TODO: Fetch fresh conditions from API
    toast({
      title: '조건 갱신',
      description: 'API 연동 후 자동 갱신됩니다',
    });
  };

  const handleEditConditions = () => {
    // TODO: Open edit dialog
    toast({
      title: '조건 수정',
      description: '수동 입력 기능은 곧 추가됩니다',
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TodayBar
        currentTrip={currentTrip || null}
        onStartTrip={handleStartTrip}
        onEndTrip={handleEndTrip}
        onSelectSpot={handleSelectSpot}
      />

      <div className="pt-32 px-4 space-y-4">
        <ConditionsSnapshot
          condition={currentCondition || null}
          onRefresh={handleRefreshConditions}
          onEdit={handleEditConditions}
        />

        <PresetSlots
          rigPresets={rigPresets}
          egiPresets={egiPresets}
          activeRigSlot={activeRigSlot}
          activeEgiSlot={activeEgiSlot}
          onRigSlotChange={setActiveRigSlot}
          onEgiSlotChange={setActiveEgiSlot}
        />

        <LiveCatchButton
          tripId={currentTripId}
          rigSlot={activeRigSlot}
          egiSlot={activeEgiSlot}
          currentLat={position?.lat}
          currentLng={position?.lng}
          conditionId={currentCondition?.id}
        />

        <RecentEvents
          events={recentEvents}
          rigPresets={rigPresets}
          egiPresets={egiPresets}
        />

        <MiniInsight
          events={allEvents}
          conditions={allConditions}
          currentTideStage={currentTrip?.tideStage}
        />
      </div>
    </div>
  );
}

export default function MapPage() {
  return (
    <div className="fixed inset-0 pb-16 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center p-8 bg-white rounded-xl shadow-2xl max-w-md">
        <h1 className="text-3xl font-bold mb-4 text-gray-800">🗺️ 지도 페이지</h1>
        <p className="text-gray-600 mb-6">
          현재 페이지가 정상적으로 로드되었습니다.
        </p>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <p className="font-semibold">✓ 컴포넌트 작동 중</p>
        </div>
      </div>
    </div>
  );
}

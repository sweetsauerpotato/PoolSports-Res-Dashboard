import { TopBar } from '../components/layout/TopBar'
import { BookingCalendar } from '../components/booking/BookingCalendar'

export function KalenderPage() {
  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      <TopBar />
      <main className="flex-1 overflow-auto p-4">
        <BookingCalendar />
      </main>
    </div>
  )
}

import { DORMITORY_SELECTS, OTHER_ACCOMMODATION_TYPES, OTHER_FACILITIES, type DormitoryDetails, type OtherAccommodation } from '@/lib/accommodation'

function Details({ rows }: { rows: [string, string | number | undefined][] }) {
  return <dl className="grid gap-3 sm:grid-cols-2 text-sm">{rows.map(([label, value]) => (
    <div key={label}><dt className="text-navy-500">{label}</dt><dd className="font-medium text-navy-900">{value ?? 'Not provided'}</dd></div>
  ))}</dl>
}

export function OtherAccommodationSummary({ value }: { value: Partial<OtherAccommodation> }) {
  return <Details rows={[
    ['Type of accommodation', OTHER_ACCOMMODATION_TYPES.find((type) => type.value === value.type)?.label],
    ['Number of beds', value.numberOfBeds],
    ...OTHER_FACILITIES.map(([key, label]): [string, string | undefined] => [label, value[key] === 'yes' ? 'Yes' : value[key] === 'no' ? 'No' : undefined]),
  ]} />
}

export function DormitorySummary({ value }: { value: Partial<DormitoryDetails> }) {
  return <Details rows={[
    ['Room number / name', value.roomName],
    ['Total beds in room', value.totalBeds],
    ...DORMITORY_SELECTS.map(({ key, label }): [string, string | undefined] => [label, value[key]]),
    ['Bed dimensions (length × width)', value.bedLength && value.bedWidth ? `${value.bedLength} × ${value.bedWidth} cm` : undefined],
    ['Linen provided', value.linenProvided?.join(', ') || 'None'],
  ]} />
}

import { FilePreview } from '@/components/shared/FilePreview'
import { PropertyDetailsSummary } from '@/components/owner/PropertyDetailsSummary'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'
import {
  adminPropertiesApi,
  type PropertyStatus,
  type PropertyQueueItem,
  type RevisionItem,
} from '@/lib/api/adminProperties'

const QUEUE_TABS: { value: PropertyStatus; label: string }[] = [
  { value: 'pending_review', label: 'Pending review' },
  { value: 'needs_revision', label: 'Needs revision' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const STATUS_BADGE: Record<PropertyStatus, BadgeProps['variant']> = {
  draft: 'grey',
  pending_review: 'amber',
  needs_revision: 'teal',
  approved: 'green',
  rejected: 'red',
  suspended: 'red',
  escalated: 'red',
}

function AdminHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-primary-600">Admin portal</p>
      <h1 className="font-display text-2xl font-bold text-navy-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-navy-500">{subtitle}</p>}
    </div>
  )
}

function QueueTable({ items, onReview }: { items: PropertyQueueItem[]; onReview: (id: string) => void }) {
  if (items.length === 0) {
    return (
      <div className="rounded-(--radius-lg) border border-border bg-white p-10 text-center text-sm text-navy-500 shadow-2">
        Nothing in this queue right now.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-(--radius-lg) border border-border bg-white shadow-2">
      <table className="w-full min-w-[780px] text-left text-sm">
        <caption className="sr-only">Moderation queue</caption>
        <thead className="bg-white text-xs font-bold uppercase tracking-wider text-navy-500">
          <tr>
            {['Submission', 'Property', 'Owner', 'Submitted', 'Revisions', 'Status', 'Action'].map((h) => (
              <th key={h} scope="col" className="px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-navy-50" data-testid={`queue-row-${item.id}`}>
              <td className="px-4 py-4 font-mono text-xs font-bold text-navy-900">{item.submissionRef ?? '—'}</td>
              <td className="px-4 py-4 font-semibold text-navy-900">{item.name}</td>
              <td className="px-4 py-4 font-mono text-xs text-navy-500">{item.ownerId}</td>
              <td className="px-4 py-4 text-navy-500">{item.submittedAt ? formatDate(item.submittedAt) : '—'}</td>
              <td className="px-4 py-4 text-navy-500">{item.revisionCount}</td>
              <td className="px-4 py-4"><Badge variant={STATUS_BADGE[item.status]}>{item.status.replace('_', ' ')}</Badge></td>
              <td className="px-4 py-4"><Button variant="dark" size="sm" data-testid={`review-${item.id}`} onClick={() => onReview(item.id)}>Review</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type DialogMode = 'view' | 'reject' | 'revise'

function PropertyDetailDialog({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<DialogMode>('view')
  const [reason, setReason] = useState('')
  const [items, setItems] = useState<RevisionItem[]>([{ field: '', reason: '' }])

  const { data: detail, isLoading } = useQuery({
    queryKey: ['admin-property', propertyId],
    queryFn: () => adminPropertiesApi.getDetail(propertyId),
  })

  function invalidateQueues() {
    queryClient.invalidateQueries({ queryKey: ['admin-properties-queue'] })
  }

  const approveMutation = useMutation({
    mutationFn: () => adminPropertiesApi.approve(propertyId),
    onSuccess: () => {
      toast.success('Property approved')
      invalidateQueues()
      onClose()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to approve property'),
  })

  const rejectMutation = useMutation({
    mutationFn: () => adminPropertiesApi.reject(propertyId, reason.trim()),
    onSuccess: () => {
      toast.success('Property rejected')
      invalidateQueues()
      onClose()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to reject property'),
  })

  const revisionMutation = useMutation({
    mutationFn: () =>
      adminPropertiesApi.requestRevision(
        propertyId,
        items.map((item) => ({ field: item.field.trim(), reason: item.reason.trim() })),
      ),
    onSuccess: (result) => {
      toast.success(
        result.status === 'escalated'
          ? 'Revision cycle cap reached — property escalated'
          : 'Revision requested from owner',
      )
      invalidateQueues()
      onClose()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to request revision'),
  })

  const property = detail?.property
  const compliance = detail?.compliance
  const canModerate = property?.status === 'pending_review'

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{property?.name ?? 'Property detail'}</DialogTitle>
          <DialogDescription>
            {property?.submissionRef ?? '—'} · Owner {property?.ownerId ?? '—'}
          </DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-sm text-navy-600">Loading…</p>}

        {property && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-navy-500">Type</span><p className="font-semibold text-navy-900">{property.propertyType ?? '—'}</p></div>
              <div><span className="text-navy-500">Booking policy</span><p className="font-semibold text-navy-900">{property.bookingPolicy ?? '—'}</p></div>
              <div><span className="text-navy-500">Category</span><p className="font-semibold text-navy-900">{property.category ?? '—'}</p></div>
              <div><span className="text-navy-500">Revision count</span><p className="font-semibold text-navy-900">{property.revisionCount} / 3</p></div>
              <div className="col-span-2">
                <span className="text-navy-500">Address</span>
                <p className="font-semibold text-navy-900">
                  {[property.addressLine1, property.addressLine2, property.city, property.state, property.pincode].filter(Boolean).join(', ') || '—'}
                </p>
              </div>
            </div>

            <PropertyDetailsSummary propertyType={property.propertyType ?? ''} value={property.propertyDetails} />
            {detail.roomTypes.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-navy-500 mb-2">Room types</p>
                <ul className="space-y-1 text-sm">
                  {detail.roomTypes.map((rt) => (
                    <li key={rt.id} className="flex justify-between rounded-[8px] border border-border px-3 py-2">
                      <span className="font-medium text-navy-900">{rt.type} × {rt.count}</span>
                      <span className="text-navy-500">
                        {rt.hourlyRatePaise != null ? `₹${rt.hourlyRatePaise / 100}/hr` : ''}
                        {rt.fulldayRatePaise != null ? ` · ₹${rt.fulldayRatePaise / 100}/day` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-navy-500 mb-2">Photos ({detail.photos.length})</p>
              <div className="flex flex-wrap gap-2">
                {detail.photos.map((photo) => (
                  <span key={photo.id} className="rounded-full bg-navy-100 px-3 py-1 text-xs text-navy-600">{photo.category}</span>
                ))}
                {detail.photos.length === 0 && <span className="text-sm text-navy-500">No photos uploaded</span>}
              </div>
            </div>

            {compliance ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-navy-500 mb-2">Compliance (decrypted)</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-navy-500">Legal name</span><p className="font-semibold text-navy-900">{compliance.legalBusinessName}</p></div>
                  <div><span className="text-navy-500">GSTIN</span><p className="font-mono font-semibold text-navy-900">{compliance.gstin}</p></div>
                  <div><span className="text-navy-500">PAN</span><p className="font-mono font-semibold text-navy-900">{compliance.pan}</p></div>
                  <div><span className="text-navy-500">Bank account</span><p className="font-mono font-semibold text-navy-900">{compliance.bankAccountNumber}</p></div>
                  <div><span className="text-navy-500">IFSC</span><p className="font-mono font-semibold text-navy-900">{compliance.ifsc}</p></div>
                  <div><span className="text-navy-500">Account holder</span><p className="font-semibold text-navy-900">{compliance.accountHolderName}</p></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {compliance.documents.map((doc) => (
                    <span key={doc.type} className="inline-flex items-center gap-2"><Badge variant={doc.status === 'verified' ? 'green' : doc.status === 'rejected' ? 'red' : 'amber'}>
                      {doc.type.replace(/_/g, ' ')} · {doc.status}
                    </Badge><FilePreview src={doc.url} name={doc.type.replace(/_/g, " ")} isPdf={/\.pdf$/i.test(doc.url)} /></span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-navy-500">Compliance details not submitted.</p>
            )}

            {canModerate && mode === 'view' && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                <Button data-testid="approve-btn" onClick={() => approveMutation.mutate()} loading={approveMutation.isPending}>Approve</Button>
                <Button data-testid="reject-btn" variant="outline" onClick={() => setMode('reject')}>Reject</Button>
                <Button data-testid="revise-btn" variant="outline" onClick={() => setMode('revise')}>Request revision</Button>
              </div>
            )}

            {canModerate && mode === 'reject' && (
              <div className="space-y-3 pt-2 border-t border-border">
                <label className="text-sm font-semibold text-navy-900">
                  Reason for rejection
                  <Textarea
                    className="mt-2"
                    data-testid="reject-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why this submission is being rejected..."
                  />
                </label>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setMode('view')}>Cancel</Button>
                  <Button
                    variant="danger"
                    data-testid="confirm-reject-btn"
                    disabled={reason.trim().length === 0}
                    loading={rejectMutation.isPending}
                    onClick={() => rejectMutation.mutate()}
                  >
                    Confirm rejection
                  </Button>
                </div>
              </div>
            )}

            {canModerate && mode === 'revise' && (
              <div className="space-y-3 pt-2 border-t border-border">
                {property.revisionCount >= 3 && (
                  <p className="flex items-center gap-2 text-sm text-error-700">
                    <AlertTriangle size={16} /> This is the final revision cycle — requesting again will escalate the property.
                  </p>
                )}
                <p className="text-sm font-semibold text-navy-900">Items requiring changes</p>
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                    <Input
                      placeholder="Field (e.g. photos)"
                      data-testid={`revision-field-${i}`}
                      value={item.field}
                      onChange={(e) => setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, field: e.target.value } : it)))}
                    />
                    <Input
                      placeholder="What needs to change?"
                      data-testid={`revision-reason-${i}`}
                      value={item.reason}
                      onChange={(e) => setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, reason: e.target.value } : it)))}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      disabled={items.length === 1}
                      onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label="Remove item"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" type="button" data-testid="add-revision-item-btn" onClick={() => setItems((prev) => [...prev, { field: '', reason: '' }])}>
                  <Plus size={14} /> Add item
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setMode('view')}>Cancel</Button>
                  <Button
                    data-testid="confirm-revision-btn"
                    loading={revisionMutation.isPending}
                    disabled={items.some((item) => !item.field.trim() || !item.reason.trim())}
                    onClick={() => revisionMutation.mutate()}
                  >
                    Send to owner
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function AdminVerificationPage() {
  const [status, setStatus] = useState<PropertyStatus>('pending_review')
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-properties-queue', status],
    queryFn: () => adminPropertiesApi.listQueue({ status, limit: 20 }),
  })

  return (
    <div className="space-y-6">
      <AdminHeader title="Property moderation" subtitle="Review onboarding submissions, approve, reject, or request changes." />

      <Tabs value={status} onValueChange={(value) => setStatus(value as PropertyStatus)}>
        <TabsList className="border-border">
          {QUEUE_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-navy-500 data-[state=active]:text-primary-600">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="rounded-(--radius-lg) border border-border bg-white p-10 text-center text-sm text-navy-500 shadow-2">
          Loading queue…
        </div>
      ) : (
        <QueueTable items={data?.items ?? []} onReview={setReviewingId} />
      )}

      {data && (
        <p className="text-xs text-navy-500">
          {data.total} {data.total === 1 ? 'property' : 'properties'} in this queue
        </p>
      )}

      {reviewingId && <PropertyDetailDialog propertyId={reviewingId} onClose={() => setReviewingId(null)} />}
    </div>
  )
}

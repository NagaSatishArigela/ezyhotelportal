import { z } from 'zod'

const compact = (value: string) => value.trim().replace(/[\s()-]/g, '')
export const receptionContactSchema = z.object({
  receptionMobile: z.string().transform((value) => {
    const number = compact(value)
    if (number.startsWith('+91') && number.length === 13) return number.slice(3)
    if (number.startsWith('91') && number.length === 12) return number.slice(2)
    return number
  }).pipe(z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit reception mobile number')),
  receptionLandline: z.string().transform(compact).pipe(z.string().regex(/^(?:\+?\d{6,15})?$/, 'Enter a valid landline including STD code')),
})
export type ReceptionContact = z.infer<typeof receptionContactSchema>

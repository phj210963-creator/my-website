import test from 'node:test'
import assert from 'node:assert/strict'
import { eventDateTimeInputToIso, formatEventDateTime, toEventDateTimeInput } from '../src/dateTime.js'

test('stores a Hong Kong form time as the correct UTC instant', () => {
  assert.equal(eventDateTimeInputToIso('2026-10-06T18:00'), '2026-10-06T10:00:00.000Z')
})

test('renders an event instant in Hong Kong on the same intended day', () => {
  assert.match(formatEventDateTime('2026-10-06T10:00:00.000Z'), /2026.*10.*6.*下午6:00/)
})

test('fills datetime-local controls with Hong Kong wall-clock time', () => {
  assert.equal(toEventDateTimeInput('2026-10-06T10:00:00.000Z'), '2026-10-06T18:00')
})

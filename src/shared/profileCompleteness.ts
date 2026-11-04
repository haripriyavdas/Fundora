import { STORED_PROFILE_FIELDS, type ProfileField, type ProfileFields } from './schemas/profile.js'

/** `educationLevel` is always UG and set by the wizard, so it isn't something a student fills. */
const COUNTED_FIELDS = STORED_PROFILE_FIELDS.filter((field) => field !== 'educationLevel')

/** Reads a field by its dotted name, such as `docs.feeReceipt`. */
export function readProfileField(profile: ProfileFields, field: ProfileField): unknown {
  return field
    .split('.')
    .reduce<unknown>((value, key) => (value as Record<string, unknown> | undefined)?.[key], profile)
}

/** Does this field apply to this student? Fields that don't apply aren't counted either way. */
function fieldApplies(field: ProfileField, profile: ProfileFields): boolean {
  // TODO(human): decide which fields don't apply to which students.
  void field
  void profile
  return true
}

/** 0–100. Rounds down, so 100 always means nothing is left to fill. */
export function profileCompleteness(profile: ProfileFields): number {
  const counted = COUNTED_FIELDS.filter((field) => fieldApplies(field, profile))
  const filled = counted.filter((field) => readProfileField(profile, field) !== undefined)
  return counted.length === 0 ? 100 : Math.floor((100 * filled.length) / counted.length)
}

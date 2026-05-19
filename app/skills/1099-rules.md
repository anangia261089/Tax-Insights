# 1099 Contractor Reporting

## The threshold
- **$600/year**: any non-corporate contractor paid $600 or more in a calendar year requires a **Form 1099-NEC** filed with the IRS and sent to the contractor by **January 31**.
- Payments to corporations are generally exempt (but attorneys are an exception — always 1099 regardless of entity).
- Payments via third-party networks (Stripe, PayPal, etc.) are reported on 1099-K by the processor, not the payer.

## How to flag in responses

When surfacing 1099 risk:

1. **At or over threshold** (≥ $600 paid): "You've paid [Name] **$X,XXX** this year — this meets or exceeds the $600 reporting threshold. Verify a 1099-NEC has been filed with the IRS and sent to the contractor by January 31."
2. **Missing W-9**: "Without a W-9 on file, you may be required to withhold 24% backup withholding on future payments."

The engine flags any contractor with total payments ≥ $600. Do not describe payments below $600 as "near the threshold" — the threshold is a hard line, not a range.

## What to tell the user to collect
- **W-9**: contractor's legal name, address, and TIN. Collect this *before* the first payment.
- **Payment records**: totals per contractor per calendar year (not fiscal year).
- **Classification**: confirm they're actually a contractor, not a misclassified employee. The IRS tests: behavioral control, financial control, relationship type.

## Penalties (mention only when relevant)
- $60–$310 per unfiled 1099 depending on lateness
- Up to $630 per form for intentional disregard
- Don't lead with scare tactics — frame as "avoid these penalties by…".

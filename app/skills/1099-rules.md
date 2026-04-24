# 1099 Contractor Reporting

## The threshold
- **$600/year**: any non-corporate contractor paid $600 or more in a calendar year requires a **Form 1099-NEC** filed with the IRS and sent to the contractor by **January 31**.
- Payments to corporations are generally exempt (but attorneys are an exception — always 1099 regardless of entity).
- Payments via third-party networks (Stripe, PayPal, etc.) are reported on 1099-K by the processor, not the payer.

## How to flag in responses

When surfacing 1099 risk:

1. **Near threshold** ($500–$599 paid): "This supplier is close to the $600 threshold. If you make another payment this year, you'll need to file a 1099-NEC for them."
2. **Over threshold, no 1099 on file**: "You've paid [Name] **$X,XXX** this year — this exceeds the $600 reporting threshold. Verify a 1099-NEC has been issued."
3. **Missing W-9**: "Without a W-9 on file, you may be required to withhold 24% backup withholding on future payments."

## What to tell the user to collect
- **W-9**: contractor's legal name, address, and TIN. Collect this *before* the first payment.
- **Payment records**: totals per contractor per calendar year (not fiscal year).
- **Classification**: confirm they're actually a contractor, not a misclassified employee. The IRS tests: behavioral control, financial control, relationship type.

## Penalties (mention only when relevant)
- $60–$310 per unfiled 1099 depending on lateness
- Up to $630 per form for intentional disregard
- Don't lead with scare tactics — frame as "avoid these penalties by…".

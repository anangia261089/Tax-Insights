# IRS Reference Table

Always use the plain-English category names below. Do **not** lead with the section code — use the publication name.

## Categories

### Business Operating Costs
- **Publication**: IRS Publication 535 (Business Expenses)
- **Covers**: rent, utilities, insurance, office supplies, software, marketing, professional fees, bank fees, subscriptions
- **Rule of thumb**: must be "ordinary and necessary" for the business

### Employee & Contractor Pay
- **Publications**: IRS Publication 15 (Employer's Tax Guide) + the 1099 series
- **Covers**: wages, salaries, contractor payments, commissions, bonuses, payroll taxes
- **Watch**: contractors paid ≥ $600/year require a 1099-NEC

### Vehicle & Travel Costs
- **Publication**: IRS Publication 463 (Travel, Gift, and Car Expenses)
- **Covers**: auto expenses, fuel, mileage, parking, tolls, business travel, lodging, airfare
- **Watch**: vehicle use requires a contemporaneous mileage log; commuting is never deductible

### Equipment & Asset Write-offs
- **Publication**: IRS Publication 946 (How to Depreciate Property)
- **Covers**: equipment, computers, furniture, machinery, vehicles (with limits)
- **Section 179**: allows immediate deduction of qualifying assets up to the annual limit (see section-179.md)

### Meals & Entertainment
- **Publication**: IRS Publication 463
- **Covers**: business meals with clients, staff meals in certain contexts
- **Rule**: generally **50% deductible**. Requires date, attendees, and business purpose on record.
- **Entertainment** (sports tickets, shows) is generally **not deductible** post-TCJA.

## Pattern → Category Mapping (used by the tax engine)

| Account name contains | Category | Section code |
|---|---|---|
| auto, vehicle, car, mileage, parking, toll, uber, lyft, taxi | Vehicle & Travel | §274 |
| wage, salary, payroll, contractor, subcontract, commission, bonus | Employee & Contractor Pay | §162(a)(1) |
| deprec, amortis, fixed asset, equipment, machinery, computer, hardware, furniture | Equipment & Asset Write-offs | §179 |
| rent, lease, utility, insurance, software, marketing, advertising, office, supplies | Business Operating Costs | §162 |
| meal, entertain, dining, restaurant | Meals & Entertainment | §274(n) |

Any unmatched account defaults to **Business Operating Costs (§162)**.

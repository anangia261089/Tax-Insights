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

### Business Meals
- **Publication**: IRS Publication 463
- **Covers**: meals with clients or employees where there is a documented business purpose
- **Rule**: **50% deductible**. Must record date, attendees, business purpose, and keep receipts.

### Entertainment
- **Publication**: IRS Publication 463
- **Rule**: **0% deductible** since the Tax Cuts and Jobs Act (2018). Sports tickets, concerts, golf, club memberships — none of it qualifies. If an account mixes meals and entertainment, only the meal portion (50%) can be claimed.

### Home Office
- **Publication**: IRS Publication 587 (Business Use of Your Home)
- **Rule**: space must be used **regularly and exclusively** for business. Two methods: (1) simplified — $5/sq ft up to 300 sq ft; (2) actual expenses — percentage of home costs equal to office sq ft ÷ total sq ft.
- **Watch**: renters and homeowners both qualify; commuting context matters.

### Retirement Plan Contributions
- **Publications**: IRS Publication 560 (Retirement Plans for Small Business)
- **Covers**: SEP-IRA, SIMPLE IRA, Solo 401(k), defined benefit plans
- **2024 limits**: SEP-IRA up to 25% of net self-employment income (max $69,000); Solo 401(k) up to $69,000 total ($76,500 if age 50+)
- **Watch**: contributions must be made by the tax filing deadline (including extensions)

### Self-Employed Health Insurance
- **Publication**: IRS Publication 535
- **Rule**: 100% of premiums (medical, dental, vision) deductible as an above-the-line adjustment — not an itemized deduction. Cannot exceed net self-employment income. Not available if eligible for employer-sponsored coverage.

### State & Local Taxes (SALT)
- **Publication**: IRS Publication 535 / Schedule C instructions
- **Covers**: state income tax paid on business income, property tax on business property, payroll taxes (employer share), franchise taxes
- **Watch**: the $10,000 SALT cap applies to personal (Schedule A) deductions, NOT to business taxes on Schedule C — business SALT is fully deductible.

## Pattern → Category Mapping (used by the tax engine)

| Account name contains | Category | Section code |
|---|---|---|
| auto, vehicle, car, mileage, parking, toll, uber, lyft, taxi | Vehicle & Travel | §274 |
| wage, salary, payroll, contractor, subcontract, commission, bonus | Employee & Contractor Pay | §162(a)(1) |
| deprec, amortis, fixed asset, equipment, machinery, computer, hardware, furniture | Equipment & Asset Write-offs | §179 |
| home office, work from home, residential office | Home Office | §280A |
| 401k, sep-ira, simple ira, pension, retirement plan, keogh | Retirement Contributions | §401 |
| health insurance, medical insurance, dental insurance, vision insurance | Self-Employed Health Insurance | §162(l) |
| state tax, local tax, property tax, franchise tax, payroll tax, employer tax | State & Local Taxes | §164 |
| entertain, concert, sport, golf, ticket, club | Entertainment (non-deductible) | §274 |
| meal, dining, restaurant, catering, food | Business Meals (50%) | §274(n) |
| rent, lease, utility, insurance, software, marketing, advertising, office, supplies | Business Operating Costs | §162 |

Any unmatched account defaults to **Business Operating Costs (§162)**.

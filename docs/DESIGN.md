# Campus Pantry mobile design

## Implemented Stitch screens

The Expo client follows Jules's **Campus Food Pantry App Design** export (Stitch project 264145195589890532). It uses the Roosevelt seal, bundled Manrope fonts and product images, a mint canvas, compact shelf rows, forest-green actions and five quota segments. Illustrations describe a product family. The Java lot name, date and stock count identify the actual lot. New products receive a category icon.

| Stitch screen | What the app does | Review decision |
| --- | --- | --- |
| Browse Items | Search names or lot IDs, filter by category, switch between Java's name and ID sorting, add one unit and open the basket. | Counts come from current inventory. Expired and empty lots can be inspected. Their add buttons are disabled. |
| Product Detail | Show the selected lot, best-before date, available stock and a bounded quantity picker. | The service defines one unit per item. Package weights and a three-per-product cap in the example have no API representation. |
| Your Basket | Adjust or remove lots, confirm clearing all, review the total and current allowance. | The five segments represent approved units. The basket shows its own count. The reset date and Chicago time zone come from the profile. |
| Review and Submission Result | Check the basket, submit once and display the returned request ID and status. History shows actual decisions and decline reasons. | A network retry reuses the same key for unchanged lines. Submission reserves no stock or quota. The result appears after Java responds. |
| Admin Incoming Requests Review | Show counts by actual status, stock by lot, oldest-first review and a reason for a decline. Inventory, reports and inspections remain available in staff navigation. | Only the queue head has decision actions. The server rechecks stock and quota. The mock station, scanner, substitutions, ready-for-pickup stage and member quota estimates have no matching API. |

Screen changes use a 190 ms fade/translation. Quantity feedback uses a 150 ms scale change. Both follow system reduced-motion preferences, including changes while the app is open. Controls use text or accessible labels and a minimum 44-point target. See [the browser verification](../mobile/AGENTS.md#browser-verification) for the reproducible member/staff flow and the CI screenshots.

## Earlier Figma proposal

## Delivered design · 2026-11-16

[Open the Figma review board](https://www.figma.com/design/0yQ1YSKVzvgdbivmssuHS2?node-id=13-1286). The editable file is in **jules rumeau's team**.

- 56 mobile screens and states at 390 × 844, organized on the App page, plus a four-screen review board.
- Two pages: Foundations and App — clickable flows. Ten reusable component families contain 33 components/variants, with semantic color/spacing variables and seven Manrope text styles.
- Five prototype starting points: member browse-to-request, open signup, administrator FIFO/stock, password recovery, and stock conflict. [Open the member prototype](https://www.figma.com/proto/0yQ1YSKVzvgdbivmssuHS2?node-id=5-61&starting-point-node-id=5%3A61).
- Member navigation: Browse, Requests, Profile; contextual basket. Administrator navigation: Overview, Requests, Inventory, More.
- Main fixtures distinguish an empty basket, two units selected, Pending, and Approved with 2/5 units consumed. The administrator can review only the oldest request; later requests are visibly locked.

Visual review caught and corrected multiline text sizing. The final structural audit found no content overflowing its non-scrolling parent and no linked target smaller than 44 × 44. Scroll containers intentionally retain overflow. Screenshots of the review board and signup confirm the corrected layout.

This is a **click-through design proposal**, not a deployed app or a Supabase-connected prototype. Example records are illustrative. Text input, some filters and secondary actions are visual specifications; the prototype connects representative flows, not every possible data combination. Device accessibility, keyboard behavior, large text and actual network/account flows still require implementation and testing. The later Stitch implementation is described above.

## Scope

Jules requested an editable Figma proposal after the Vercel migration: a distinctive campus-pantry identity, familiar mobile navigation and complete member/admin flows. This is a design proposal, not evidence of an implemented or deployed redesign. The selected destination is the student plan `jules rumeau's team`.

## Direction

The app should feel like a well-run neighborhood pantry: clear shelf labels, restrained package illustrations, generous white space and a recognizable five-unit allowance strip. The five segments represent **approved** units only. Basket quantities and pending requests are separate text summaries; they do not fill the approved-usage meter.

Palette: forest `#174D3A`, paper `#F7F9F6`, white `#FFFFFF`, ink `#17211D`, harvest `#DDB64D`, error `#B44235`. Manrope is the proposed typeface, with bold compact headings and readable body text. Keep a consistent 4/8-point spacing rhythm, 44-point minimum tap targets, quiet separators and rounded controls. No marketing hero, decorative gradients or revenue charts.

The earlier implementation used system fonts. The Stitch implementation now bundles Manrope. UI copy stays in English.

## Familiar patterns, adapted to this product

- Instacart: searchable product list, visible basket entry and quantity adjustment. Here, units replace price totals and submitting creates a request requiring approval.
- Too Good To Go: prominent availability and a short browse/detail/confirmation flow. Campus Pantry has no payment, map, reservation or pickup window.
- iOS conventions: stable bottom navigation, labeled icons, clear back actions, reachable primary controls and at least 44 × 44 point hit areas.

References: [Instacart shopping flow](https://www.instacart.com/help/section/360007996832/360039163432), [Too Good To Go flow](https://www.toogoodtogo.com/en-us/how-does-the-app-work), [Apple interface guidance](https://developer.apple.com/design/tips/).

## Screen inventory and acceptance

| Group | Required coverage |
| --- | --- |
| Foundations | Palette, typography, buttons, fields, product rows, stepper, quota, statuses and navigation |
| Member | Browse/search/filter; product detail; basket; review; submitted/Pending; requests; Approved and Declined details; profile |
| Authentication | Sign in, open sign up, email confirmation, forgotten password and reset |
| Administration | Overview; FIFO queue; oldest-request review; later-request lock; decline reason; inventory; add lot; restock; expired-lot removal |
| Operations | Inventory report; movements; inspection list, detail and form; return to member workspace |
| States | Empty search/basket/history; offline/error; allowance reached; unavailable product; changed stock; stale decision; busy/invalid controls |

Connect the principal member and administrator paths in the prototype. Keep screens as editable text, vectors, auto-layout frames and reusable components. Check typography, contrast, spacing, no accidental text clipping and consistent rules across example data.

## Product rules represented in the design

Signup requires name, email and password only. All accounts are MEMBER; only Jules's verified server-side UUID enables the admin workspace. No role selector or eligibility gate.

Approved usage is at most five units per Monday–Sunday week in America/Chicago. Pending requests reserve nothing. Review requests oldest first; a later request is viewable but not actionable. Approval rechecks stock, expiration and allowance atomically. Decline has a reason and changes no stock or allowance. Never imply collected, delivered or ready-for-pickup states.

Each lot has its own ID and expiration date. Restocking keeps the date; a different expiration requires a new lot. Inspections record hygiene, damaged products, cleanliness, notes and the authenticated administrator.

Prototype fixtures use Rice lot 101 with 20 units. A member with 0 approved units requests 2; submission leaves stock 20 and usage 0. Approval changes stock to 18 and usage to 2/5. A separate declined example leaves those quantities unchanged. Fixture dates and counts are illustrative, not live Supabase records.

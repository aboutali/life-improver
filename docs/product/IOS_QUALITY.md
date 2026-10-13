# iOS Quality Bar

This rubric defines "on par with top-tier iOS apps" for Life Improver. Each item is checkable.
Reference apps: Apple Health, Apple Fitness, Things 3, Headspace, Day One.

Status column: Done, Partial or Gap. The lead updates it after each verification pass.

## 1. Look

| ID | Criterion | How we check | Status |
|---|---|---|---|
| L1 | UI text uses the system font (SF Pro on Apple devices). The brand serif stays for large titles and practice text. | Computed `font-family` of body text starts with `-apple-system` or `system-ui`. | Gap |
| L2 | Full dark mode that follows the system setting. Every screen is legible in both modes. | axe colour-contrast passes on every route in light and dark. | Gap |
| L3 | One spacing scale, one radius scale, one elevation style. | No hex colours or pixel font sizes outside tokens in screen sections. | Partial |
| L4 | Tab bar icons switch from outline to filled when active, like SF Symbols. | Screenshot review. | Gap |
| L5 | Settings-style rows carry small coloured icon tiles. | Screenshot review of Settings. | Gap |
| L6 | Empty states show an icon, a title and one action. | Screenshot review of every empty state. | Partial |
| L7 | Launch shows a splash screen in the installed app. No white flash. | `apple-touch-startup-image` links for current iPhone sizes. | Gap |

## 2. Motion

| ID | Criterion | How we check | Status |
|---|---|---|---|
| M1 | Pushed screens slide in from the right; going back slides out. Tab switches cross-fade. | View transition runs on navigation; screenshot mid-transition. | Gap |
| M2 | Pickers and confirmations open as bottom sheets with a grabber and slide up. | Sheet component used by focus picker, calendar and confirmations. | Gap |
| M3 | Pressed controls respond within one frame (scale or dim). | CSS `:active` states on buttons, rows, chips and tabs. | Partial |
| M4 | All motion stops under Reduce Motion. Translucency drops under Reduce Transparency. | Media queries present and verified in a test. | Partial |
| M5 | The large title collapses into the bar title while scrolling. | Screenshot before and after scroll. | Done |

## 3. Interaction

| ID | Criterion | How we check | Status |
|---|---|---|---|
| I1 | No browser dialogs. Destructive actions confirm in an action sheet with a red button. | No `window.confirm` or `alert` in `src/`. | Gap |
| I2 | Sheets close by drag-down, by tapping the dimmed backdrop, and by Escape. Focus is trapped inside and returns to the trigger. | e2e story per sheet. | Gap |
| I3 | Short confirmations appear as a HUD toast ("Check-in saved", "Calendar file ready"). | e2e asserts the toast and its live region. | Gap |
| I4 | Re-tapping the active tab scrolls to the top. Each tab keeps its scroll position. | e2e story. | Gap |
| I5 | In the installed app, swiping from the left edge goes back on pushed screens. | Unit test of the gesture logic; manual check on device. | Gap |
| I6 | Inputs never trigger iOS zoom (16 px minimum). Native pickers for date and time. | Computed font size of inputs. | Done |
| I7 | App shortcut "Check in" from the home-screen icon (manifest shortcuts). | Manifest contains the shortcut. | Gap |

## 4. Accessibility

| ID | Criterion | How we check | Status |
|---|---|---|---|
| A1 | No axe violations (serious or critical) on any route, in light and dark. | `e2e/quality.spec.js`. | Gap |
| A2 | Text scales with the browser text size up to 200 % without clipping. | Screenshot at 200 % root font size. | Gap |
| A3 | Every control is 44 × 44 pt or larger. | Automated size check per route. | Partial |
| A4 | VoiceOver order matches visual order; sheets announce as dialogs. | `role="dialog"`, `aria-modal`, labelled titles. | Gap |

## Verification

- `e2e/quality.spec.js` runs axe, target-size and font checks on every route in light and dark.
- A screenshot pass at 390 × 844 in light and dark covers every screen and state.
- The goal is met when every row reads Done, except I5 which needs a device check.

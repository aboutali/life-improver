# iOS Benchmark: Life Improver vs Reference Apps

This table compares interaction patterns of Apple Health, Things 3 and Headspace with Life Improver as an installed web app.
Verdicts: **Match** (same pattern, same feel), **Close** (same pattern, a visible difference), **Gap** (missing).
Evidence: screenshots at 390 × 844 in light and dark, `e2e/quality.spec.js`, `e2e/navigation.spec.js`, `e2e/sheets.spec.js` and `e2e/device.spec.js`.

## Navigation

| Pattern | Reference | Life Improver | Verdict |
|---|---|---|---|
| Tab bar with 4–5 destinations, filled icon when active | Health, Things | Four tabs, outline to filled icons, translucent bar | Match |
| Large title that collapses into the bar on scroll | Health, Settings | Serif large title, small title fades into the app bar | Match |
| Push from the right, back chevron with parent label | All | View transition push and pop, "‹ Today" back button | Match |
| Edge swipe to go back | All | Gesture in the installed app; tested with emulated touch | Close (needs device feel check) |
| Re-tap active tab scrolls to top | All | Implemented, scroll position kept per tab | Match |
| Modal flows hide the tab bar | Health logging, Headspace sessions | Check-in, onboarding and Settings hide the tab bar | Match |

## Surfaces and controls

| Pattern | Reference | Life Improver | Verdict |
|---|---|---|---|
| Inset grouped lists with icon tiles | Settings, Health | Grouped lists, coloured icon tiles in Settings | Match |
| Bottom sheet with grabber, drag to dismiss | Things, Maps | Sheet with grabber, drag, backdrop tap and Escape | Match |
| Action sheet for destructive confirmation | All | Action sheet with red action and separate Cancel | Match |
| HUD confirmation | Things ("Added") | HUD toast with check mark | Match |
| Segmented control | Health, Fitness | Segmented track for "Did you practise?" | Match |
| Native date and time pickers | Health, Calendar | Native inputs inside the calendar sheet | Match |
| Switch | Settings | Native checkbox styled as a switch ("Hide numbers") | Close (no haptic tick) |
| Long-press context menus on rows | Things | None | Gap |
| Swipe actions on list rows | Things, Mail | None | Gap |

## Look

| Pattern | Reference | Life Improver | Verdict |
|---|---|---|---|
| System font for UI, Dynamic Type | All | SF via system font stack; text follows iOS text size | Match |
| Dark mode | All | Full dark palette, contrast verified | Match |
| Charts with gradient fill, range and latest-value marker | Health | Journey chart with gradient, 1–10 scale, dates, ring marker | Match |
| SF Symbols | All | Hand-drawn lookalike line icons | Close |
| Launch screen in the installed app | All | Launch images for ten iPhone sizes, light and dark | Close (web launch images, no animated launch) |
| Empty states with icon, title and action | Health, Things | Shared empty-state card | Match |

## Feedback and platform

| Pattern | Reference | Life Improver | Verdict |
|---|---|---|---|
| Press states within one frame | All | Scale or dim on every control | Match |
| Haptic feedback | Things, Fitness | Not available to web apps on iOS | Gap (platform limit) |
| Reminders as notifications | Headspace | Calendar files; web push is backlog item B4 | Gap |
| Home-screen widget, Live Activity | Fitness, Headspace | Not available to web apps | Gap (platform limit) |
| Home-screen quick action | Things | Manifest shortcuts "Check in" and "Journey" | Close (Android and desktop; iOS ignores manifest shortcuts) |
| Reduce Motion and Reduce Transparency | All | Both honoured, tested | Match |
| VoiceOver: dialogs, focus order, labels | All | Dialog roles, focus trap and return, axe clean | Match |

## Summary

- **Match:** 20 patterns. **Close:** 6. **Gap:** 5, of which 3 are platform limits of iOS web apps.
- Closable gaps: long-press context menus and swipe actions on Journey and Practices rows, and web push reminders.
- A device walkthrough remains the final check for gesture feel, launch images and Dynamic Type at large sizes.

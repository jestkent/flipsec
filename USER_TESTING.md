# Observe whether FlipSec helps

Status: protocol prepared; **no participant sessions or learning results recorded**.
This is a usability exercise, not proof of scam prevention or a scientific study.

## Three short sessions

Recruit three willing adults independently. Include someone who does not work
in technology and, if possible, someone who prefers a supported non-English
language. Ask permission to take anonymous notes. No names, email addresses,
private messages, recordings, passwords or real scam details belong in this repo.
Do not coach while they work. Allow about ten minutes per person.

Read aloud: “We are testing the app, not you. You can stop at any time. Please
say what you are thinking. Use the fictional examples, not private information.”

1. Before opening FlipSec, ask: “A familiar voice urgently asks you to transfer
   money and keep it secret. What would you do next?” Record their own words.
2. Open Home. Ask them to explain what the app does and find a real story.
   Record whether they can flip it without help and locate its original source.
3. Let them complete one practice exercise. If using another language, note
   any English-only text that blocks them. Do not explain the answer first.
4. Ask this different transfer question: “A polished message says your parcel
   needs a small payment today and supplies a link. What would you do next?”
   Look for independent verification, rather than judging grammar or following
   the supplied link. Do not count a memorized button click as understanding.
5. Ask them to find how email signup works and explain when delivery starts.
   Do not submit an address unless they explicitly want to test mail delivery.
6. Ask: “When would you use this again? What confused you? What would you remove?”

Use this descriptive rubric for the two safety answers: 0 = complies with the
request; 1 = hesitates or says “check” without a concrete method; 2 = describes
verification through a previously trusted, independent channel. Different
scenarios and a tiny sample mean any change is exploratory, not causal evidence.

| Session | Language/device | Before: exact response + rubric | Flip/source found without help? | After: exact response + rubric | Friction / intended next use |
|---|---|---|---|---|---|
| P1 | Not observed | — | — | — | — |
| P2 | Not observed | — | — | — | — |
| P3 | Not observed | — | — | — | — |

After sessions, report the denominator and limitations: “In three informal
sessions, X people found the lesson without help; Y described an independent
verification step afterward.” Only fill X/Y from observations. Include one
problem and what changed; do not invent praise or claim fraud reduction.

## Fresh-mailbox onboarding check

Use an explicitly authorized mailbox that has never received FlipSec mail.
The owner must perform confirmation; do not simulate their consent server-side.
Keep addresses and signed confirmation links out of public notes and screenshots.

| Step | Evidence to record | Status |
|---|---|---|
| Request signup from the public UI | Time, selected feed, visible success copy | Pending |
| Receive confirmation | Time and Inbox/Spam/Missing (provider acceptance is insufficient) | Pending |
| Open link without pressing confirm | Delivery still pending; feed choices visible | Pending |
| Choose feeds and confirm | Confirmation screen; approved feeds | Pending |
| Receive a newly sent drill | Arrival time and folder; avoid old drills and Gmail aliases | Pending |
| Reply in own words | Human-sent reply, no copied secret/personal information | Pending |
| Receive feedback and ask a follow-up | Both visible in the same thread | Pending |
| Unsubscribe | GET shows consent screen; POST stops daily delivery | Pending |

The automated test covers signup → generated confirmation URL → GET → POST →
delivery eligibility using mocked mail. It does **not** prove inbox delivery.
Any test-drill send to a real recipient needs explicit authorization. Do not
silently reset an existing subscriber or erase their previous answers to demo it.

# Notes, Generate KiwiSaver join form
If I were handing this over properly, I’d also add some component tests, UI diff (I currently use Storybook (paid) with Argos in the pipeline) and API specific tests if relevant. In a real suite, we would also have these tests running concurrently so that we could bring down the runtime of the suite to around 1 min max. I only had limited time though :) I’ll also mention that potentially some of these tests are not required. I wanted to show as many variations of suite that I could. In a real suite, it would be risk based automation at the appropriate layer. EG it may be faster to find validation errors on an API layer rather than UI. This requires better understanding of the product requirements and code rather than my best guesses and time limit.

---
## 1. What the suite covers
### Required-field validation (`01-required-field-validation.spec.ts`)

Clicking Continue on an empty form raises exactly seven errors. The full documented set:

| # | Field | `name` | Error message |
|---|-------|--------|---------------|
| 1 | Date of birth | `birthdate` | `Date of birth is a required field` |
| 2 | First name | `firstName` | `First Name is a required field` |
| 3 | Last name | `lastName` | `Last name is a required field` |
| 4 | Email address | `email` | `Email is a required field` |
| 5 | Mobile number | `mobileNumber` | `Please enter your mobile number` |
| 6 | PDS consent | `agreeStatus[0]` | `Please confirm that you have read the above` |
| 7 | Privacy/Declaration consent | `agreeStatus[1]` | `Please confirm that you have read the above` |

Covered three ways:
1. **Collectively**, the first test clicks Continue on an empty form and asserts every one of the seven messages is displayed, that there are *exactly* seven (nothing missing, nothing spurious), and that the five text inputs are also flagged with the red-border error style.
2. **Individually**, one generated test per field fills everything else validly and asserts the missing field's message is the only error on screen. This is what proves a message belongs to its field rather than merely appearing somewhere.
3. **Recovery**, errors clear once the fields are corrected, without a second submit.

**Not required** (asserted as such): Title, Middle name(s), Preferred name, SMS consent.

One extra rule, found by accident while testing by hand: middle name is optional, but if supplied it must look like a name: `12` gives `Please provide a valid middle name`.

### Mandatory checkboxes (`02-consent-checkboxes.spec.ts`)
The two consent tick-boxes are the compliance gate, so they get dedicated coverage: neither is pre-ticked on load, each can be ticked and unticked, each blocks submission on its own (with the error scoped to its own block via the `has-error` attribute, and the satisfied one explicitly *not* flagged), both raise errors together, ticking them clears the errors, and SMS consent stays optional.

### Consent documents (`03-consent-documents.spec.ts`)
The applicant is asked to confirm they have read three legal documents, so each link must reach the right one, a tick against a stale or broken document is a compliance problem, not just a UX one.

| Document | Behaviour | Asserted |
|---|---|---|
| Product Disclosure Statement | JS-driven PDF download (no `href`) | Filename matches `Generate KS PDS`, contains version `1-12-2025`, `.pdf`; served from `*.graphassets.com`; file starts with `%PDF` and is >100 KB; attached to the HTML report |
| Privacy Statement | Opens `_blank` | `href` = `/privacystatementonboarding`, opens, heading renders |
| Declaration | Opens `_blank` | `href` = `/declarations`, redirects to `/kiwisaver/declarations`, heading renders |

The PDS version is pinned to a constant (`EXPECTED_PDS_VERSION`) deliberately: if Generate publishes a new PDS, this test fails and someone consciously updates it, rather than applicants silently consenting to a superseded document. Update the constant when a new PDS ships. Because this document is likely a compliance thing, we would want to assert we're serving the correct version.

### Email validation (`04-email-validation.spec.ts`)
Email validates in two stages, so it gets its own file:

1. Client-side format check: `not-an-email` → `Email must use format lucy@mymail.com`. The test also proves the malformed address is never sent to the third-party API.
2. Live mailbox verification: the form calls `api.addressfinder.io/api/email/v1/verification` on Continue and blocks on an undeliverable mailbox (`The email account does not exist`).

### Happy path (`05-happy-path.spec.ts`)
A complete, valid step 1 advances to step 2 ("Enter your residential address"), with no errors before or after, and entered values surviving the submit. The suite stops at step 2: the brief scopes this to step 1, and this is the production form, so no application is ever completed.

---
## Defects
Note that you can find all these issues logged under Issues in [Github](https://github.com/samanthakirby/GenerateTest/issues)

# 2. Defects, `06-known-defects.spec.ts` (expected to fail automation tests)
These tests assert the behaviour I believe the rules should be as well as the hint that was given around accessibility issues in the brief.

NOTE: run them with `npm run test:defects`.

Each failure carries, viewable in that report: the assertion message and the assumed rule as an annotation, a screenshot at the point of failure, a video of the test, and a trace with DOM snapshots you can step through. Artifacts are not committed to the repo, so they appear once you run the suite.

---

## 3. Other accessibility and UX observations
They are real findings I confirmed by hand but deliberately did not turn into failing tests: they are either invisible to users or better raised as a conversation than as a red build. (They are raised as issues though)

- **The consent-block PDS "link" is not a link.** The anchor has no `href`, so it is not exposed as a link to assistive technology and cannot take focus (`element.focus()` does not move focus to it) — yet the applicant must tick "I have downloaded and read" it. WCAG 2.1 2.1.1 Keyboard. This is also the direct cause of defect 3 above, so fixing that fixes this. Worth noting the four *other* PDS links elsewhere on the page do have hrefs, which suggests an oversight rather than a pattern.
- **Undeliverable email is reported but not enforced.** The verification API returns `UNDELIVERABLE`, the error "The email account does not exist &lt;domain&gt;" is displayed, and Continue still advances. I left this out of the defect tests because I am not sure which behaviour is intended: blocking is a data-quality win but a conversion risk, and the current behaviour may well be deliberate. It is question 3 in my list for the product owner. The *reporting* half is covered by a passing test in `04-email-validation.spec.ts`.
- **Consent error state goes stale.** After a consent error, ticking the box hides the message but leaves `has-error="true"` on the wrapper. Invisible to users today, so not a defect worth failing a build over — but anything that later keys off that attribute (styling, analytics, a future `aria-invalid` binding) would treat a satisfied field as invalid.

- **Inconsistent message copy.** `First Name is a required field` (title case) vs `Last name is a required field` (sentence case) vs `Please enter your mobile number` (different phrasing entirely) vs `Date of birth is a required field`. Three styles for one interaction.
- **`data-testid="message-box"` is reused for errors *and* neutral hints.** "Please ensure the first name matches your ID" is a helpful hint; "First Name is a required field" is an error. Only the `text-system-warning` CSS class distinguishes them, which is why the page object filters on styling to find real errors, brittle, and a strong argument for a dedicated `data-testid` per message type.
- **No focus management on validation failure.** Focus stays on the Continue button; the applicant is not moved to the first invalid field, and on a long form the first error can be off-screen.
- **No error summary at the top of the form.** With seven simultaneous errors the applicant has to hunt for them.
- **The real checkbox inputs are `opacity-0` and stretched across their own label**, with the visible box drawn by an absolutely-positioned sibling. A positional click can toggle twice (once on the input, once via the label) and the drawn box is not a stable target, so the page object dispatches a click on the input and asserts the resulting state. Ticking them by hand works fine — this is a harness accommodation, not a defect — but it is worth confirming full mouse and keyboard operability.
- **Error styling uses `system-warning` tokens (amber semantics) for blocking errors**, while a separate `text-system-error` red token exists and is used only for `*` markers. Mixed severity language.
- **Country code (`+64`) has no label of its own.** It sits inside the labelled "Mobile number (required)" group, so this is minor.
- **The email check is a live third-party call with no visible loading state.** The lookup runs when the applicant completes the email field, with no spinner and no indication that their address is being sent to a third party for verification.
- **`example.com` is rejected client-side** as an unrecognised domain, before the mailbox lookup. Sensible, but it means the conventional documentation/test domain can't be used in test data (see below).

---
## 4. Assumptions, and things I deliberately did not do
- **Test data is obviously fake** (`Playwright Automated Testuser`) so anything that reaches a CRM is identifiable as automation.
- **The mailbox-verification API is stubbed by default.** Otherwise the happy path depends on a real, currently-deliverable mailbox and a third-party service being up, the suite would fail for reasons that have nothing to do with the form, and every run would bill a paid third-party API. The stub lives in the fixture and returns a realistic payload captured from the live API. To run the integration for real: `REAL_EMAIL_VERIFICATION=1 TEST_EMAIL=you@yourdomain.com npm run test:real-email`.
- **Test data uses a `gmail.com` address** rather than `example.com`, because the form's client-side domain check rejects the latter. The mailbox lookup is stubbed, so no real mailbox is contacted.
- **Not covered, and I'd want to agree priority first:** the Title dropdown, Adviser's-use-only block, cross-browser beyond the configured projects, the address/KiwiSaver steps, back-navigation and state retention, maximum field lengths, unicode and double-barrelled names (relevant for a "matches your ID" field), and paste/autofill behaviour.

---
## 5. Running against production: flakiness and constraints
**CloudFront rate-limits this site.** Running the suite with 3–4 parallel workers reliably triggered a `403, Request blocked` interstitial partway through, which surfaces as every subsequent test failing to find the form. Two consequences:

1. `workers: 1` in `playwright.config.ts`. The suite is slower than it needs to be, but that is the target's constraint, not something to optimise away. If this was in a non-prod environment, we probably wouldn't have this constraint and would have 3 concurrent runners.
2. A 2-second pause between tests (`REQUEST_SPACING_MS`, set in the fixture) keeps a full run under the threshold. Set `REQUEST_SPACING_MS=0` when running a single test.
3. The page object detects the 403 and fails with an explicit message naming the cause, so it is never mistaken for a product bug. It races the form heading against the interstitial heading rather than checking eagerly, because immediately after `domcontentloaded` neither has painted.

If it happens anyway, wait a few minutes and re-run. This is the single strongest argument in this exercise for a test environment: I cannot run my own suite on demand.
Other resilience measures, all learnt from real flakes during development:

- **`networkidle` is unusable here**: the page fires analytics and LivePerson chat beacons continuously and never settles. Readiness is instead: the Nuxt payload response, then the step-1 heading, then the first-name field being editable, then the date picker's mask attribute (it hydrates last).
- **The date of birth field is a masked Vue date picker.** `fill()` or typing then pressing Escape leaves the visible text populated but the underlying model **empty**: a silent, confusing failure. It must be typed character-by-character and committed with Enter. This is wrapped in `setDateOfBirth()` so no test has to know.
- **Waits are on network responses and web-first assertions, never fixed sleeps.** The email step waits on the actual mailbox-verification response; the PDS waits on a `download` event; submission waits for the address step *or* an error to appear, whichever comes first.
- **The email verification fires when the field is completed, not on Continue.** Waiting for that response at submit time races a request that has already finished, which is why `fillEmailAndAwaitVerification()` owns the wait and stashes the response on `lastEmailVerification`. A blank or malformed address never triggers the call, so the wait is skipped rather than burning a timeout.
- `retries: 1` locally and `2` on CI, with `trace`/`screenshot`/`video` retained on failure so any retry is diagnosable rather than dismissed.

---
## 6. Process Review
### What's missing from this brief before a team should start automation work?

The brief tells me what to automate but not what correct looks like. That's where most of my time went. I'd want:

- **The acceptance criteria for the field rules.** A 2 digit mobile number passes validation and the applicant moves to step 2. I think that's a bug, but without the rules I'm guessing at intent.
- **A test environment, or explicit permission to hit production.** I'm putting real looking data into a live KiwiSaver signup form and calling a paid third party email verification API on every run. I stubbed the API and stopped at step 2 to be safe, but that was my call rather than something the brief settled. Nobody told me CloudFront would rate limit the suite either, which cost me a debugging cycle to work out.
- **Test accounts and safe data.** Which email addresses and identities are safe to use repeatedly? Does anything that reaches the CRM need cleaning up afterwards?
- **Where this runs and what happens when it's red.** I've added a CI pipeline, but I had to guess at the answers: which browsers actually matter, who picks up a failure, and whether a red build should block a release.
- **Accessibility expectations.** Is WCAG 2.1 AA a requirement for a public financial services signup? If it is, the accessibility issues I've logged are bugs. If it isn't, they're suggestions. Same evidence, very different priority.

### What would you ask the product owner before writing a single test?
Essentially, I would want to know what are our integration points because that defines our contract shape and what we need to test. Some specifics here:

1. **What are the actual rules for the fields and how are they used further down** For example, knowing that a dash in the phone number is going to break the CRM product would be good to know before testing it. (That's just an example)
3. **Is the live email verification a hard gate?** At the moment an undeliverable address gets an error message but Continue still works. If the third party service is down, should a valid applicant be blocked from joining? That's a conversion question as much as a data quality one.
4. **Which of these fields are regulatory requirements versus product preferences?** That tells me what's a blocking bug and what's a nice to have, and it should drive the order I automate in.
5. **What's the highest cost failure here?** An applicant who can't sign up, or one who signs up with bad data that either they can fix themselves or we can for them?
6. **Is the PDS version tied to a compliance date?** I've pinned the 1 Dec 2025 document, so I want to know who tells us when it changes. (Or if that's even important)

### How would you structure this suite so a new joiner understands it in 5 minutes?
That was the goal of the layout, so concretely:

```
tests/
├── data/applicants.ts              # test data + builders, one place to change an input
├── fixtures/join-form.fixture.ts   # opens the page, stubs the third-party API
├── pages/join-kiwisaver.page.ts    # every selector and interaction quirk lives here
├── utils/                          # PDF text extraction, origin asset cache
└── specs/
    ├── 01-required-field-validation.spec.ts
    ├── 02-consent-checkboxes.spec.ts
    ├── 03-consent-documents.spec.ts
    ├── 04-email-validation.spec.ts
    ├── 05-happy-path.spec.ts
    ├── 06-known-defects.spec.ts    # expected to fail, these are the bugs
    └── 07-date-of-birth-rules.spec.ts
```
Missing is a Network folder where I keep a collection of the urls that the app interacts with. That way, instead of having a timeout or manual wait, we can wait for the network call to return a 200 before continuing. If it takes longer than the default suite timeout, then the test will fail otherwise the test can continue as soon as that criteria has been met.

The principles behind it:
- **No hard waits.** We don't have waitFor 5 seconds etc, we wait on the page/network call etc to tell us it's ready. This in conjunction with the POMs are framework lifesavers in terms of reliability and maintainability.
- **POMS holds every selector and every DOM quirk for their page.** A new joiner never needs to know that the date picker needs Enter, or that the checkbox is `opacity-0` under its own label, those are solved once, in a named method, with a comment explaining why. If the form changes, there's one file to fix.
- **Specs read as behaviour, not mechanics.** `unticked PDS consent alone blocks submission` tells you the rule without you reading the body. Numbered files give an obvious reading order: start at 01, finish at the happy path.
- **Comments explain why, never what.** `await page.click()` doesn't need a comment; "Escape leaves the visible text populated but the model empty" saves the next person time. (I ran out of time to comment but I usually add quite a few)

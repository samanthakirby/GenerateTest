# Generate Senior QA Test: Samantha Louw
## Prerequisites
- Node.js 18+
- npm 9+ (ships with Node 18)
- Chromium/WebKit/Firefox browsers installed via Playwright (`npx playwright install`).


## Getting Started
```bash
npm install
npx playwright install
npm run test # runs all the tests except the known defects
npm run test:defects # this will show you the known defects and their reporting failures (video, screenshots etc)
```

## CI-pipeline
I added these to the CI pipeline eg [this run](https://github.com/samanthakirby/GenerateTest/actions/runs/33493327678). I only have the playwright.yml running on the pipeline so that PRs aren't rejected because of known defects in this repo

## Core Tasks
1. **Validation coverage** – Documented as requested in the specs and NOTES.MD
2. **Happy path smoke** – Implemented happy-path as well as various other tests. I have included some "known defects" to show you them failing and the reports that are generated that include screenshots, videos etc. While in a normal workflow these would be considered overboard, I just wanted to give as many example of what we could theoretically test. In the real world, it would be highest impact for the lowest cost. EG validation may be faster to test on an API test rather than a UI one. This would require better product understanding and risk analysis.
3. **Accessibility and UX observations** – Noted quite a few issues. They can be found on the repo's [Issues tab](https://github.com/samanthakirby/GenerateTest/issues). I raised them as actual issues so you can see how I raise issues.
4. **Reporting** – Because of time constraints, I went with the standard Playwright reports output. They are retained on failure only.  There would need to be a retention policy if you wanted them all to be recorded as passing as well.

## Deliverables
Please see the NOTES.MD. I have moved the questions and their answers.

## AI Declaration
What did I use AI for?
1. I asked for help with the asset-cache.ts: I couldn't figure out how to get around the Cloudflare limit in prod without giving you a flaky suite. I prompted Claude with my problem statement and asked it to research what we could do to assist in this suite. I presume in a test environment we wouldn't hit the limit so I *think it's only a problem on the prod site.
2. I also asked it for pdf.ts: while I know how to handle this, I didn't have time to write custom code for this. I didn't just want to assert that the document was downloaded, I wanted to make sure it was the correct one by being able to test it's 1 Dec 2025 date.

## Time spent: 65 minutes on the main project (5 over what was requested)
Setting up the framework: 15 minutes
Creating test data: 5 minutes
Create POM: 15 minutes
Creating specs: 30 minutes

## Wasn't requested but IMO added value and counted outside of the above
I spent 10 minutes on the CI pipeline stuff
I spend 15 minutes logging bugs under [Issues](https://github.com/samanthakirby/GenerateTest/issues)
I also spend 10 minutes manually testing the page. I don't believe you can automate something you haven't manually tested.

## Where did AI come in?
I wasn't too sure how to get around the CloudFlare limit and knew I didn't have time to research it myself so I offloaded that solution to Claude. The file it created was asset-cache.ts. 
The other one, which I do know how to craft but didn't have time, was pdf.ts. This is because I didn't just want to assert that the pdf downloaded, but also that it contained the correct date. This felt like a quick win for something that would be important to make sure customers are getting the correct pdf i.e. 1 Dec 2025.

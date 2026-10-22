# Validation record

Validated in the cloud workspace on 22 October 2026 with Node.js 24.19.0.

- Frozen installation: `npm ci` succeeded using `package-lock.json`.
- Production build: `npm run build` passed TypeScript and Vite compilation.
- Backend: `npm test` passed all 10 integration tests; no skipped tests. These exercise the full journey, authorization and privacy, eligibility, capacity and waitlist promotion, stable integer-sen estimates, exclusive simulated schedule conflicts, proposal changes and sponsorship, reward idempotency/reversal, circles/interest, and database/session persistence across restart.
- Browser: `npm run test:e2e` passed both tests after the final modal and contrast updates. Three independent cookie sessions completed proposal creation, review, separate simulated venue confirmation, resident registration, organizer verification/completion, and point-ledger checks. Joining gave zero points; verified first badminton attendance gave 30, and event completion gave the organizer 30. Reloads retained registrations and points. No browser page errors were recorded.
- Mobile: the browser suite passed navigation, township filtering, Lyra source metadata and absence of horizontal overflow at 390 × 844.
- Development startup: `npm run dev` started Vite and the API. Requests through the Vite proxy validated the frontend, health, a real demo cookie session, six townships and nine facilities, and logout.
- Official facility source pages were fetched and checked. See SOURCES.md for what this verification establishes and what remains unknown.

The Node single-server workflow was validated. The optional Docker image was not validated: BuildKit build steps stalled before reporting package installation output and were stopped. A standalone Node container could reach the npm registry with the environment proxy and trusted CA, so this does not establish a package-registry access denial. Review and test the container recipe on its target host before using it. Ordinary Node hosting with the supplied Render configuration avoids this optional container build path.

No public hosting deployment, managed production authentication, real venue reservation, real payment, sponsorship commitment or reward redemption was tested or claimed. No new-task snapshot restoration has been independently tested. Review/save the cloud configuration draft and publish the prepared environment to make the saved snapshot available to later tasks.

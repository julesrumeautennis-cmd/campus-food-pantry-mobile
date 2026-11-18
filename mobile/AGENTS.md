# Expo and TypeScript checks

From the repository root, with Node 22.13+ and npm installed:

```bash
cd mobile
npm ci
npm run typecheck
npm run check:expo
node --experimental-strip-types --test tests/*.test.mjs
npx expo export --platform all
```

Use [the contract and examples](../docs/CONTRACTS.md) to develop against the Java API before an authenticated test service is available. Keep `src/types.ts`, HTTP call sites and the consumer check consistent. Consult [the design handoff](../docs/DESIGN.md) before building screens.

For an interactive test use the root [README](../README.md#run-expo) to configure your local environment and run `npm start` from this directory. Record the device, app revision, account role and observed behavior for any claim about an iPhone. Label an Expo export as a bundle.

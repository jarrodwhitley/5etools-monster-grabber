# Chrome Web Store Checklist

## Required Before Submission

- [ ] Verify extension only requests minimal permissions (`tabs` currently required for popup tab URL check).
- [ ] Ensure all claims in listing match actual behavior (no misleading functionality).
- [ ] Provide a clear single-purpose description.
- [ ] Include a support contact URL/email in listing.
- [ ] Create and publish a privacy policy if user data is collected/transmitted.
- [ ] Confirm no remote code execution or dynamically loaded scripts.
- [ ] Confirm all icon sizes are valid and crisp (16, 32, 48, 128).
- [ ] Manual test on current stable Chrome.

## Recommended Hardening

- [ ] Add robust error handling when 5etools DOM structure changes.
- [ ] Add regression test fixtures for transformed monsters.
- [ ] Consider adding an options page for export mode toggles.
- [ ] Add semantic versioning and changelog entries per release.

## Packaging

1. Reload unpacked extension in Chrome and test core flow.
2. Run `npm run package` to generate a release artifact in `dist/`.
3. Upload package in Chrome Web Store Developer Dashboard.
4. Fill listing metadata, screenshots, and policy fields.

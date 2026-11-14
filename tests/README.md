# Chord Controls

`chord-controls.mjs` exercises the production build in Chromium with real
touch events and Web Audio nodes: the three picker rows, tap versus hold,
release/cancellation, small screens, and desktop keyboard controls.

Run `npm run build` and `npm run preview` first. Then, in an environment
where Playwright and its Chromium browser are installed:

```sh
node tests/chord-controls.mjs
```

Set `APP_URL` to test another preview address. If Playwright is installed
outside this project, set `PLAYWRIGHT_MODULE` to its `index.mjs` file.
Screenshots go into the ignored `artifacts/` directory.
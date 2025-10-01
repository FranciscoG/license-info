# license-info

A zero dependency cli tool to generate a report of the license info of all direct, and indirect, npm packages in your project. It basically takes the output of `npm ls --all --json --long` and converts it to an nice HTML page with some filtering enabled.

Please note that in order to keep this package free of dependencies, I am intentionally keeping this simple.

- It prints out a summary to the console and generates an HTML report. 
- It checks both dev and prod dependencies. You can filter them in the HTML report.
- It does a deep recursive check of all dependencies, not just the top-level ones in your package.json. 
- I'm processing CLI arguments manually (not using popular packages like `commander`, etc). So that's why I'm keeping the CLI flags to just a couple simple ones.

If you need a more robust tool, take a look at the [Alternatives](#alternatives) section below.

## How to use

```sh
npx license-info 
# or
npx license-info --open --output=./report.html
```

## CLI

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--open`| Automatically opens HTML report in your default browser | Does not open |
| `--output` | Set the name and location of the generated report | `./license-report.html` |


## Alternatives

At some point deep into making this tool I decided to finally look around npm to see if there were any similar existing projects. And of course there were. I think mine offers something unique in the way I setup the HTML report, but if you need something with more bells and whistles, here are a few I found:

- https://www.npmjs.com/package/license-report
- https://www.npmjs.com/package/license-check
- https://www.npmjs.com/package/license-report-recursive
- https://www.npmjs.com/package/check-licenses 
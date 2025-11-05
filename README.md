# license-info

A absolutely zero dependency cli tool to generate a report of the license info of all direct, and indirect, npm packages in your project. It basically takes the output of `npm ls --all --json --long` and converts it to an nice HTML page with some filtering enabled.

Please note that in order to keep this package free of dependencies, I am intentionally keeping this simple.

- It prints out a summary to the console and generates an HTML report. 
- It checks both devDependencies and dependencies. You can filter them in the HTML report.
- It does a deep recursive check of all dependencies, not just the top-level ones in your package.json. 
- Only 2 CLI flags, see [CLI flags section](#cli-flags) below.

If you need a more robust tool, take a look at the [Alternatives](#alternatives) section below.

## How to use

```sh
npx license-info 
# or
npx license-info --open --output=./report.html
```

## CLI Flags

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--open`| Automatically opens HTML report in your default browser | Does not open |
| `--output` | Set the name and location of the generated report | `./license-report.html` |


## Alternatives

There are similar existing projects. I think mine offers something unique in the way I setup the HTML report, but if you need something with more bells and whistles, here are a few I found.

- https://www.npmjs.com/package/license-report
- https://www.npmjs.com/package/license-check
- https://www.npmjs.com/package/license-report-recursive
- https://www.npmjs.com/package/check-licenses 

## Contributing

Note that the one important thing about developing for this repo is that you must never add a dependency. This also includes any `<script src>` tags in the `report.html` that points to external sources, no matter how convenient that might seem. Also, that doesn't mean you can just inline some framework code into the `report.html` either to get around this rule. I would only consider it if the framework was very small and actually does improve **both** developer experience and user experience. 

Remember, I'm trying to keep this simple and dependency free. See [Alternatives](#alternatives) section for other packages with more features.

- Fork this repo
- Create separate branch(es) to develop in
- Create a Pull Request targeting this repo's `dev` branch
- I will verify and test the changes before I merge it into our main branch
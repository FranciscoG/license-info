# license-info

A zero dependency tool that generates a report of the licenses of all NPM packages in your project. It takes the output of `npm ls --all --json --long` and builds an interactive HTML page with the results. 

## Requirement

Requires npm v7 or higher.

## How to use

```sh
npx license-info 
# or
npx license-info --open --output=./report.html
```

[Click here to see a demo of the report](https://franciscog.github.io/license-info/demo/license-report.html)

## CLI Flags

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--open`| Automatically opens HTML report in your default browser | Does not open if omitted |
| `--output <path-and-file-name>` | Set the name and location of the generated report | `./license-report.html` |

## Development

Requires Node 20+ in development because I'm using the built-in Node test runners that become stable in Node v20.

## Contributing

Note that the one important thing about developing for this repo is that you must never add a dependency. This also includes any `<script src>` tags in the `report.html` that points to external sources, no matter how convenient that might seem. I'm trying to keep this simple and dependency free. See [Alternatives](#alternatives) section for other packages with more features.

- Fork this repo
- Create separate branch(es) to develop in
- Create a Pull Request targeting this repo's `dev` branch
- I will verify and test the changes before I merge it 

## Alternatives

There are similar existing projects. I think mine offers something unique in the way I setup the HTML report, but if you need something with more bells and whistles, here are a few I found.

- <https://www.npmjs.com/package/license-checker>
- <https://www.npmjs.com/package/license-report>
- <https://www.npmjs.com/package/license-report-recursive>
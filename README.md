# fqm-speed-comparison

This script runs a series of benchmarks against instance(s) of [mod-fqm-manager](https://github.com/folio-org/mod-fqm-manager) to compare speeds across versions and time.

## Requirements

- A running instance of mod-fqm-manager

## Usage

Run:

```sh
USER=ABCDEF PASSWORD=123456 TENANT=fs09000000 OKAPI_URL=http://okapi:9130 bun benchmark
```

Once you've run this, `results.json` will have been created.

<!-- To visualize the data, run:

```sh
bun chart results.json
```

This will print lots of data as well as generate a folder `results/` with a bunch of charts and tables. -->

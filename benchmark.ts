import { writeFile } from 'fs';
import kyBase from 'ky-universal';
import { promisify } from 'util';

const USERNAME = process.env.USER ?? 'folio';
const PASSWORD = process.env.PASSWORD ?? 'folio';
const TENANT = process.env.TENANT ?? 'fs09000000';
const OKAPI_URL = process.env.OKAPI_URL ?? 'http://localhost:9130';

async function auth(): Promise<string> {
  return (
    await kyBase.post(`${OKAPI_URL}/authn/login`, {
      headers: {
        'x-okapi-tenant': TENANT,
        'content-type': 'application/json',
      },
      json: {
        username: USERNAME,
        password: PASSWORD,
        tenant: TENANT,
      },
    })
  ).headers.get('x-okapi-token')!;
}

const ky = kyBase.extend({
  prefixUrl: OKAPI_URL,
  headers: {
    'x-okapi-tenant': TENANT,
    'x-okapi-token': await auth(),
  },
});

const measures: Record<string, number[]> = {};
const descriptions: Record<string, string> = {};

async function measure<T, R>(
  name: string,
  run: (
    | {
        setup: () => Promise<T> | T;
        fn: (res: Awaited<T>) => Promise<R> | R;
      }
    | {
        fn: () => Promise<R> | R;
      }
  ) & { describe: (r: R) => Promise<string> | string },
  maxTimeMs: number
) {
  measures[name] = measures[name] ?? [];

  let overallStart = Date.now();

  process.stdout.write(`${name}: starting`);

  let res: Awaited<T> | undefined = undefined;
  if ('setup' in run) {
    res = await run.setup();
  }

  let description: string | undefined = undefined;

  while (measures[name].length < 3 || Date.now() - overallStart < maxTimeMs) {
    const start = Date.now();
    let result: R;
    if ('setup' in run) {
      result = await run.fn(res as Awaited<T>);
    } else {
      result = await run.fn();
    }
    const end = Date.now();

    if (description === undefined) {
      // should always be the same; only calculate it once
      description = await run.describe(result);
    }

    measures[name].push(end - start);
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(
      `${name} (${description}): ${measures[name].length} samples, last ${
        end - start
      }ms`
    );
  }

  descriptions[name] = description ?? '';

  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  console.log(
    `${name}: approx ${(
      measures[name].reduce((a, b) => a + b, 0) / measures[name].length
    ).toFixed(2)}ms (${measures[name].length} samples)`
  );

  await promisify(writeFile)('results.json', JSON.stringify(measures));
  await promisify(writeFile)(
    'results-descriptions.json',
    JSON.stringify(descriptions)
  );
}

await measure(
  'get-entity-types',
  {
    fn: () => ky.get('entity-types'),
    describe: async (response) =>
      `${(await response.json<never[]>()).length} entities`,
  },
  5000
);

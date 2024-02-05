import { Gate, Result, TestDefinition } from './types';

type Xor = Gate<'a' | 'b', 'out'>;

const cmpXor: Result<Xor> = [
  {
    i: {
      a: 0,
      b: 0,
    },
    o: {
      out: 0,
    },
  },
  {
    i: {
      a: 0,
      b: 1,
    },
    o: {
      out: 1,
    },
  },
  {
    i: {
      a: 1,
      b: 0,
    },
    o: {
      out: 1,
    },
  },
  {
    i: {
      a: 1,
      b: 1,
    },
    o: {
      out: 0,
    },
  },
];

const resultToTestOutput = <G extends Gate>(result: Result<G>) => {
  const inputs = Object.keys(result[0].i);
  const outputs = Object.keys(result[0].o);

  const header = '| ' + [...inputs, ...outputs].join(' | ') + ' |';

  const flattenedResultRows = result.map((row) => [
    ...inputs.map((k: G['inputs'][number]) => row.i[k]),
    ...outputs.map((k: G['outputs'][number]) => row.o[k]),
  ]);
  const rows = flattenedResultRows.map((row) => '| ' + row.join(' | ') + ' |');

  return {
    inputs,
    outputs,
    outputString: [header, ...rows].join('\n'),
  };
};

const resultToTestScript = <G extends Gate>(result: Result<G>) => {
  const rows = result.map((row) => {
    const rowTest = Object.entries(row.i).map(([k, v]) => `set ${k} ${v},`);
    rowTest.push('eval,', 'output;');
    return rowTest.join('\n');
  });

  return rows.join('\n\n');
};

export const resultToTest = <G extends Gate>(
  result: Result<G>
): TestDefinition => ({
  output: resultToTestOutput(result),
  script: resultToTestScript(result),
});

const test = resultToTest(cmpXor);
console.log(test.output);
console.log(test.script);

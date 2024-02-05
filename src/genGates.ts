import { resultToTest } from './genTests';
import { Gate, Result, TestDefinition } from './types';

const { randomUUID } = require('crypto');

const elements = new Map<string, Variable | Operation>();

class Variable {
  id: string;

  static create = (identifier: string) => {
    if (elements.has(identifier)) {
      return elements.get(identifier) as Variable;
    }

    for (const storedEntity of elements.values()) {
      if (storedEntity.id === identifier) {
        return storedEntity;
      }
    }

    const result = new Variable(identifier);
    elements.set(identifier, result);
    return result;
  };

  constructor(identifier: string) {
    this.id = identifier;
  }

  toString() {
    return this.id;
  }
}

class Constant {
  id: string;
  value: 0 | 1;

  static create = (value: 0 | 1) => {
    if (elements.has(value.toString())) {
      return elements.get(value.toString()) as Constant;
    }

    const result = new Constant(value);
    elements.set(value.toString(), result);
    return result;
  };

  constructor(value: 0 | 1) {
    this.id = value ? '1' : '0';
    this.value = value;
  }

  toString() {
    return this.id;
  }
}

type Operand = Constant | Variable | Operation;
const getOrderedOperands = (a: Operand, b: Operand) => {
  if (a.id < b.id) {
    return [a, b] as const;
  }

  return [b, a] as const;
};

abstract class Operation {
  static operator: string;

  abstract id: string;
  abstract toString: () => string;

  outputName?: string;
}

class And implements Operation {
  static operator = '*';

  static toString(a: Operand, b: Operand) {
    const [firstOpId, secondOpId] = getOrderedOperands(a, b);
    return firstOpId + And.operator + secondOpId;
  }

  static create = (a: Operand, b: Operand) => {
    const equation = And.toString(a, b);
    if (elements.has(equation)) {
      return elements.get(equation) as And;
    }

    const result = new And(a, b);
    elements.set(equation, result);
    return result;
  };

  id: string;

  a: Operand;
  b: Operand;

  constructor(a: Operand, b: Operand) {
    this.a = a;
    this.b = b;
    this.id = randomUUID();
  }

  toString() {
    return And.toString(this.a, this.b);
  }
}

class Or implements Operation {
  static operator = '+';

  static toString(a: Operand, b: Operand) {
    const [firstOpId, secondOpId] = getOrderedOperands(a, b);
    return firstOpId + Or.operator + secondOpId;
  }

  static create = (a: Operand, b: Operand) => {
    const equation = Or.toString(a, b);
    if (elements.has(equation)) {
      return elements.get(equation) as Or;
    }

    const result = new Or(a, b);
    elements.set(equation, result);
    return result;
  };

  id: string;

  a: Operand;
  b: Operand;

  constructor(a: Operand, b: Operand) {
    this.a = a;
    this.b = b;
    this.id = randomUUID();
  }

  toString() {
    return `(${Or.toString(this.a, this.b)})`;
  }
}

class Not implements Operation {
  static operator = '!';

  static toString = (x: Operand) => {
    return `!(${x.toString()})`;
  };

  static create = (x: Operand) => {
    const equation = Not.toString(x);
    if (elements.has(equation)) {
      return elements.get(equation) as Not;
    }

    const result = new Not(x);
    elements.set(equation, result);
    return result;
  };

  id: string;

  x: Operand;

  constructor(x: Operand) {
    this.x = x;
    this.id = randomUUID();
  }

  toString() {
    return Not.toString(this.x);
  }
}

const operators = [And.operator, Or.operator, Not.operator];
const isOperator = (x: string) => operators.includes(x);

const getOperationByOperator = (op: string) => {
  switch (op) {
    case '*':
      return And;
    case '+':
      return Or;
    case '!':
      return Not;
    default:
      throw new Error('Invalid operator ' + op);
  }
};

const getDeepestGroupPos = (eq: string) => {
  let lastFoundOpening = 0;

  for (let i = 0; i < eq.length; i++) {
    if (eq[i] === '(') {
      lastFoundOpening = i;
    } else if (eq[i] === ')') {
      return {
        from: lastFoundOpening,
        to: i,
      };
    }
  }

  return null;
};

const buildElement = (el: string): Not | Constant | Variable => {
  if (el.charAt(0) === '!') {
    return Not.create(buildElement(el.slice(1)));
  }

  if (el === '0' || el === '1') {
    return Constant.create(el === '1' ? 1 : 0);
  }

  return Variable.create(el);
};

const splitByOrs = (eq: string) => eq.split('+').map((a) => a.trim());
const splitByAnds = (eq: string) => eq.split('*').map((a) => a.trim());

const parseEquationWithoutGroups = (eq: string) => {
  if (eq.indexOf('(') !== -1 || eq.indexOf(')') !== -1) {
    throw new Error('Trying to parse eq with groups: ' + eq);
  }

  if (elements.has(eq)) {
    return elements.get(eq);
  }

  const eqsSeparatedByOrs = splitByOrs(eq).map((eqsSeparatedByOrs) => {
    const elementsSeparatedByAnds = splitByAnds(eqsSeparatedByOrs).map(
      (eqSeparatedByAnd) => {
        return buildElement(eqSeparatedByAnd);
      }
    );
    if (elementsSeparatedByAnds.length === 1) {
      return elementsSeparatedByAnds[0];
    }

    return elementsSeparatedByAnds
      .slice(2)
      .reduce(
        (result, el) => And.create(result, el),
        And.create(elementsSeparatedByAnds[0], elementsSeparatedByAnds[1])
      );
  });

  if (eqsSeparatedByOrs.length === 1) {
    return eqsSeparatedByOrs[0];
  }

  return eqsSeparatedByOrs
    .slice(2)
    .reduce(
      (result, el) => Or.create(result, el),
      Or.create(eqsSeparatedByOrs[0], eqsSeparatedByOrs[1])
    );
};

const parseGroups = (eq: string) => {
  let deepestGroupPos = getDeepestGroupPos(eq);

  while (deepestGroupPos) {
    const groupEq = eq.slice(deepestGroupPos.from + 1, deepestGroupPos.to);
    const groupResult = parseEquationWithoutGroups(groupEq);
    if (!groupResult) {
      throw new Error(
        'Equation without groups parsing returned undefined: ' + groupEq
      );
    }

    eq =
      eq.slice(0, deepestGroupPos.from) +
      groupResult.id +
      eq.slice(deepestGroupPos.to + 1);

    deepestGroupPos = getDeepestGroupPos(eq);
  }

  const result = parseEquationWithoutGroups(eq);
  return result;
};

const parseBooleanEquation = (eq: string, outputName: string) => {
  parseGroups(eq);

  const { gates } = Array.from(elements.values()).reduce(
    (result, el) => {
      if (el instanceof Variable) {
        result.inputs.push(el);
      } else {
        result.gates.push(el);
      }

      return result;
    },
    { inputs: [] as Variable[], gates: [] as Operation[] }
  );

  gates[gates.length - 1].outputName = outputName;
};

const compileGate = (gate: Operation) => {
  const out = gate.outputName || gate.id;

  if (gate instanceof And) {
    return `And(a=${gate.a.id}, b=${gate.b.id}, out=${out});`;
  } else if (gate instanceof Or) {
    return `Or(a=${gate.a.id}, b=${gate.b.id}, out=${out});`;
  } else if (gate instanceof Not) {
    return `Not(in=${gate.x.id}, out=${out});`;
  } else {
    throw new Error('Invalid gate type');
  }
};

const compileGates = (gates: Operation[]) =>
  gates.map((gate) => compileGate(gate)).join('\n');

const defaultAllowedCharacters = ['!', '(', ')', '*', '+', ' '];
const checkForAllowedCharacters = (inputs: readonly string[], eq: string) => {
  const allowedCharacters = new Set([...defaultAllowedCharacters, ...inputs]);

  for (const char of eq) {
    if (!allowedCharacters.has(char)) {
      throw new Error('Invalid character: ' + char);
    }
  }
};

type InnerGate = {
  eq: string;
  outputName: string;
};
const parseEquationsGroup = (
  inputs: readonly string[],
  innerGates: InnerGate[]
) => {
  innerGates.forEach(({ eq }) => checkForAllowedCharacters(inputs, eq));

  innerGates.forEach((eq) => {
    parseBooleanEquation(eq.eq, eq.outputName);
  });

  const { gates } = Array.from(elements.values()).reduce(
    (result, el) => {
      if (el instanceof Variable) {
        result.inputs.push(el);
      } else {
        result.gates.push(el);
      }

      return result;
    },
    { inputs: [] as Variable[], gates: [] as Operation[] }
  );

  gates.forEach((gate, index) => {
    gate.id = `g${index}`;
  });

  return {
    hdl: compileGates(gates),
    gates,
  };
};

// const fullAdder = parseEquationsGroup([
//   {
//     eq: 'A*B*C + !A*!B*C + !A*B*!C + A*!B*!C'.toLocaleLowerCase(),
//     outputName: 'sum',
//   },
//   { eq: 'A*B + A*C + B*C'.toLocaleLowerCase(), outputName: 'carry' },
// ]);

// console.log('\n\n');
// console.log(fullAdder.hdl);

const build = (name: string, hdl: string, test: TestDefinition) => {
  const hdlFileName = `${name}.hdl`;
  const hdlFileContent = `CHIP ${name} {
  IN ${test.output.inputs.join(', ')};
  OUT ${test.output.outputs.join(', ')};

  PARTS:
  ${hdl.replace(/\n/g, '\n  ')}
}`;

  const testCmpFileName = `${name}.cmp`;
  const testCmpFileContent = test.output.outputString;

  const testFileName = `${name}.tst`;

  const testFileContent = `load ${hdlFileName},
output-file ${testCmpFileName},
compare-to ${testCmpFileName},
output-list ${test.output.inputs
    .map((i) => `${i}%B3.1.3`)
    .join(', ')}, ${test.output.outputs.map((o) => `${o}%B3.1.3`).join(', ')};

${test.script}`;

  console.log('--- hdlFileContent ---'); // [XXX] REMOVE BEFORE COMMITING
  console.log(hdlFileContent); // [XXX] REMOVE BEFORE COMMITING

  return {
    hdl: {
      fileName: hdlFileName,
      content: hdlFileContent,
    },
    test: {
      fileName: testFileName,
      content: testFileContent,
    },
    cmp: {
      fileName: testCmpFileName,
      content: testCmpFileContent,
    },
  };
};

const write = (buildResult: ReturnType<typeof build>) => {
  const fs = require('fs');

  fs.writeFileSync(buildResult.hdl.fileName, buildResult.hdl.content);
  fs.writeFileSync(buildResult.test.fileName, buildResult.test.content);
  fs.writeFileSync(buildResult.cmp.fileName, buildResult.cmp.content);
};

const createGate = <I extends readonly string[], IGS extends InnerGate[]>({
  name,
  inputs,
  innerGates,
}: {
  name: string;
  inputs: I;
  innerGates: IGS;
}) => {
  const { hdl } = parseEquationsGroup(inputs, innerGates);

  return {
    hdl,
    tests: (result: Result<Gate<I[number], IGS[number]['outputName']>>) => {
      const tests = resultToTest(result);
      return {
        tests,
        build: () => {
          const builtFiles = build(name, hdl, tests);
          return {
            hdl,
            tests,
            builtFiles,
            write: () => write(builtFiles),
          };
        },
      };
    },
  };
};

const cmpXor = createGate({
  name: 'Xor',
  inputs: ['A', 'B'] as const,
  innerGates: [
    { eq: 'A*!B + !A*B', outputName: 'out' as const },
    { eq: '!A*!B', outputName: 'outB' as const },
  ],
})
  .tests([
    {
      i: {
        A: 0,
        B: 0,
      },
      o: {
        out: 0,
        outB: 0,
      },
    },
    {
      i: {
        A: 0,
        B: 1,
      },
      o: {
        out: 1,
        outB: 1,
      },
    },
    {
      i: {
        A: 1,
        B: 0,
      },
      o: {
        out: 1,
        outB: 1,
      },
    },
    {
      i: {
        A: 1,
        B: 1,
      },
      o: {
        out: 0,
        outB: 0,
      },
    },
  ])
  .build()
  .write();

console.log('--- cmpXor ---'); // [XXX] REMOVE BEFORE COMMITING
console.log(cmpXor); // [XXX] REMOVE BEFORE COMMITING

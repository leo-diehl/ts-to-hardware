export type Gate<I extends string = string, O extends string = string> = {
  inputs: I;
  outputs: O;
};

type ResultRow<G extends Gate<string, string>> = {
  i: Record<G['inputs'], 0 | 1>;
  o: Record<G['outputs'], 0 | 1>;
};

export type Result<G extends Gate<string, string>> = ResultRow<G>[];

export type TestDefinition = {
  output: {
    inputs: string[];
    outputs: string[];
    outputString: string;
  };
  script: string;
};

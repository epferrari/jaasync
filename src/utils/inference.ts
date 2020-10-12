export type Invocable<TParams extends any[] = any[], TReturnType extends any = any> = (...params: TParams) => TReturnType;
export type InferParams<TFn extends Invocable<any, any>> = TFn extends Invocable<infer P, any> ? P : never;
export type Unpromisify<TValue> = TValue extends Promise<infer V> ? V : TValue;
export type ReturnType<TFn extends Invocable<any, any>> = TFn extends Invocable<any, infer R> ? Unpromisify<R> : never;
export function take<T extends object, K extends keyof T>(obj: T, ...keys: Array<K>): Pick<T, K> {
  const result = {} as Pick<T, K>;

  for (const key of Object.keys(obj) as K[]) {
    if (keys.includes(key)) {
      result[key] = obj[key];
    }
  }

  return result;
}

export function toFormattedJSON(o: any) {
  return JSON.stringify(o, null, 2);
}

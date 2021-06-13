import { buildSchema } from 'graphql';

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export const schema = buildSchema(`
type Query {
    hello: String
}
type Subscription {
    countDown: Int
}
`);

export const roots =
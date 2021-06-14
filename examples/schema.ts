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

export const roots = {
  Query: {
    hello: () => 'Hello World!',
  },
  subscription: {
    /* eslint no-await-in-loop: "off" */

    countDown: async function* fiveToOne() {
      for (const number of [5, 4, 